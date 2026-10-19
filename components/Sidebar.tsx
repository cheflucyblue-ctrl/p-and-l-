
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppView, Transaction, LoanAccount, InventoryItem } from '../types';
import { NAV_ITEMS, MONTHS } from '../constants';
import { Package, Upload, CheckCircle2, HardDrive, AlertCircle, X, Check, ArrowRight, Trash2, Monitor, Save } from 'lucide-react';

interface SidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  transactions: Transaction[];
  loans: LoanAccount[];
  inventory: InventoryItem[];
  onClearAll: () => void;
  onOpenStorageModal?: () => void;
  onOpenWindowsModal?: () => void;
  isStandaloneApp?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  status: 'COMPLETED' | 'INCOMPLETE';
  description: string;
  actionNeeded: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onNavigate, 
  transactions, 
  loans, 
  inventory, 
  onClearAll,
  onOpenStorageModal,
  onOpenWindowsModal,
  isStandaloneApp
}) => {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
  const stockValue = useMemo(() => 
    inventory.filter(i => i.type === 'STOCK').reduce((sum, item) => sum + item.totalValue, 0)
  , [inventory]);

  const assetValue = useMemo(() => 
    inventory.filter(i => i.type === 'ASSET').reduce((sum, item) => sum + item.totalValue, 0)
  , [inventory]);

  // Forensic Checklist Logic
  const checklist = useMemo((): ChecklistItem[] => {
    const items: ChecklistItem[] = [];

    // 1. Monthly Revenue Coverage
    const monthsWithIncome = new Set(transactions.filter(t => t.type === 'INCOME').map(t => t.month));
    const allMonthsCoveredIncome = MONTHS.every(m => monthsWithIncome.has(m));
    items.push({
      id: 'revenue_coverage',
      label: 'Monthly Revenue Journals',
      status: allMonthsCoveredIncome ? 'COMPLETED' : 'INCOMPLETE',
      description: 'Income recorded for all active months in the cycle.',
      actionNeeded: `Missing income for: ${MONTHS.filter(m => !monthsWithIncome.has(m)).join(', ')}`
    });

    // 2. Monthly Expense Coverage
    const monthsWithExpense = new Set(transactions.filter(t => t.type === 'EXPENSE').map(t => t.month));
    const allMonthsCoveredExpense = MONTHS.every(m => monthsWithExpense.has(m));
    items.push({
      id: 'expense_coverage',
      label: 'Monthly Expense Journals',
      status: allMonthsCoveredExpense ? 'COMPLETED' : 'INCOMPLETE',
      description: 'Expenses recorded for all active months in the cycle.',
      actionNeeded: `Missing expenses for: ${MONTHS.filter(m => !monthsWithExpense.has(m)).join(', ')}`
    });

    // 3. F&B Stock Valuation
    items.push({
      id: 'stock_valuation',
      label: 'Food & Bev Stock Audit',
      status: stockValue > 0 ? 'COMPLETED' : 'INCOMPLETE',
      description: 'A current audited stock valuation for F&B inventory.',
      actionNeeded: 'Go to Inventory & Assets and import a single Audit CSV.'
    });

    // 4. Equipment Asset Audit
    items.push({
      id: 'equip_valuation',
      label: 'Equipment Asset Register',
      status: assetValue > 0 ? 'COMPLETED' : 'INCOMPLETE',
      description: 'A verified valuation of kitchen and front-of-house equipment.',
      actionNeeded: 'Go to Inventory & Assets and import a single Audit CSV.'
    });

    // 5. Loan Reconciliation
    const allLoansReconciled = loans.every(l => l.history.length > 0);
    items.push({
      id: 'loan_recon',
      label: 'Debt Account Reconciliation',
      status: allLoansReconciled ? 'COMPLETED' : 'INCOMPLETE',
      description: 'Detailed payment and interest journals for all debt facilities.',
      actionNeeded: 'At least one journal entry required for every loan account.'
    });

    // 6. Categorization Hygiene
    const uncategorizedCount = transactions.filter(t => t.category === 'Other').length;
    items.push({
      id: 'hygiene',
      label: 'Categorization Hygiene',
      status: uncategorizedCount === 0 ? 'COMPLETED' : 'INCOMPLETE',
      description: 'All ledger entries correctly assigned to specific forensic categories.',
      actionNeeded: `${uncategorizedCount} entries are currently under "Other". Review Income/Expense tabs.`
    });

    return items;
  }, [transactions, loans, stockValue, assetValue]);

  const compliancePercentage = useMemo(() => {
    const completed = checklist.filter(i => i.status === 'COMPLETED').length;
    return Math.round((completed / checklist.length) * 100);
  }, [checklist]);

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full hidden md:flex">
        <div className="p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white font-black text-lg">R</div>
            <span className="text-base font-black text-slate-800 tracking-tighter uppercase leading-tight">Rawdons Profit and loss</span>
          </div>
          
          <div className="space-y-4 mb-8">
            {/* STOCK VALUE WIDGET */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">F&B Stock Hold</span>
                <Package size={12} className="text-emerald-500" />
              </div>
              
              <div className="animate-fadeIn">
                <p className="text-md font-black text-slate-900 leading-tight">
                  R{stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center mt-0.5 text-emerald-600 space-x-1">
                  <CheckCircle2 size={10} />
                  <span className="text-[8px] font-bold uppercase">{stockValue > 0 ? 'Audited' : 'Pending'}</span>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('INVENTORY')}
                className="mt-3 flex items-center justify-center space-x-2 w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
              >
                <ArrowRight size={10} />
                <span>Manage Audit</span>
              </button>
            </div>

            {/* EQUIPMENT VALUE WIDGET */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipment Assets</span>
                <HardDrive size={12} className="text-indigo-500" />
              </div>
              
              <div className="animate-fadeIn">
                <p className="text-md font-black text-slate-900 leading-tight">
                  R{assetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center mt-0.5 text-indigo-600 space-x-1">
                  <CheckCircle2 size={10} />
                  <span className="text-[8px] font-bold uppercase">{assetValue > 0 ? 'Verified' : 'Pending'}</span>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('INVENTORY')}
                className="mt-3 flex items-center justify-center space-x-2 w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
              >
                <ArrowRight size={10} />
                <span>Manage Assets</span>
              </button>
            </div>
          </div>

          <nav className="space-y-1 border-t border-slate-100 pt-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">Navigation</p>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as AppView)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  activeView === item.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
            
            <div className="pt-3 border-t border-slate-100 my-2 space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 mb-1">System & Storage</p>
              
              {onOpenStorageModal && (
                <button
                  onClick={onOpenStorageModal}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium group"
                >
                  <HardDrive size={18} className="text-emerald-600 group-hover:scale-105 transition-transform" />
                  <div className="text-left flex-1">
                    <span className="text-xs font-bold block">Save to Computer</span>
                    <span className="text-[10px] text-slate-400 block">Backup & Storage</span>
                  </div>
                </button>
              )}

              {onOpenWindowsModal && (
                <button
                  onClick={onOpenWindowsModal}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium group"
                >
                  <Monitor size={18} className="text-indigo-600 group-hover:scale-105 transition-transform" />
                  <div className="text-left flex-1">
                    <span className="text-xs font-bold block">
                      {isStandaloneApp ? 'Windows App (Active)' : 'Install Windows App'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Standalone Desktop</span>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={onClearAll}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all text-rose-400 hover:bg-rose-50 hover:text-rose-600 mt-2 border border-dashed border-rose-100"
            >
              <Trash2 size={18} />
              <span className="text-xs font-bold uppercase tracking-tighter">Reset System</span>
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 bg-white">
          <button 
            onClick={() => setIsChecklistOpen(true)}
            className="w-full text-left bg-slate-900 rounded-2xl p-4 text-white hover:bg-black transition-all group"
          >
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-black group-hover:text-indigo-300 transition-colors">Audit Readiness</p>
              <AlertCircle size={12} className={compliancePercentage === 100 ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
            <p className="text-sm font-semibold mb-3">Reconciliation Status</p>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
              <div 
                className={`h-1.5 rounded-full transition-all duration-1000 ${
                  compliancePercentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} 
                style={{ width: `${compliancePercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">View Checklist</p>
              <p className="text-[10px] text-slate-400 text-right">{compliancePercentage}% Compliance</p>
            </div>
          </button>
        </div>
      </aside>

      {/* CHECKLIST MODAL */}
      {isChecklistOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-900 text-white rounded-2xl shadow-lg">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Audit Readiness Checklist</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Requirements for 100% forensic compliance</p>
                </div>
              </div>
              <button onClick={() => setIsChecklistOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {checklist.map((item) => (
                <div key={item.id} className={`p-5 rounded-2xl border transition-all ${
                  item.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        item.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {item.status === 'COMPLETED' ? <Check size={12} /> : <AlertCircle size={12} />}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.label}</h4>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mb-2">{item.description}</p>
                  {item.status === 'INCOMPLETE' && (
                    <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-black text-amber-800 uppercase leading-relaxed tracking-tight">
                        Action Needed: {item.actionNeeded}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Score</p>
                <p className="text-2xl font-black">{compliancePercentage}% Ready</p>
              </div>
              {compliancePercentage === 100 ? (
                <div className="flex items-center space-x-2 text-emerald-400 font-black uppercase text-xs">
                  <CheckCircle2 size={20} />
                  <span>Audit Ready</span>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deficiency</p>
                  <p className="text-lg font-black text-amber-400">-{100 - compliancePercentage}% Short</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
