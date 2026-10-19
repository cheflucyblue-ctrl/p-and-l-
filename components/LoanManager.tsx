
import React, { useState, useRef, useEffect } from 'react';
import { LoanAccount, Transaction } from '../types';
import { Plus, History, Calculator, Edit2, FileSpreadsheet, FileDown, Download, Check, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  loans: LoanAccount[];
  onUpdate: (loan: LoanAccount) => void;
  onTransactionAdd: (items: Transaction[]) => void;
}

interface EditState {
  loanId: string;
  field: keyof LoanAccount;
}

interface EditHistoryState {
  loanId: string;
  index: number;
  field: string;
}

const LoanManager: React.FC<Props> = ({ loans, onUpdate, onTransactionAdd }) => {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editHistoryState, setEditHistoryState] = useState<EditHistoryState | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if ((editState || editHistoryState) && (inputRef.current || historyInputRef.current)) {
      const target = inputRef.current || historyInputRef.current;
      target?.focus();
    }
  }, [editState, editHistoryState]);

  const handlePayment = (loan: LoanAccount) => {
    if (paymentAmount <= 0) return;

    const updatedLoan: LoanAccount = {
      ...loan,
      balance: loan.balance - paymentAmount,
      history: [
        ...loan.history,
        { 
          date: new Date().toISOString().split('T')[0], 
          amount: paymentAmount, 
          type: 'PAYMENT',
          description: 'Manual repayment'
        }
      ]
    };

    onUpdate(updatedLoan);

    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      department: 'G&A',
      category: 'Other',
      amount: paymentAmount,
      entity: loan.name,
      description: `Manual payment towards loan principal.`,
      paymentMethod: 'EFT',
      month: new Date().toISOString().substring(0, 7)
    };
    onTransactionAdd([tx]);
    setPaymentAmount(0);
  };

  const handleCsvJurnal = (loan: LoanAccount, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(loan.id);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const header = lines[0].toLowerCase().split(',');
      const dateIdx = header.findIndex(h => h.includes('date') || h.includes('time'));
      const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('payment'));
      const typeIdx = header.findIndex(h => h.includes('type') || h.includes('desc') || h.includes('transaction'));

      let balanceAdjustment = 0;
      const newHistory = [...loan.history];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        
        const rawAmount = amountIdx !== -1 ? parts[amountIdx] : parts[1];
        const amount = Math.abs(parseFloat(rawAmount?.replace(/[^\d.-]/g, '')) || 0);
        
        if (amount === 0) continue;

        const rawDate = dateIdx !== -1 ? parts[dateIdx] : parts[0];
        const date = rawDate || new Date().toISOString().split('T')[0];
        
        const rawType = typeIdx !== -1 ? (parts[typeIdx] || '').toLowerCase() : 'loan';
        
        // DETECTION: 'LOAN' increases debt (+), 'PAYMENT' decreases debt (-)
        const isDebtIncrease = rawType.includes('loan') || 
                               rawType.includes('interest') || 
                               rawType.includes('accrual') || 
                               rawType.includes('fee');
        
        const entryType = isDebtIncrease ? 'INTEREST_ACCRUAL' : 'PAYMENT';
        
        newHistory.push({ 
          date, 
          amount, 
          type: entryType as 'PAYMENT' | 'INTEREST_ACCRUAL',
          description: parts[typeIdx] || (isDebtIncrease ? 'Loan Entry' : 'Payment Entry')
        });
        
        if (entryType === 'PAYMENT') {
          balanceAdjustment -= amount; // Decreases loan balance (Payment is negative impact on debt)
        } else {
          balanceAdjustment += amount; // Increases loan balance (Loan/Interest is positive impact on debt)
        }
      }

      const updatedLoan: LoanAccount = {
        ...loan,
        balance: loan.balance + balanceAdjustment,
        history: newHistory.sort((a, b) => a.date.localeCompare(b.date))
      };

      onUpdate(updatedLoan);
      setIsImporting(null);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const startEditing = (loan: LoanAccount, field: keyof LoanAccount) => {
    setEditState({ loanId: loan.id, field });
    setEditValue(loan[field]);
  };

  const saveEdit = () => {
    if (!editState) return;
    const loan = loans.find(l => l.id === editState.loanId);
    if (loan) {
      const updatedLoan = { ...loan, [editState.field]: editValue };
      onUpdate(updatedLoan);
    }
    setEditState(null);
  };

  const startEditingHistory = (loanId: string, index: number, field: string, value: any) => {
    setEditHistoryState({ loanId, index, field });
    setEditValue(value);
  };

  const saveHistoryEdit = () => {
    if (!editHistoryState) return;
    const loan = loans.find(l => l.id === editHistoryState.loanId);
    if (loan) {
      const newHistory = [...loan.history];
      const entry = { ...newHistory[editHistoryState.index], [editHistoryState.field]: editValue };
      newHistory[editHistoryState.index] = entry as any;

      // Recalculate balance based on history
      let newBalance = loan.principal;
      newHistory.forEach(h => {
        if (h.type === 'PAYMENT') newBalance -= h.amount;
        else newBalance += h.amount;
      });

      onUpdate({ ...loan, history: newHistory, balance: newBalance });
    }
    setEditHistoryState(null);
  };

  const exportToCSV = (loan: LoanAccount) => {
    const headers = ['Date', 'Description', 'Type', 'Value (ZAR)'];
    const rows = loan.history.map(h => [
      h.date,
      h.description || 'N/A',
      h.type,
      h.type === 'PAYMENT' ? -h.amount : h.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${loan.name.replace(/\s+/g, '_')}_Journal.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (loan: LoanAccount) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Rawdons Profit and loss', 14, 20);
    doc.setFontSize(12);
    doc.text(`Loan Journal: ${loan.name}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Balance: R${loan.balance.toLocaleString()}`, 14, 34);

    const tableHeaders = [['Date', 'Description', 'Type', 'Value (ZAR)']];
    const tableData = loan.history.slice().reverse().map(h => [
      h.date,
      h.description || 'N/A',
      h.type.replace('_', ' '),
      `${h.type === 'PAYMENT' ? '-' : '+'} R${h.amount.toLocaleString()}`
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: tableHeaders,
      body: tableData,
      theme: 'striped',
      headStyles: { fillStyle: [15, 23, 42], textColor: [255, 255, 255] },
    });

    doc.save(`${loan.name.replace(/\s+/g, '_')}_Journal.pdf`);
  };

  const renderEditableValue = (loan: LoanAccount, field: keyof LoanAccount, displayValue: string | number, className: string) => {
    const isEditing = editState?.loanId === loan.id && editState?.field === field;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type={typeof loan[field] === 'number' ? 'number' : field === 'startDate' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(typeof loan[field] === 'number' ? parseFloat(e.target.value) : e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          className={`bg-white border-2 border-indigo-400 rounded px-1 outline-none text-slate-900 ${className}`}
        />
      );
    }

    return (
      <span 
        onDoubleClick={() => startEditing(loan, field)}
        className={`cursor-pointer hover:text-indigo-600 transition-colors border-b border-dashed border-transparent hover:border-indigo-300 ${className}`}
        title="Double-click to edit"
      >
        {displayValue}
      </span>
    );
  };

  const renderHistoryCell = (loanId: string, index: number, field: string, value: any, type: 'text' | 'number' | 'date' | 'select' = 'text') => {
    const isEditing = editHistoryState?.loanId === loanId && editHistoryState?.index === index && editHistoryState?.field === field;

    if (isEditing) {
      if (type === 'select') {
        return (
          <select
            ref={historyInputRef as any}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveHistoryEdit}
            className="w-full text-xs p-0.5 border border-indigo-400 rounded outline-none"
          >
            <option value="PAYMENT">PAYMENT</option>
            <option value="INTEREST_ACCRUAL">INTEREST ACCRUAL</option>
          </select>
        );
      }
      return (
        <input
          ref={historyInputRef as any}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          onBlur={saveHistoryEdit}
          onKeyDown={(e) => e.key === 'Enter' && saveHistoryEdit()}
          className="w-full text-xs p-0.5 border border-indigo-400 rounded outline-none"
        />
      );
    }

    return (
      <div 
        onDoubleClick={() => startEditingHistory(loanId, index, field, value)}
        className="cursor-pointer hover:bg-indigo-50 px-1 rounded transition-colors"
        title="Double-click to edit"
      >
        {field === 'amount' ? `R${value.toLocaleString()}` : value}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-indigo-50 border-l-4 border-indigo-400 text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center space-x-2 rounded-r-lg">
        <Edit2 size={12} />
        <span>Tip: Double-click any cell in the journal to edit details inline. Balance updates automatically.</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loans.map(loan => (
          <div key={loan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900">
                  {renderEditableValue(loan, 'name', loan.name, '')}
                </h3>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Facility Start: {renderEditableValue(loan, 'startDate', loan.startDate, '')}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center space-x-8 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Balance</p>
                  <p className="text-3xl font-black">
                    R{renderEditableValue(loan, 'balance', loan.balance.toLocaleString(), 'text-white')}
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-700"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                  <p className="text-xl font-bold text-slate-300">
                    R{renderEditableValue(loan, 'principal', loan.principal.toLocaleString(), 'text-slate-300')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center md:text-left">Journal Control</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-center space-x-2 w-full py-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl text-xs font-black uppercase cursor-pointer hover:bg-indigo-100 transition-all shadow-sm">
                      <FileSpreadsheet size={18} />
                      <span>{isImporting === loan.id ? 'Extracting Journal...' : 'Import Full CSV Journal'}</span>
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={(e) => handleCsvJurnal(loan, e)}
                        disabled={!!isImporting}
                      />
                    </label>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Manual Paypoint</p>
                       <div className="flex space-x-2">
                        <input 
                          type="number"
                          placeholder="ZAR Amount"
                          className="flex-1 min-w-0 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          value={paymentAmount || ''}
                          onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                        />
                        <button 
                          onClick={() => handlePayment(loan)}
                          className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-black transition-all font-black text-xs uppercase"
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                    <History size={16} />
                    <span>Detailed Transaction Journal</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => exportToCSV(loan)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center space-x-1"
                      title="Export to CSV"
                    >
                      <Download size={14} />
                      <span className="text-[9px] font-black uppercase">CSV</span>
                    </button>
                    <button 
                      onClick={() => exportToPDF(loan)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center space-x-1"
                      title="Export to PDF"
                    >
                      <FileDown size={14} />
                      <span className="text-[9px] font-black uppercase">PDF</span>
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">{loan.history.length} Records</span>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {loan.history.length > 0 ? (
                          [...loan.history].reverse().map((_, revIdx) => {
                            const actualIdx = loan.history.length - 1 - revIdx;
                            const entry = loan.history[actualIdx];
                            return (
                              <tr key={revIdx} className="hover:bg-white transition-colors group">
                                <td className="px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">
                                  {renderHistoryCell(loan.id, actualIdx, 'date', entry.date, 'date')}
                                </td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-600 min-w-[150px]">
                                  {renderHistoryCell(loan.id, actualIdx, 'description', entry.description || 'Account Movement')}
                                </td>
                                <td className="px-4 py-3">
                                  {editHistoryState?.loanId === loan.id && editHistoryState?.index === actualIdx && editHistoryState?.field === 'type' ? (
                                    renderHistoryCell(loan.id, actualIdx, 'type', entry.type, 'select')
                                  ) : (
                                    <span 
                                      onDoubleClick={() => startEditingHistory(loan.id, actualIdx, 'type', entry.type)}
                                      className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter cursor-pointer ${
                                        entry.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                      }`}
                                    >
                                      {entry.type.replace('_', ' ')}
                                    </span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 text-xs font-black text-right whitespace-nowrap ${
                                  entry.type === 'PAYMENT' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  <div className="flex justify-end items-center space-x-1 font-black">
                                    <span className="text-sm">{entry.type === 'PAYMENT' ? '-' : '+'}</span>
                                    {renderHistoryCell(loan.id, actualIdx, 'amount', entry.amount, 'number')}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">
                              No Journal History Loaded
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Calculator size={32} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900">Total Facility Liability</h4>
            <p className="text-sm text-slate-500">Consolidated audit of all active credit facilities and extracted interest components.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-slate-900">
            R{loans.reduce((acc, l) => acc + l.balance, 0).toLocaleString()}
          </p>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Audited & Verified</span>
        </div>
      </div>
    </div>
  );
};

export default LoanManager;
