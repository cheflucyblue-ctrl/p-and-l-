
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Transaction, LoanAccount, AppView } from '../types';
import { MONTHS } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, Activity, Factory, PieChart as PieIcon, FileText } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  loans: LoanAccount[];
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, loans, onNavigate }) => {
  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    
    const monthlyData = MONTHS.map(month => {
      const inc = transactions.filter(t => t.month === month && t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
      const exp = transactions.filter(t => t.month === month && t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
      return { month: month.split('-')[1] + '/25', income: inc, expense: exp };
    });

    const categoryBreakdown = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const pieData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

    return { totalIncome, totalExpense, netProfit, margin, monthlyData, pieData };
  }, [transactions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gross Income" value={stats.totalIncome} icon={<TrendingUp className="text-emerald-500" />} trend="+4.2%" color="border-emerald-100" />
        <StatCard title="Total Expenses" value={stats.totalExpense} icon={<TrendingDown className="text-rose-500" />} trend="+1.8%" color="border-rose-100" />
        
        {/* P&L HUB BUTTON CARD */}
        <button 
          onClick={() => onNavigate('PL_STATEMENT')}
          className="bg-slate-900 p-5 rounded-2xl shadow-xl text-left hover:bg-black transition-all hover:shadow-2xl group border border-slate-700"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-indigo-600 transition-colors">
              <FileText className="text-indigo-400 group-hover:text-white" />
            </div>
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-full uppercase tracking-widest">Executive Audit</span>
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">Forensic Statement</p>
          <p className="text-2xl font-black text-white mt-1">Full P&L Suite</p>
        </button>

        {/* REVENUE HUB BUTTON CARD */}
        <button 
          onClick={() => onNavigate('INCOME_SUMMARY')}
          className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-left hover:border-emerald-300 transition-all hover:shadow-md group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <PieIcon className="text-emerald-600" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">Revenue Hub</span>
          </div>
          <p className="text-sm font-black text-slate-500 uppercase tracking-tighter">Income Summary</p>
          <p className="text-2xl font-black text-slate-900 mt-1">Source Analysis</p>
        </button>

        {/* QUICK IMPORT CARD - INCOME */}
        <button 
          onClick={() => onNavigate('INCOME')}
          className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-left hover:bg-emerald-700 transition-all hover:shadow-xl group border border-emerald-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <TrendingUp className="text-white" />
            </div>
            <span className="text-[10px] font-black text-white bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Quick Action</span>
          </div>
          <p className="text-sm font-black text-emerald-100 uppercase tracking-tighter">Smart Import</p>
          <p className="text-2xl font-black text-white mt-1">Income Ledger</p>
        </button>

        {/* QUICK IMPORT CARD - WAGES */}
        <button 
          onClick={() => onNavigate('EXPENDITURE')}
          className="bg-rose-600 p-5 rounded-2xl shadow-lg text-left hover:bg-rose-700 transition-all hover:shadow-xl group border border-rose-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <TrendingDown className="text-white" />
            </div>
            <span className="text-[10px] font-black text-white bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Quick Action</span>
          </div>
          <p className="text-sm font-black text-rose-100 uppercase tracking-tighter">Wages Import</p>
          <p className="text-2xl font-black text-white mt-1">Payroll Ledger</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tighter">Strategic Expenditure Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(val) => `R${val / 1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} name="Income" />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tighter">Departmental Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.pieData.slice(0, 4).map((item: any, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[10px] font-black uppercase">
                <div className="flex items-center space-x-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                  <span>{item.name}</span>
                </div>
                <span className="text-slate-900">R{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, color }: any) => (
  <div className={`bg-white p-5 rounded-2xl border ${color} shadow-sm`}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-widest">{trend}</span>
    </div>
    <p className="text-sm font-black text-slate-500 uppercase tracking-tighter">{title}</p>
    <p className="text-2xl font-black text-slate-900 mt-1">
      {typeof value === 'number' ? `R${value.toLocaleString()}` : value}
    </p>
  </div>
);

export default Dashboard;
