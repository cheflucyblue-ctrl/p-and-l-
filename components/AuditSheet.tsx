
import React, { useMemo } from 'react';
import { Transaction, Category, Department } from '../types';
import { MONTHS, DEPARTMENTS, DEPT_CATEGORIES } from '../constants';
import { CheckCircle2, Info, ShieldCheck, PieChart } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const AuditSheet: React.FC<Props> = ({ transactions }) => {
  const auditGrid = useMemo(() => {
    return MONTHS.map(month => {
      const monthTx = transactions.filter(t => t.month === month);
      
      const totalIncome = monthTx.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
      const totalExpense = monthTx.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

      const deptBreakdown = DEPARTMENTS.reduce((acc, dept) => {
        acc[dept] = monthTx.filter(t => t.department === dept).reduce((sum, t) => sum + t.amount, 0);
        return acc;
      }, {} as Record<Department, number>);

      const revenueBreakdown = DEPT_CATEGORIES.REVENUE.reduce((acc, cat) => {
        acc[cat] = monthTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
        return acc;
      }, {} as Record<Category, number>);

      return { month, totalIncome, totalExpense, deptBreakdown, revenueBreakdown, net: totalIncome - totalExpense };
    });
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-2">
              <ShieldCheck className="text-indigo-400" size={28} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Forensic Departmental Ledger</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Consolidated audit analyzing the 6 core restaurant departments. All GOBD journals, petty cash records, and staff wages are automatically reconciled against the monthly timeline.
            </p>
          </div>
          <div className="hidden lg:block bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[180px]">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Database Audit</p>
            <p className="text-xl font-black">Aug-Dec 2025</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-xl scrollbar-hide">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50 p-6 text-left border-r border-slate-200 z-20 min-w-[300px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Framework</span>
              </th>
              {auditGrid.map(col => (
                <th key={col.month} className="p-6 bg-slate-50 border-b border-slate-200 text-center min-w-[160px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {col.month.split('-')[1]} / {col.month.split('-')[0]}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue Section */}
            <tr className="bg-emerald-50/50">
              <td className="sticky left-0 bg-emerald-50 p-3 pl-6 text-[10px] font-black text-emerald-700 uppercase tracking-widest border-r border-emerald-100 z-10">
                Operating Revenue
              </td>
              {auditGrid.map((_, i) => <td key={i} className="border-b border-emerald-100 bg-emerald-50/20"></td>)}
            </tr>
            {DEPT_CATEGORIES.REVENUE.map(cat => (
              <tr key={cat} className="hover:bg-slate-50 group transition-colors">
                <td className="sticky left-0 bg-white p-4 pl-8 text-xs font-bold text-slate-600 border-r border-slate-100 z-10 group-hover:bg-slate-50">
                  {cat}
                </td>
                {auditGrid.map(col => (
                  <td key={col.month} className="p-4 text-center border-b border-slate-50 text-sm font-black text-emerald-600">
                    {col.revenueBreakdown[cat] ? `R${col.revenueBreakdown[cat].toLocaleString()}` : '-'}
                  </td>
                ))}
              </tr>
            ))}

            {/* Departmental Expenses */}
            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 p-3 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 z-10">
                Expenditure by Department
              </td>
              {auditGrid.map((_, i) => <td key={i} className="border-b border-slate-200"></td>)}
            </tr>
            {DEPARTMENTS.map(dept => (
              <tr key={dept} className="hover:bg-slate-50 transition-colors group">
                <td className="sticky left-0 bg-white p-4 pl-8 text-xs font-black text-slate-900 border-r border-slate-100 z-10 group-hover:bg-slate-50">
                  {dept}
                </td>
                {auditGrid.map(col => (
                  <td key={col.month} className="p-4 text-center border-b border-slate-50">
                    <p className="text-sm font-black text-slate-900">
                      {col.deptBreakdown[dept] ? `R${col.deptBreakdown[dept].toLocaleString()}` : '-'}
                    </p>
                  </td>
                ))}
              </tr>
            ))}
            
            <tr className="bg-emerald-600 text-white">
              <td className="sticky left-0 bg-emerald-600 p-5 font-black text-xs border-r border-emerald-500 z-10 uppercase tracking-widest shadow-lg">Total Operating Income</td>
              {auditGrid.map(col => (
                <td key={col.month} className="p-5 text-center text-sm font-black">
                  R{col.totalIncome.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="bg-rose-600 text-white">
              <td className="sticky left-0 bg-rose-600 p-5 font-black text-xs border-r border-rose-500 z-10 uppercase tracking-widest shadow-lg">Total Cash Outflow</td>
              {auditGrid.map(col => (
                <td key={col.month} className="p-5 text-center text-sm font-black">
                  R{col.totalExpense.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-900 text-white shadow-2xl">
              <td className="sticky left-0 bg-slate-900 p-6 font-black text-sm border-r border-slate-700 z-10 uppercase tracking-widest">Net Audit Surplus</td>
              {auditGrid.map(col => (
                <td key={col.month} className={`p-6 text-center text-lg font-black tracking-tight ${col.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R{col.net.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex items-start space-x-4 shadow-sm">
          <PieChart className="text-indigo-600 shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-indigo-900 font-black text-xs uppercase tracking-widest mb-1">COGS & GOBD Tracking</h4>
            <p className="text-indigo-800 text-[10px] leading-relaxed font-medium uppercase">
              All supplier journals from SAB, Banks Dealers, and Packtown are mapped to the COGS department automatically based on the vendor signature.
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-start space-x-4 shadow-sm">
          <Info className="text-emerald-600 shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-emerald-900 font-black text-xs uppercase tracking-widest mb-1">Audit Reconcilation Status</h4>
            <p className="text-emerald-800 text-[10px] leading-relaxed font-medium uppercase">
              Transactions are filtered and buckets are generated based on YYYY-MM identifiers derived from your source CSV timestamps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditSheet;
