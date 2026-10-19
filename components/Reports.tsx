
import React, { useState, useMemo } from 'react';
import { Transaction, Category } from '../types';
import { CATEGORIES, MONTHS } from '../constants';

interface Props {
  transactions: Transaction[];
}

const Reports: React.FC<Props> = ({ transactions }) => {
  // Fix: 'Food COGS' is not a valid Category in types.ts, using 'Food Costs' instead
  const [activeDept, setActiveDept] = useState<Category>('Food Costs');

  const reportData = useMemo(() => {
    const deptData = transactions.filter(t => t.category === activeDept);
    
    const monthlyTotals = MONTHS.map(m => ({
      month: m,
      total: deptData.filter(t => t.month === m).reduce((acc, t) => acc + t.amount, 0),
      count: deptData.filter(t => t.month === m).length
    }));

    const topEntities = deptData.reduce((acc: any, t) => {
      acc[t.entity] = (acc[t.entity] || 0) + t.amount;
      return acc;
    }, {});

    return { 
      monthlyTotals, 
      transactions: deptData,
      topEntities: Object.entries(topEntities).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)
    };
  }, [transactions, activeDept]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Departments</h3>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveDept(cat)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${
              activeDept === cat 
                ? 'bg-white border-l-4 border-indigo-600 shadow-sm text-indigo-700 font-bold' 
                : 'text-slate-600 hover:bg-white/50 border-l-4 border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">{activeDept} Analysis</h2>
            <div className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-xs font-bold">
              Report Period: Aug - Dec 2024
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {reportData.monthlyTotals.slice(0, 3).map(m => (
              <div key={m.month} className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase">{m.month}</p>
                <p className="text-lg font-bold text-slate-900">R{m.total.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">{m.count} invoices processed</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Top Strategic Suppliers / Sources</h4>
            <div className="space-y-2">
              {reportData.topEntities.map(([name, val]: any) => (
                <div key={name} className="flex items-center space-x-4">
                  <div className="flex-1 bg-slate-100 h-8 rounded-lg overflow-hidden relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-indigo-200" 
                      style={{ width: `${(val / (reportData.topEntities[0][1] as number)) * 100}%` }}
                    ></div>
                    <div className="absolute inset-0 flex justify-between items-center px-3 text-xs font-bold">
                      <span className="text-slate-700">{name}</span>
                      <span className="text-slate-900">R{val.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Detailed Ledger: {activeDept}</h4>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-500">{t.date}</td>
                  <td className="px-6 py-3 font-bold">{t.entity}</td>
                  <td className="px-6 py-3 text-slate-400">{t.description}</td>
                  <td className="px-6 py-3 text-right font-bold">R{t.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
