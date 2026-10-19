import { Transaction, LoanAccount, InventoryItem } from '../types';

export interface StorageBackupPayload {
  app: 'Rawdons Profit and loss';
  version: '2.0.0';
  exportedAt: string;
  checksum: string;
  system: {
    platform: string;
    userAgent: string;
  };
  data: {
    transactions: Transaction[];
    loans: LoanAccount[];
    inventory: InventoryItem[];
  };
  metrics: {
    transactionCount: number;
    loansCount: number;
    inventoryCount: number;
    totalExpenditure: number;
    totalIncome: number;
  };
}

export interface StorageStatus {
  isPersisted: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  transactionCount: number;
  loanCount: number;
  inventoryCount: number;
  lastSaved: string | null;
  sizeFormatted: string;
}

/**
 * Request persistent storage on the client machine so the browser/system
 * guarantees data will not be evicted during storage pressure.
 */
export async function enablePersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (e) {
      console.warn('Storage persist request error:', e);
    }
  }
  return false;
}

/**
 * Get current local storage metrics and disk consumption estimates.
 */
export async function getStorageMetrics(
  transactions: Transaction[],
  loans: LoanAccount[],
  inventory: InventoryItem[]
): Promise<StorageStatus> {
  let isPersisted = false;
  let usageBytes = 0;
  let quotaBytes = 0;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted();
    }
    if (navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    }
  }

  // Calculate payload size
  const txStr = JSON.stringify(transactions);
  const loanStr = JSON.stringify(loans);
  const invStr = JSON.stringify(inventory);
  const totalChars = (txStr.length + loanStr.length + invStr.length) * 2; // ~2 bytes per char
  const sizeFormatted = totalChars > 1024 * 1024 
    ? `${(totalChars / (1024 * 1024)).toFixed(2)} MB` 
    : `${(totalChars / 1024).toFixed(1)} KB`;

  const lastSaved = localStorage.getItem('resto_last_saved_at') || null;

  return {
    isPersisted,
    usageBytes,
    quotaBytes,
    transactionCount: transactions.length,
    loanCount: loans.length,
    inventoryCount: inventory.length,
    lastSaved,
    sizeFormatted
  };
}

/**
 * Save complete application backup directly to the computer's storage disk.
 * Uses window.showSaveFilePicker (File System Access API) if supported (Edge/Chrome on Windows),
 * or triggers a direct download save file.
 */
export async function saveToComputerStorage(
  transactions: Transaction[],
  loans: LoanAccount[],
  inventory: InventoryItem[]
): Promise<{ success: boolean; filename: string; method: 'picker' | 'download' }> {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Rawdons_Financial_Backup_${dateStr}.json`;

  const nonAutoTx = transactions.filter(t => !t.id.startsWith('auto-'));
  const totalExp = nonAutoTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalInc = nonAutoTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);

  const payload: StorageBackupPayload = {
    app: 'Rawdons Profit and loss',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    checksum: `CHKSUM-${Date.now()}-${nonAutoTx.length}`,
    system: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    },
    data: {
      transactions: nonAutoTx,
      loans,
      inventory
    },
    metrics: {
      transactionCount: nonAutoTx.length,
      loansCount: loans.length,
      inventoryCount: inventory.length,
      totalExpenditure: totalExp,
      totalIncome: totalInc
    }
  };

  const jsonContent = JSON.stringify(payload, null, 2);

  // Modern Windows File System Access API
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Rawdons Financial Backup JSON (*.json)',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(jsonContent);
      await writable.close();
      
      localStorage.setItem('resto_last_saved_at', new Date().toISOString());
      return { success: true, filename: handle.name || filename, method: 'picker' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Save cancelled by user.');
      }
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }

  // Fallback: standard file download to computer storage
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  localStorage.setItem('resto_last_saved_at', new Date().toISOString());
  return { success: true, filename, method: 'download' };
}

/**
 * Load and restore data from a computer storage backup file (.json).
 */
export async function loadFromComputerStorage(
  file: File
): Promise<{
  success: boolean;
  data: {
    transactions: Transaction[];
    loans: LoanAccount[];
    inventory: InventoryItem[];
  };
  metrics: StorageBackupPayload['metrics'];
  exportedAt: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as StorageBackupPayload;

        if (!parsed || !parsed.data) {
          throw new Error('Invalid backup file structure: missing data payload.');
        }

        const transactions = Array.isArray(parsed.data.transactions) ? parsed.data.transactions : [];
        const loans = Array.isArray(parsed.data.loans) ? parsed.data.loans : [];
        const inventory = Array.isArray(parsed.data.inventory) ? parsed.data.inventory : [];

        resolve({
          success: true,
          data: { transactions, loans, inventory },
          metrics: parsed.metrics || {
            transactionCount: transactions.length,
            loansCount: loans.length,
            inventoryCount: inventory.length,
            totalExpenditure: 0,
            totalIncome: 0
          },
          exportedAt: parsed.exportedAt || new Date().toISOString()
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse backup file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsText(file);
  });
}

/**
 * Export consolidated audit CSV file to computer disk.
 */
export function exportConsolidatedCSV(
  transactions: Transaction[],
  loans: LoanAccount[]
): void {
  const headers = ['Type', 'Date', 'Month', 'Department', 'Category', 'Entity / Supplier', 'Description', 'Amount', 'Payment Method'];
  const rows = transactions
    .filter(t => !t.id.startsWith('auto-'))
    .map(t => [
      t.type,
      t.date,
      t.month,
      `"${(t.department || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.entity || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.paymentMethod || 'EFT'
    ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `Rawdons_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
