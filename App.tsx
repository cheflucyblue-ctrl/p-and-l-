import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, AppView, LoanAccount, TransactionType, InventoryItem, Department } from './types';
import { NAV_ITEMS, MONTHS } from './constants';
import { Trash2, HardDrive, Save, Monitor, CheckCircle, Download, Database } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionManager from './components/TransactionManager';
import LoanManager from './components/LoanManager';
import SupplierManager from './components/SupplierManager';
import IncomeSummary from './components/IncomeSummary';
import PLStatement from './components/PLStatement';
import InventoryManager from './components/InventoryManager';
import { WindowsAppModal } from './components/WindowsAppModal';
import { ComputerStorageModal } from './components/ComputerStorageModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { saveToComputerStorage, enablePersistentStorage } from './utils/storageManager';

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_LOANS: LoanAccount[] = [];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('DASHBOARD');
  
  // Initialize state directly from local computer storage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('resto_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) {
      console.warn('Failed to parse resto_transactions from local computer storage', e);
      return INITIAL_TRANSACTIONS;
    }
  });

  const [loans, setLoans] = useState<LoanAccount[]>(() => {
    try {
      const saved = localStorage.getItem('resto_loans');
      return saved ? JSON.parse(saved) : INITIAL_LOANS;
    } catch (e) {
      console.warn('Failed to parse resto_loans from local computer storage', e);
      return INITIAL_LOANS;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('resto_inventory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse resto_inventory from local computer storage', e);
      return [];
    }
  });

  // Windows PWA and Storage Modals
  const [isWindowsModalOpen, setIsWindowsModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { isInstallable, isInstalled } = usePWAInstall();

  // Enable Windows persistent storage on mount
  useEffect(() => {
    enablePersistentStorage().catch(() => {});
  }, []);

  // Calculate Recurring / Permanent Monthly Expenses
  const allTransactions = useMemo(() => {
    const recurring: Transaction[] = [];
    
    MONTHS.forEach(month => {
      // 1. Marketing & Communication
      recurring.push({
        id: `auto-mkt-${month}`,
        date: `${month}-01`,
        type: 'EXPENSE',
        department: 'Direct Operating',
        category: 'Marketing & Advertising',
        amount: 1500,
        entity: 'Marketing & Comm (Monthly)',
        description: 'Auto-generated permanent monthly expense',
        paymentMethod: 'EFT',
        month: month
      });

      // 2. POS Rental
      recurring.push({
        id: `auto-pos-${month}`,
        date: `${month}-01`,
        type: 'EXPENSE',
        department: 'Direct Operating',
        category: 'Technology',
        amount: 1750,
        entity: 'POS Rental (Monthly)',
        description: 'Auto-generated permanent monthly expense',
        paymentMethod: 'EFT',
        month: month
      });

      // 3. Banking Fees (5% of POS Card Sales)
      const monthlyCardSales = transactions
        .filter(t => t.month === month && t.type === 'INCOME' && t.category === 'POS Card')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const bankingFeeAmount = monthlyCardSales * 0.05;
      
      if (bankingFeeAmount > 0) {
        recurring.push({
          id: `auto-bank-${month}`,
          date: `${month}-28`, // Typically processed at month end
          type: 'EXPENSE',
          department: 'G&A',
          category: 'Bank Fees',
          amount: bankingFeeAmount,
          entity: 'Banking Fees (5% Card Sales)',
          description: `Calculated from R${monthlyCardSales.toLocaleString()} card revenue`,
          paymentMethod: 'EFT',
          month: month
        });
      }
    });

    return [...transactions, ...recurring];
  }, [transactions]);

  // Synchronize state immediately to local computer storage
  useEffect(() => {
    try {
      localStorage.setItem('resto_transactions', JSON.stringify(transactions));
      localStorage.setItem('resto_last_saved_at', new Date().toISOString());
    } catch (e) {
      console.warn('Failed saving transactions to local storage:', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('resto_loans', JSON.stringify(loans));
      localStorage.setItem('resto_last_saved_at', new Date().toISOString());
    } catch (e) {
      console.warn('Failed saving loans to local storage:', e);
    }
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem('resto_inventory', JSON.stringify(inventory));
      localStorage.setItem('resto_last_saved_at', new Date().toISOString());
    } catch (e) {
      console.warn('Failed saving inventory to local storage:', e);
    }
  }, [inventory]);

  const addTransactions = (newItems: Transaction[]) => {
    setTransactions(prev => [...prev, ...newItems]);
  };

  const deleteTransaction = (id: string) => {
    // Only allow deleting non-auto transactions
    if (id.startsWith('auto-')) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const clearTransactions = (type: TransactionType, month?: string, excludeDept?: Department, onlyDept?: Department) => {
    setTransactions(prev => prev.filter(t => {
      // Keep other types
      if (t.type !== type) return true;
      // Keep auto-generated items
      if (t.id.startsWith('auto-')) return true;
      // Keep excluded department
      if (excludeDept && t.department === excludeDept) return true;
      // Only remove specified department if onlyDept is provided
      if (onlyDept && t.department !== onlyDept) return true;
      
      // If month specified and matches, remove it
      if (month && month !== 'ALL') {
        return t.month !== month;
      }
      // If no month specified, clear all for this type (subject to dept filters above)
      return false;
    }));
  };

  const updateTransaction = (updated: Transaction) => {
    // Only allow updating non-auto transactions
    if (updated.id.startsWith('auto-')) return;
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const updateTransactions = (updates: Transaction[]) => {
    const updateMap = new Map(updates.map(t => [t.id, t]));
    setTransactions(prev => prev.map(t => {
      const updated = updateMap.get(t.id);
      if (updated && !t.id.startsWith('auto-')) {
        return updated;
      }
      return t;
    }));
  };

  const updateLoan = (updatedLoan: LoanAccount) => {
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
  };

  // Restore handler from computer storage backup
  const handleRestoreData = (data: { transactions: Transaction[]; loans: LoanAccount[]; inventory: InventoryItem[] }) => {
    setTransactions(data.transactions);
    setLoans(data.loans);
    setInventory(data.inventory);
    try {
      localStorage.setItem('resto_transactions', JSON.stringify(data.transactions));
      localStorage.setItem('resto_loans', JSON.stringify(data.loans));
      localStorage.setItem('resto_inventory', JSON.stringify(data.inventory));
      localStorage.setItem('resto_last_saved_at', new Date().toISOString());
    } catch (e) {
      console.warn('Failed writing restored data:', e);
    }
  };

  // Quick save to computer hard drive
  const handleQuickSaveToDisk = async () => {
    try {
      const res = await saveToComputerStorage(transactions, loans, inventory);
      setSaveToast({
        message: `Saved to computer: ${res.filename}`,
        type: 'success'
      });
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        setSaveToast({
          message: `Save cancelled or error: ${err.message || 'Disk error'}`,
          type: 'error'
        });
        setTimeout(() => setSaveToast(null), 4000);
      }
    }
  };

  const clearAllData = () => {
    const confirmed = window.confirm('This will permanently delete all imported transactions, inventory audits, and loan accounts from this computer. Proceed?');
    
    if (confirmed) {
      setTransactions([]);
      setInventory([]);
      setLoans([...INITIAL_LOANS]);
      
      try {
        localStorage.setItem('resto_transactions', JSON.stringify([]));
        localStorage.setItem('resto_inventory', JSON.stringify([]));
        localStorage.setItem('resto_loans', JSON.stringify(INITIAL_LOANS));
      } catch (e) {
        console.warn('Error clearing local storage:', e);
      }
      
      setSaveToast({ message: 'All computer storage data reset.', type: 'success' });
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard transactions={allTransactions} loans={loans} onNavigate={setView} />;
      case 'INCOME':
        return (
          <TransactionManager 
            transactions={allTransactions} 
            onAdd={addTransactions} 
            onDelete={deleteTransaction} 
            onUpdate={updateTransaction}
            onClear={(month, excludeDept, onlyDept) => clearTransactions('INCOME', month, excludeDept, onlyDept)}
            forcedType="INCOME"
          />
        );
      case 'INCOME_SUMMARY':
        return <IncomeSummary transactions={allTransactions} />;
      case 'EXPENDITURE':
        return (
          <TransactionManager 
            transactions={allTransactions} 
            onAdd={addTransactions} 
            onDelete={deleteTransaction} 
            onUpdate={updateTransaction}
            onClear={(month, excludeDept, onlyDept) => clearTransactions('EXPENSE', month, excludeDept, onlyDept)}
            forcedType="EXPENSE"
          />
        );
      case 'SUPPLIERS':
        return <SupplierManager transactions={allTransactions} onUpdateTransactions={updateTransactions} />;
      case 'LOANS':
        return <LoanManager loans={loans} onUpdate={updateLoan} onTransactionAdd={addTransactions} />;
      case 'PL_STATEMENT':
        return <PLStatement transactions={allTransactions} loans={loans} />;
      case 'INVENTORY':
        return <InventoryManager inventory={inventory} onUpdate={setInventory} onClear={() => setInventory([])} />;
      default:
        return <Dashboard transactions={allTransactions} loans={loans} onNavigate={setView} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        activeView={view} 
        onNavigate={setView} 
        transactions={allTransactions} 
        loans={loans} 
        inventory={inventory}
        onClearAll={clearAllData}
        onOpenStorageModal={() => setIsStorageModalOpen(true)}
        onOpenWindowsModal={() => setIsWindowsModalOpen(true)}
        isStandaloneApp={isInstalled}
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tighter uppercase">Rawdons Profit and loss</h1>
              <p className="text-slate-500 text-xs font-semibold tracking-wider mt-0.5">Restaurant Financial Management & Audit System</p>
            </div>
            
            {/* Header controls: Save to Computer, Windows App, Storage Manager */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Quick Save to Computer */}
              <button
                onClick={handleQuickSaveToDisk}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all transform active:scale-95"
                title="Save backup directly to your computer storage"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save to PC</span>
              </button>

              {/* PC Storage & Backup Modal Trigger */}
              <button
                onClick={() => setIsStorageModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 rounded-xl text-xs font-bold shadow-sm transition-all"
                title="Open Computer Storage & Backup Manager"
              >
                <HardDrive size={14} className="text-emerald-600" />
                <span>PC Storage</span>
              </button>

              {/* Standalone Windows App Installer / Status */}
              <button
                onClick={() => setIsWindowsModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                  isInstalled 
                    ? 'bg-slate-900 text-emerald-400 hover:bg-black' 
                    : 'bg-slate-900 hover:bg-black text-white'
                }`}
                title="Install or manage Standalone Windows Desktop Application"
              >
                <Monitor size={14} className={isInstalled ? 'text-emerald-400' : 'text-indigo-400'} />
                <span>{isInstalled ? 'Windows App' : 'Install Windows App'}</span>
              </button>

              {/* Reset button for mobile */}
              <button 
                onClick={clearAllData}
                className="md:hidden p-2 text-rose-400 hover:text-rose-600 transition-colors"
                title="Reset System"
              >
                <Trash2 size={18} />
              </button>

              {/* Real-time Storage Synced indicator */}
              <div className="hidden lg:flex items-center space-x-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>PC Storage: Synced</span>
              </div>
            </div>
          </header>

          {/* Toast Notification */}
          {saveToast && (
            <div className={`p-3 rounded-xl shadow-md text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200 ${
              saveToast.type === 'success' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-rose-600 text-white'
            }`}>
              <CheckCircle size={15} />
              <span>{saveToast.message}</span>
            </div>
          )}

          {renderContent()}
        </div>
      </main>

      {/* Windows Application Installation Modal */}
      <WindowsAppModal 
        isOpen={isWindowsModalOpen}
        onClose={() => setIsWindowsModalOpen(false)}
      />

      {/* Computer Storage & Backup Manager Modal */}
      <ComputerStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        transactions={allTransactions}
        loans={loans}
        inventory={inventory}
        onRestore={handleRestoreData}
        onClearAll={clearAllData}
      />
    </div>
  );
};

export default App;
