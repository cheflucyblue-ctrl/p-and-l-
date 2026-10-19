
import React, { useState, useMemo } from 'react';
import { Transaction, Department } from '../types';
import { MONTHS, DEPARTMENTS } from '../constants';
import { Factory, Search, Filter, TrendingDown, ArrowUpDown, Users, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
  onUpdateTransactions: (updates: Transaction[]) => void;
}

const SupplierManager: React.FC<Props> = ({ transactions, onUpdateTransactions }) => {
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const supplierData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const filtered = expenses.filter(t => filterMonth === 'ALL' || t.month === filterMonth);
    
    const groups: Record<string, { 
      name: string; 
      total: number; 
      count: number; 
      dept: string; 
      latestDate: string;
      isLabor?: boolean;
    }> = {};

    filtered.forEach(t => {
      // Enhanced Logic to identify Labor/Wages/Salaries and group them
      const isLaborEntry = t.department === 'Labor' || 
                          t.category === 'Wages & Salaries' || 
                          t.category === 'Payroll Taxes' || 
                          t.entity.toLowerCase().includes('wage') || 
                          t.entity.toLowerCase().includes('salary');

      let groupKey = t.entity;
      let displayName = t.entity;

      if (isLaborEntry) {
        // Group all variations of wages/salaries into one "Labor Costs" entity
        groupKey = 'CONSOLIDATED_LABOR_COSTS';
        displayName = 'Labor Costs';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { 
          name: displayName, 
          total: 0, 
          count: 0, 
          dept: isLaborEntry ? 'Labor' : t.department, 
          latestDate: t.date,
          isLabor: isLaborEntry
        };
      }
      
      groups[groupKey].total += t.amount;
      groups[groupKey].count += 1;
      if (t.date > groups[groupKey].latestDate) {
        groups[groupKey].latestDate = t.date;
      }
    });

    return Object.values(groups)
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [transactions, filterMonth, searchTerm]);

  const totalFilteredSpend = supplierData.reduce((acc, s) => acc + s.total, 0);

  const handleDeptChange = (supplierName: string, newDept: Department) => {
    const updates = transactions
      .filter(t => t.entity === supplierName && t.type === 'EXPENSE')
      .map(t => ({ ...t, department: newDept }));
    
    onUpdateTransactions(updates);
    setEditingSupplier(null);
    setEditDept(null);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const period = filterMonth === 'ALL' ? 'August - December 2025' : filterMonth;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('RestoAudit Pro', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Expense Summary & Vendor Ledger | Period: ${period}`, 14, 28);
    
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    const tableHeaders = [['Supplier (Entity)', 'Department', 'Records', 'Last Date', 'Total Spend (ZAR)']];
    const tableData = supplierData.map(s => [
      s.name,
      s.dept,
      s.count,
      s.latestDate,
      `R${s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: tableHeaders,
      body: tableData,
      foot: [['', '', '', 'TOTAL CONSOLIDATED', `R${totalFilteredSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
      headStyles: { fillStyle: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' }, // amber-500
      footStyles: { fillStyle: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`Expense_Summary_${period.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Factory className="text-amber-500" size={24} />
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Expense Summary & Vendor Ledger</h2>
        </div>
        <div className="flex items-center space-x-3">
           <button 
             onClick={exportToPDF}
             className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all text-sm font-black uppercase shadow-sm"
           >
             <FileDown size={16} />
             <span>Export PDF</span>
           </button>
           <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl text-center">
             <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Liability for Period</p>
             <p className="text-lg font-black text-slate-900">R{totalFilteredSpend.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by Supplier Name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="text-slate-400" size={18} />
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="ALL">All Months (Consolidated)</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier (Entity)</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Department</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice/Record Count</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Transaction</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Expenditure (ZAR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {supplierData.map(supplier => (
              <tr key={supplier.name} className={`hover:bg-slate-50/50 transition-colors group ${supplier.isLabor ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors ${
                      supplier.isLabor 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600'
                    }`}>
                      {supplier.isLabor ? <Users size={16} /> : supplier.name.charAt(0)}
                    </div>
                    <span className={`text-sm font-black ${supplier.isLabor ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {supplier.name}
                    </span>
                  </div>
                </td>
                <td 
                  className="px-6 py-4 cursor-pointer"
                  onDoubleClick={() => {
                    if (!supplier.isLabor) {
                      setEditingSupplier(supplier.name);
                      setEditDept(supplier.dept as Department);
                    }
                  }}
                >
                   {editingSupplier === supplier.name ? (
                     <select
                       autoFocus
                       value={editDept || ''}
                       onChange={(e) => handleDeptChange(supplier.name, e.target.value as Department)}
                       onBlur={() => setEditingSupplier(null)}
                       className="text-[9px] font-black uppercase border rounded-lg bg-white border-amber-400 outline-none p-1 w-full"
                     >
                       {DEPARTMENTS.map(d => (
                         <option key={d} value={d}>{d}</option>
                       ))}
                     </select>
                   ) : (
                     <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-tighter ${
                       supplier.isLabor 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:border-amber-300 transition-colors'
                     }`}>
                       {supplier.dept}
                     </span>
                   )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-500">{supplier.count} records</span>
                </td>
                <td className="px-6 py-4">
                   <span className="text-xs font-medium text-slate-400">{supplier.latestDate}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className={`text-sm font-black ${supplier.isLabor ? 'text-indigo-700' : 'text-slate-900'}`}>
                    R{supplier.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-black">
                    {((supplier.total / totalFilteredSpend) * 100).toFixed(1)}% of total
                  </p>
                </td>
              </tr>
            ))}
            {supplierData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 text-xs italic font-black uppercase tracking-widest opacity-30">
                  No Supplier Data Detected in Selected Period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {supplierData.some(s => s.isLabor) && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-slate-500">
          <Users size={16} className="shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-wide">
            Note: All wages and salary payments are consolidated under "Labor Costs" in the expense summary for payroll privacy.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
