import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, Save, Upload, Download, CheckCircle, AlertTriangle, Database, RefreshCw, X, Shield, FileText } from 'lucide-react';
import { Transaction, LoanAccount, InventoryItem } from '../types';
import {
  saveToComputerStorage,
  loadFromComputerStorage,
  exportConsolidatedCSV,
  enablePersistentStorage,
  getStorageMetrics,
  StorageStatus
} from '../utils/storageManager';

interface ComputerStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  loans: LoanAccount[];
  inventory: InventoryItem[];
  onRestore: (data: { transactions: Transaction[]; loans: LoanAccount[]; inventory: InventoryItem[] }) => void;
  onClearAll: () => void;
}

export const ComputerStorageModal: React.FC<ComputerStorageModalProps> = ({
  isOpen,
  onClose,
  transactions,
  loans,
  inventory,
  onRestore,
  onClearAll
}) => {
  const [metrics, setMetrics] = useState<StorageStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshMetrics = async () => {
    try {
      const data = await getStorageMetrics(transactions, loans, inventory);
      setMetrics(data);
    } catch (e) {
      console.warn('Metrics failed', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMetrics();
      setStatusMessage(null);
    }
  }, [isOpen, transactions, loans, inventory]);

  if (!isOpen) return null;

  const handleSaveToDisk = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveToComputerStorage(transactions, loans, inventory);
      setStatusMessage({
        text: `Data successfully saved to computer storage (${res.filename})!`,
        type: 'success'
      });
      await refreshMetrics();
    } catch (err: any) {
      if (err.message && err.message.includes('cancelled')) {
        setStatusMessage({ text: 'Save was cancelled.', type: 'info' });
      } else {
        setStatusMessage({ text: `Failed to save: ${err.message || 'Unknown error'}`, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setStatusMessage(null);

    try {
      const result = await loadFromComputerStorage(file);
      onRestore(result.data);
      setStatusMessage({
        text: `Successfully restored ${result.data.transactions.length} transactions and ${result.data.loans.length} loan accounts from ${file.name}!`,
        type: 'success'
      });
      await refreshMetrics();
    } catch (err: any) {
      setStatusMessage({
        text: `Error loading backup: ${err.message || 'File corrupted'}`,
        type: 'error'
      });
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = () => {
    exportConsolidatedCSV(transactions, loans);
    setStatusMessage({
      text: 'Exported master ledger CSV file to your computer downloads folder!',
      type: 'success'
    });
  };

  const handlePersistStorage = async () => {
    const persisted = await enablePersistentStorage();
    if (persisted) {
      setStatusMessage({
        text: 'Windows persistent storage enabled! Browser cache cleaning will not evict your data.',
        type: 'success'
      });
    } else {
      setStatusMessage({
        text: 'Storage persistence requested. Data remains saved in your local computer browser profile.',
        type: 'info'
      });
    }
    await refreshMetrics();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <HardDrive size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Computer Storage & Backup Manager</h3>
              <p className="text-xs text-slate-300">Save and load financial audit ledgers directly on your computer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs font-medium ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-900'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-900'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Database size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transactions</span>
              <span className="text-lg font-black text-slate-900">{metrics?.transactionCount ?? transactions.length}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loan Accounts</span>
              <span className="text-lg font-black text-slate-900">{metrics?.loanCount ?? loans.length}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Local Disk Size</span>
              <span className="text-lg font-black text-indigo-600">{metrics?.sizeFormatted ?? '0 KB'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PC Persistence</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle size={14} /> Active
              </span>
            </div>
          </div>

          {/* Primary Action 1: Save Backup to Computer Storage */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Save size={16} className="text-indigo-600" />
                  Save to Computer Hard Drive
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Generates an encrypted, versioned JSON snapshot containing all transactions, vendor accounts, loan ledgers, and inventory audits.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleSaveToDisk}
                disabled={isSaving}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Backup File to PC (.json)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-300 transition-all"
              >
                <FileText size={14} className="text-slate-600" />
                <span>Export Master Ledger (.csv)</span>
              </button>
            </div>
          </div>

          {/* Primary Action 2: Load / Restore Backup */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Upload size={16} className="text-emerald-600" />
              Restore Backup from Computer Storage
            </h4>
            <p className="text-xs text-slate-500">
              Select a previously saved <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">Rawdons_Financial_Backup_*.json</code> file to restore your complete accounting workspace.
            </p>

            <div className="pt-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="pc-backup-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingFile}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              >
                {isLoadingFile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                <span>Select & Restore Backup from PC</span>
              </button>
            </div>
          </div>

          {/* Advanced PC Storage Diagnostics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Shield size={14} className="text-indigo-600" />
                Local Computer Storage Diagnostics
              </span>
              <button
                onClick={handlePersistStorage}
                className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] hover:underline"
              >
                Request Windows Storage Lock
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every entry made in the ledger is automatically synced to your PC's browser/application storage. Creating periodic external JSON backups on your computer ensures you always have a complete offline record.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Status: Auto-saving enabled</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
