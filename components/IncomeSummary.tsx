
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { MONTHS } from '../constants';
import { TrendingUp, Search, Filter, PieChart, FileDown, ArrowUpRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
}

const IncomeSummary: React.FC<Props> = ({ transactions }) => {
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const incomeData = useMemo(() => {
    const incomeOnly = transactions.filter(t => t.type === 'INCOME');
    const filtered = incomeOnly.filter(t => filterMonth === 'ALL' || t.month === filterMonth);
    
    const groups: Record<string, { 
      entity: string; 
      total: number; 
      count: number; 
      latestDate: string;
      topCategory: string;
    }> = {};

    filtered.forEach(t => {
      if (!groups[t.entity]) {
        groups[t.entity] = { 
          entity: t.entity, 
          total: 0, 
          count: 0, 
          latestDate: t.date,
          topCategory: t.category
        };
      }
      
      groups[t.entity].total += t.amount;
      groups[t.entity].count += 1;
      if (t.date > groups[t.entity].latestDate) {
        groups[t.entity].latestDate = t.date;
      }
    });

    return Object.values(groups)
      .filter(s => s.entity.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [transactions, filterMonth, searchTerm]);

  const totalIncomeForPeriod = incomeData.reduce((acc, s) => acc + s.total, 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const period = filterMonth === 'ALL' ? 'June - December 2025' : filterMonth;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text('RestoAudit Pro', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`Revenue & Income Summary | Period: ${period}`, 14, 28);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    const tableHeaders = [['Income Source', 'Primary Category', 'Transactions', 'Last Entry', 'Total (ZAR)']];
    const tableData = incomeData.map(s => [
      s.entity,
      s.topCategory,
      s.count,
      s.latestDate,
      `R${s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: tableHeaders,
      body: tableData,
      foot: [['', '', '', 'TOTAL REVENUE', `R${totalIncomeForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
      headStyles: { fillStyle: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillStyle: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`Income_Summary_${period.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PieChart className="text-emerald-600" size={24} />
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Revenue & Income Summary</h2>
        </div>
        <div className="flex items-center space-x-3">
           <button 
             onClick={exportToPDF}
             className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all text-sm font-black uppercase shadow-sm"
           >
             <FileDown size={16} />
             <span>Export PDF</span>
           </button>
           <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-center">
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Gross Revenue (Period)</p>
             <p className="text-lg font-black text-slate-900">R{totalIncomeForPeriod.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Income Source..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {incomeData.map(source => (
          <div key={source.entity} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black group-hover:bg-emerald-600 group-hover:text-white transition-all">
                {source.entity.charAt(0)}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Last Invoiced</span>
                <span className="text-xs font-bold text-slate-600">{source.latestDate}</span>
              </div>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{source.entity}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{source.topCategory}</p>
            
            <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                <p className="text-xl font-black text-emerald-600">R{source.total.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 px-3 py-1 rounded-lg text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Records</p>
                <p className="text-xs font-bold text-slate-600">{source.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {incomeData.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center opacity-30">
          <div className="flex flex-col items-center justify-center space-y-3">
            <TrendingUp size={48} />
            <p className="text-sm font-black uppercase tracking-widest">No Income Sources Detected</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeSummary;
