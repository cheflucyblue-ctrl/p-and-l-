
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Category, PaymentMethod, TransactionType, Department } from '../types';
import { CATEGORIES, PAYMENT_METHODS, MONTHS, DEPARTMENTS, DEPT_CATEGORIES } from '../constants';
import { Plus, Upload, Search, Trash2, Filter, FileSpreadsheet, Wallet, TrendingUp, TrendingDown, ChevronRight, FileDown, Download, Check, X, RefreshCw, Eraser, CalendarX } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
  onAdd: (items: Transaction[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: Transaction) => void;
  onClear?: (month?: string, excludeDept?: Department, onlyDept?: Department) => void;
  forcedType?: TransactionType;
}

interface EditCell {
  id: string;
  field: keyof Transaction;
}

const TransactionManager: React.FC<Props> = ({ transactions, onAdd, onDelete, onUpdate, onClear, forcedType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('ALL');
  
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: forcedType || 'EXPENSE' as TransactionType,
    department: (forcedType === 'INCOME' ? 'REVENUE' : 'COGS Food') as Department | 'REVENUE',
    category: (forcedType === 'INCOME' ? 'POS Cash' : 'Food Costs') as Category,
    amount: 0,
    entity: '',
    description: '',
    paymentMethod: 'EFT' as PaymentMethod
  });

  useEffect(() => {
    if (forcedType === 'INCOME') {
      setFormData(prev => ({ ...prev, type: 'INCOME', department: 'REVENUE', category: 'POS Cash' }));
    } else {
      setFormData(prev => ({ ...prev, type: 'EXPENSE', department: 'COGS Food', category: 'Food Costs' }));
    }
  }, [forcedType]);

  useEffect(() => {
    if (editCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editCell]);

  const filtered = transactions.filter(t => {
    const matchesSearch = t.entity.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth === 'ALL' || t.month === filterMonth;
    const matchesType = t.type === (forcedType || 'EXPENSE');
    return matchesSearch && matchesMonth && matchesType;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const startEdit = (transaction: Transaction, field: keyof Transaction) => {
    if (transaction.id.startsWith('auto-')) return; // No editing auto-entries
    setEditCell({ id: transaction.id, field });
    setEditValue(transaction[field]);
  };

  const saveEdit = () => {
    if (!editCell) return;
    const original = transactions.find(t => t.id === editCell.id);
    if (original) {
      const updatedValue = editValue;
      const updated = { ...original, [editCell.field]: updatedValue };

      if (editCell.field === 'date') {
        updated.month = (updatedValue as string).substring(0, 7);
        onUpdate(updated);
      } 
      else if (editCell.field === 'category') {
        // Find corresponding department for the new category
        let newDept: Department | 'REVENUE' = original.department;
        for (const [dept, cats] of Object.entries(DEPT_CATEGORIES)) {
          if ((cats as string[]).includes(updatedValue as string)) {
            newDept = dept as Department | 'REVENUE';
            break;
          }
        }

        // Apply bulk sync logic: Update ALL transactions with the same Entity/Source
        const entityToSync = original.entity;
        
        transactions.forEach(t => {
          if (t.entity === entityToSync && !t.id.startsWith('auto-')) {
            onUpdate({
              ...t,
              category: updatedValue as Category,
              department: newDept
            });
          }
        });
      } 
      else {
        onUpdate(updated);
      }
    }
    setEditCell(null);
    setEditValue(null);
  };

  const cancelEdit = () => {
    setEditCell(null);
    setEditValue(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleClearAll = () => {
    const typeLabel = forcedType === 'INCOME' ? 'Income' : 'Expenditure';
    if (window.confirm(`Are you sure you want to clear ALL manual ${typeLabel} entries? Auto-generated recurring items will be preserved.`)) {
      onClear?.();
    }
  };

  const handleClearMonth = () => {
    if (filterMonth === 'ALL') return;
    const typeLabel = forcedType === 'INCOME' ? 'Income' : 'Expenditure';
    if (window.confirm(`Are you sure you want to clear manual ${typeLabel} entries ONLY for ${filterMonth}? Previous and future months will be untouched.`)) {
      onClear?.(filterMonth);
    }
  };

  const exportToCSV = () => {
    const title = forcedType === 'INCOME' ? 'Income_Ledger' : `Expenditure_Ledger_Consolidated`;
    const period = filterMonth === 'ALL' ? 'Consolidated' : filterMonth;
    const headers = ['Date', 'Entity', 'Description', 'Category', 'Department', 'Payment Method', 'Amount'];
    
    const rows = filtered.map(t => [
      t.date,
      `"${t.entity.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.department,
      t.paymentMethod,
      t.amount
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title}_${period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = forcedType === 'INCOME' ? 'Income Ledger' : `Expenditure Ledger - Consolidated`;
    const period = filterMonth === 'ALL' ? 'August - December 2025' : filterMonth;
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text('Rawdons Profit and loss', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); 
    doc.text(`${title} | Period: ${period}`, 14, 28);
    
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    const tableHeaders = [['Date', 'Entity / Source', 'Category', 'Method', 'Amount (ZAR)']];
    const tableData = filtered.map(t => [
      t.date,
      t.entity,
      t.category,
      t.paymentMethod,
      `R${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);

    (doc as any).autoTable({
      startY: 40,
      head: tableHeaders,
      body: tableData,
      foot: [['', '', '', 'TOTAL', `R${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
      headStyles: { fillStyle: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillStyle: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`${title.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`);
  };

  const normalizeDate = (rawDate: string): { iso: string, month: string } => {
    if (!rawDate) return { iso: new Date().toISOString().split('T')[0], month: new Date().toISOString().substring(0, 7) };
    if (!isNaN(Number(rawDate)) && rawDate.length > 4) {
      const serial = parseFloat(rawDate);
      const date = new Date((serial - 25569) * 86400 * 1000);
      const iso = date.toISOString().split('T')[0];
      return { iso, month: iso.substring(0, 7) };
    }
    let date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      const parts = rawDate.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
           date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
        } else {
           date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
      }
    }
    if (isNaN(date.getTime())) {
      const now = new Date();
      return { iso: now.toISOString().split('T')[0], month: now.toISOString().substring(0, 7) };
    }
    const iso = date.toISOString().split('T')[0];
    return { iso, month: iso.substring(0, 7) };
  };

  const smartAnalyzeRevenue = (desc: string, source: string): { cat: Category, method: PaymentMethod } => {
    const d = desc.toLowerCase();
    const s = source.toLowerCase();
    if (s.includes('cash') || d.includes('cash')) return { cat: 'POS Cash', method: 'CASH' };
    if (s.includes('card') || s.includes('visa') || s.includes('mastercard') || s.includes('yoco') || s.includes('zapper')) return { cat: 'POS Card', method: 'CARD' };
    if (s.includes('tenant') || s.includes('rent') || d.includes('lease')) return { cat: 'Tenant Income', method: 'EFT' };
    if (s.includes('account') || s.includes('invoice') || s.includes('creditor')) return { cat: 'Account Sales', method: 'ACCOUNT' };
    return { cat: 'POS Cash', method: 'CASH' };
  };

  const smartAnalyzeExpense = (desc: string, source: string, txType: string): { dept: Department, cat: Category } => {
    const fullContent = (source + ' ' + desc + ' ' + txType).toLowerCase();
    
    if (fullContent.includes('wage') || fullContent.includes('salary') || fullContent.includes('labor') || fullContent.includes('payroll') || fullContent.includes('payslip')) {
      return { dept: 'WAGES', cat: 'Wages & Salaries' };
    }
    if (fullContent.includes('tax') || fullContent.includes('paye') || fullContent.includes('uif')) {
      return { dept: 'Labor', cat: 'Payroll Taxes' };
    }
    if (fullContent.includes('rent') || fullContent.includes('lease') || fullContent.includes('landlord')) {
      return { dept: 'Occupancy', cat: 'Rent/Mortgage' };
    }
    if (fullContent.includes('utility') || fullContent.includes('electric') || fullContent.includes('water') || fullContent.includes('council') || fullContent.includes('eskom')) {
      return { dept: 'Occupancy', cat: 'Utilities' };
    }
    if (fullContent.includes('sab') || fullContent.includes('beer') || fullContent.includes('wine') || fullContent.includes('liquor') || fullContent.includes('beverage')) {
      return { dept: 'COGS Bev', cat: 'Beverage Costs' };
    }
    if (fullContent.includes('meat') || fullContent.includes('veg') || fullContent.includes('fruit') || fullContent.includes('bread') || fullContent.includes('grocery') || fullContent.includes('food') || fullContent.includes('bakery') || fullContent.includes('bidfood')) {
      return { dept: 'COGS Food', cat: 'Food Costs' };
    }
    if (fullContent.includes('paper') || fullContent.includes('packaging') || fullContent.includes('napkin') || fullContent.includes('straw')) {
      return { dept: 'COGS Food', cat: 'Paper Goods' };
    }
    if (fullContent.includes('bank') || fullContent.includes('fee') || fullContent.includes('service charge')) {
      return { dept: 'G&A', cat: 'Bank Fees' };
    }
    if (fullContent.includes('attorney') || fullContent.includes('audit') || fullContent.includes('legal') || fullContent.includes('accounting')) {
      return { dept: 'G&A', cat: 'Professional Fees' };
    }
    if (fullContent.includes('marketing') || fullContent.includes('google') || fullContent.includes('facebook') || fullContent.includes('ads') || fullContent.includes('flyer')) {
      return { dept: 'Direct Operating', cat: 'Marketing & Advertising' };
    }
    if (fullContent.includes('repair') || fullContent.includes('maintenance') || fullContent.includes('plumber') || fullContent.includes('electrician') || fullContent.includes('hardware')) {
      return { dept: 'Repair and Maintenance', cat: 'Repairs & Maintenance' };
    }
    if (fullContent.includes('cleaning') || fullContent.includes('sanitation') || fullContent.includes('hygiene') || fullContent.includes('detergent')) {
      return { dept: 'Cleaning', cat: 'Cleaning & Sanitation' };
    }
    if (fullContent.includes('software') || fullContent.includes('it') || fullContent.includes('hosting') || fullContent.includes('subscription')) {
      return { dept: 'Direct Operating', cat: 'Technology' };
    }
    if (fullContent.includes('equipment') || fullContent.includes('fridge') || fullContent.includes('oven') || fullContent.includes('furniture')) {
      return { dept: 'CAPEX', cat: 'Equipment' };
    }
    if (fullContent.includes('renovate') || fullContent.includes('build') || fullContent.includes('decor')) {
      return { dept: 'CAPEX', cat: 'Renovations' };
    }
    return { dept: 'COGS Food', cat: 'Other' };
  };

  const splitCsvLine = (line: string) => {
    const parts: string[] = [];
    let currentPart = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim());
    return parts;
  };

  const handleExpenditureCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const newTransactions: Transaction[] = [];
      const headerRow = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, '').trim());
      
      const dateIdx = headerRow.findIndex(h => h.includes('date'));
      const supplierIdx = headerRow.findIndex(h => h.includes('supplier'));
      const debitIdx = headerRow.findIndex(h => h.includes('debit'));
      const creditIdx = headerRow.findIndex(h => h.includes('credit'));
      const categoryIdx = headerRow.findIndex(h => h.includes('category'));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = splitCsvLine(line);
        
        try {
          const rawDate = parts[dateIdx];
          const { iso, month } = normalizeDate(rawDate);
          const entity = parts[supplierIdx].replace(/"/g, '');
          const rawDebit = parts[debitIdx] || '0';
          const rawCredit = parts[creditIdx] || '0';
          const debit = Math.abs(parseFloat(rawDebit.replace(/[^\d.-]/g, '')) || 0);
          const credit = Math.abs(parseFloat(rawCredit.replace(/[^\d.-]/g, '')) || 0);
          const amount = credit > 0 ? credit : debit;
          
          const rawCat = (parts[categoryIdx] || '').toLowerCase();

          let dept: Department = 'COGS Food';
          let cat: Category = 'Other';

          if (rawCat.includes('food')) { dept = 'COGS Food'; cat = 'Food Costs'; }
          else if (rawCat.includes('bev')) { dept = 'COGS Bev'; cat = 'Beverage Costs'; }
          else if (rawCat.includes('packaging')) { dept = 'COGS Food'; cat = 'Paper Goods'; }
          else if (rawCat.includes('rent')) { dept = 'Occupancy'; cat = 'Rent/Mortgage'; }
          else if (rawCat.includes('gas') || rawCat.includes('electric') || rawCat.includes('utility')) { dept = 'Occupancy'; cat = 'Utilities'; }
          else if (rawCat.includes('wage') || rawCat.includes('salary') || rawCat.includes('sub contractor')) { dept = 'Labor'; cat = 'Wages & Salaries'; }
          else if (rawCat.includes('staff') || rawCat.includes('wellness') || rawCat.includes('welfare') || rawCat.includes('transport')) { dept = 'Labor'; cat = 'Employee Benefits'; }
          else if (rawCat.includes('maintenance') || rawCat.includes('repair')) { dept = 'Repair and Maintenance'; cat = 'Repairs & Maintenance'; }
          else if (rawCat.includes('cleaning') || rawCat.includes('sanitation')) { dept = 'Cleaning'; cat = 'Cleaning & Sanitation'; }
          else if (rawCat.includes('asset') || rawCat.includes('equipment') || rawCat.includes('capex')) { dept = 'CAPEX'; cat = 'Equipment'; }
          else if (rawCat.includes('marketing') || rawCat.includes('ads') || rawCat.includes('entertainment')) { dept = 'Direct Operating'; cat = 'Marketing & Advertising'; }
          else if (rawCat.includes('tech') || rawCat.includes('software') || rawCat.includes('pos')) { dept = 'Direct Operating'; cat = 'Technology'; }
          else if (rawCat.includes('admin') || rawCat.includes('stationery') || rawCat.includes('office')) { dept = 'G&A'; cat = 'Office Supplies'; }
          else if (rawCat.includes('bank') || rawCat.includes('fee')) { dept = 'G&A'; cat = 'Bank Fees'; }
          else if (rawCat.includes('professional') || rawCat.includes('legal') || rawCat.includes('audit') || rawCat.includes('licenses')) { dept = 'G&A'; cat = 'Professional Fees'; }
          else if (rawCat.includes('security')) { dept = 'Direct Operating'; cat = 'Other'; }

          newTransactions.push({
            id: crypto.randomUUID(),
            date: iso,
            type: 'EXPENSE',
            department: dept,
            category: cat,
            amount,
            entity,
            description: parts[categoryIdx] || 'Imported Expense',
            paymentMethod: 'EFT',
            month
          });
        } catch (err) { console.error("Parse Error at Line " + i, err); }
      }
      onClear?.('ALL', 'WAGES');
      onAdd(newTransactions);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const downloadExpenditureTemplate = () => {
    const headers = ['Date & Time', 'Invoice No', 'Transaction Type', 'Supplier', 'Debit', 'Credit', 'Category'];
    const exampleRows = [
      ['04/12/2025', 'NOV', 'Expense Invoice', 'AE - Acorn Estates', 'R 0.00', 'R 14000.00', 'Rent'],
      ['23/10/2025', '176', 'Supplier Invoice', 'AR - Arabella Wines', 'R 0.00', 'R 3272.67', 'Bev COGS'],
      ['30/09/2025', '158', 'Supplier Invoice', 'BW - Bidfoods', 'R 0.00', 'R 1671.80', 'Food COGS']
    ];
    const csvContent = [headers, ...exampleRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Expenditure_Import_Template.csv");
    link.click();
  };

  const handleWagesCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const newTransactions: Transaction[] = [];
      const headerRow = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));
      
      const empIdx = headerRow.findIndex(h => h.includes('employee') || h.includes('name'));
      const payIdx = headerRow.findIndex(h => h.includes('pay') || h.includes('total') || h.includes('amount'));

      const targetMonth = filterMonth === 'ALL' ? new Date().toISOString().substring(0, 7) : filterMonth;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = splitCsvLine(line);
        
        const employee = empIdx !== -1 ? parts[empIdx].replace(/"/g, '') : parts[0];
        const rawAmount = payIdx !== -1 ? parts[payIdx] : parts[1];
        const amount = parseFloat(rawAmount.replace(/[^\d.-]/g, '')) || 0;

        if (amount > 0) {
          newTransactions.push({
            id: crypto.randomUUID(),
            date: `${targetMonth}-25`, // Default to 25th for wages
            type: 'EXPENSE',
            department: 'WAGES',
            category: 'Wages & Salaries',
            amount,
            entity: employee,
            description: `Monthly Wages - ${targetMonth}`,
            paymentMethod: 'EFT',
            month: targetMonth
          });
        }
      }
      onClear?.('ALL', undefined, 'WAGES');
      onAdd(newTransactions);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const downloadWagesTemplate = () => {
    const headers = ['Employee', 'Total Pay'];
    const exampleRows = [
      ['Angeline Viljoen', '55924.18'],
      ['Faith Juries Juries', '37003.35']
    ];
    const csvContent = [headers, ...exampleRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Wages_Import_Template.csv");
    link.click();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const newTransactions: Transaction[] = [];
      const headerRow = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));
      
      // Detect Wages Format (Employee, Total Pay)
      const isWagesFormat = headerRow.includes('employee') && (headerRow.includes('total pay') || headerRow.includes('pay'));
      
      if (isWagesFormat && forcedType === 'EXPENSE') {
        // Reuse the logic from handleWagesCsvUpload but inline for the generic upload
        const empIdx = headerRow.findIndex(h => h.includes('employee'));
        const payIdx = headerRow.findIndex(h => h.includes('pay'));
        const targetMonth = filterMonth === 'ALL' ? new Date().toISOString().substring(0, 7) : filterMonth;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = splitCsvLine(line);
          const employee = parts[empIdx].replace(/"/g, '');
          const amount = parseFloat(parts[payIdx].replace(/[^\d.-]/g, '')) || 0;
          if (amount > 0) {
            newTransactions.push({
              id: crypto.randomUUID(), date: `${targetMonth}-25`, type: 'EXPENSE', department: 'WAGES',
              category: 'Wages & Salaries', amount, entity: employee, description: `Monthly Wages - ${targetMonth}`,
              paymentMethod: 'EFT', month: targetMonth
            });
          }
        }
      } else {
        // Detect Pivot Format (User, Month1, Month2...)
        const isPivotFormat = headerRow[0].includes('user') && headerRow.some(h => /^\d{4}-\d{2}$/.test(h));

        if (isPivotFormat && forcedType === 'INCOME') {
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = splitCsvLine(line);
            const entityName = parts[0].replace(/"/g, '');
            
            for (let j = 1; j < headerRow.length; j++) {
              const month = headerRow[j];
              if (!/^\d{4}-\d{2}$/.test(month)) continue;
              
              const rawAmount = parts[j] || '0';
              const amount = parseFloat(rawAmount.replace(/[^\d.-]/g, '')) || 0;
              
              if (amount > 0) {
                newTransactions.push({
                  id: crypto.randomUUID(),
                  date: `${month}-01`,
                  type: 'INCOME',
                  department: 'REVENUE',
                  category: 'Account Sales',
                  amount,
                  entity: entityName,
                  description: `Imported from monthly summary (${month})`,
                  paymentMethod: 'EFT',
                  month: month
                });
              }
            }
          }
        } else {
          const findIdx = (keywords: string[]) => headerRow.findIndex(h => keywords.some(k => h.includes(k)));
          
          const dateIdx = findIdx(['date', 'timestamp', 'created']);
          const txTypeIdx = findIdx(['transaction type', 'type', 'category', 'dept']);
          const amountIdx = findIdx(['amount', 'total', 'price', 'value', 'incl']);
          const descIdx = findIdx(['description', 'note', 'memo', 'reference']);
          const sourceIdx = findIdx(['source', 'entity', 'vendor', 'supplier']);

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = splitCsvLine(line);
            try {
              const rawDate = dateIdx !== -1 ? parts[dateIdx] : parts[0];
              const { iso, month } = normalizeDate(rawDate);

              if (forcedType === 'INCOME') {
                let entityName = 'POS System';
                if (txTypeIdx !== -1 && parts[txTypeIdx]) {
                  entityName = parts[txTypeIdx].trim();
                } else if (sourceIdx !== -1 && parts[sourceIdx]) {
                  entityName = parts[sourceIdx].trim();
                }
                const amount = amountIdx !== -1 ? parseFloat(parts[amountIdx].replace(/[^\d.-]/g, '')) || 0 : 0;
                const desc = descIdx !== -1 ? parts[descIdx] || '' : '';
                const { cat, method } = smartAnalyzeRevenue(desc, entityName);
                newTransactions.push({
                  id: crypto.randomUUID(), date: iso, type: 'INCOME', department: 'REVENUE',
                  category: cat, amount, entity: entityName, description: desc, paymentMethod: method, month: month
                });
              } else {
                const amount = amountIdx !== -1 ? Math.abs(parseFloat(parts[amountIdx].replace(/[^\d.-]/g, '')) || 0) : 0;
                const entity = sourceIdx !== -1 ? parts[sourceIdx] || 'Supplier' : (parts[1] || 'Supplier');
                const desc = descIdx !== -1 ? parts[descIdx] || '' : '';
                const txTypeStr = txTypeIdx !== -1 ? (parts[txTypeIdx] || '') : '';
                const { dept, cat } = smartAnalyzeExpense(desc, entity, txTypeStr);
                newTransactions.push({
                  id: crypto.randomUUID(), date: iso, type: 'EXPENSE', department: dept,
                  category: cat, amount, entity, description: desc, paymentMethod: 'EFT', month: month
                });
              }
            } catch (err) { console.error("Parse Error at Line " + i, err); }
          }
        }
      }
      if (forcedType === 'EXPENSE') {
        // If it's a generic expense upload, we should probably clear non-wages only
        // or just clear everything if it's a full ledger. 
        // Given the user's request, let's assume "Expenditure Import" refers to the non-wages one.
        onClear?.('ALL', 'WAGES');
      }
      onAdd(newTransactions);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const downloadIncomeTemplate = () => {
    const headers = ['User', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
    const exampleRows = [
      ['Charlotte Less', 'R 2890.00', 'R 0.00', 'R 40.00', 'R 140.00', 'R 2150.00'],
      ['Faith du Plessis', 'R 66068.00', 'R 52525.00', 'R 31005.00', 'R 52069.00', 'R 62028.00']
    ];
    const csvContent = [headers, ...exampleRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Income_Pivot_Template.csv");
    link.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.entity) return;
    let dept: Department | 'REVENUE' = formData.department;
    for (const [d, cats] of Object.entries(DEPT_CATEGORIES)) {
      if ((cats as string[]).includes(formData.category)) {
        dept = d as Department | 'REVENUE';
        break;
      }
    }
    const newTransaction: Transaction = {
      ...formData,
      department: dept,
      id: crypto.randomUUID(),
      month: formData.date.substring(0, 7)
    };
    onAdd([newTransaction]);
    setIsModalOpen(false);
    setFormData(prev => ({ ...prev, amount: 0, entity: '', description: '' }));
  };

  const renderEditControl = (t: Transaction, field: keyof Transaction) => {
    if (field === 'department') {
      return (
        <select
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="w-full p-1 bg-white border border-indigo-400 rounded shadow-sm text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      );
    }
    if (field === 'category') {
      return (
        <select
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="w-full p-1 bg-white border border-indigo-400 rounded shadow-sm text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      );
    }
    if (field === 'paymentMethod') {
      return (
        <select
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="w-full p-1 bg-white border border-indigo-400 rounded shadow-sm text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      );
    }
    return (
      <input
        ref={inputRef as any}
        type={field === 'amount' ? 'number' : field === 'date' ? 'date' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(field === 'amount' ? parseFloat(e.target.value) : e.target.value)}
        onBlur={saveEdit}
        onKeyDown={handleKeyDown}
        className="w-full p-1 bg-white border border-indigo-400 rounded shadow-sm text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
      />
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {forcedType === 'INCOME' ? <TrendingUp className="text-emerald-500" size={24} /> : <TrendingDown className="text-rose-500" size={24} />}
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
            {forcedType === 'INCOME' ? 'Revenue & Income' : 'Unified Expenditure Management'}
          </h2>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search entries...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Filter Month:</span>
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="ALL">Full Cycle (All)</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {forcedType === 'INCOME' ? (
            <button 
              onClick={downloadIncomeTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all text-sm font-black uppercase shadow-sm"
            >
              <FileSpreadsheet size={16} />
              <span>Template</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button 
                onClick={downloadExpenditureTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-rose-700 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-black uppercase shadow-sm"
              >
                <FileSpreadsheet size={16} />
                <span>Exp Template</span>
              </button>
              <button 
                onClick={downloadWagesTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-rose-700 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-black uppercase shadow-sm"
              >
                <FileSpreadsheet size={16} />
                <span>Wages Template</span>
              </button>
            </div>
          )}
          <label className={`flex items-center space-x-2 px-4 py-2 border rounded-xl cursor-pointer transition-all text-sm font-black uppercase shadow-sm ${
            forcedType === 'INCOME' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
          }`}>
            <Upload size={16} />
            <span>{forcedType === 'INCOME' ? 'Smart Import' : 'Expenditure Import'}</span>
            <input type="file" accept=".csv" className="hidden" onChange={forcedType === 'INCOME' ? handleCsvUpload : handleExpenditureCsvUpload} />
          </label>
          {forcedType === 'EXPENSE' && (
            <label className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl cursor-pointer hover:bg-rose-100 transition-all text-sm font-black uppercase shadow-sm">
              <Upload size={16} />
              <span>Wages Import</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleWagesCsvUpload} />
            </label>
          )}
          <button 
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all text-sm font-black uppercase shadow-sm"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          
          <div className="flex items-center space-x-1 ml-2">
            {filterMonth !== 'ALL' && (
              <button 
                onClick={handleClearMonth}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-black uppercase shadow-sm group"
                title={`Clear all entries for ${filterMonth}`}
              >
                <CalendarX size={16} className="group-hover:scale-110 transition-transform" />
                <span>Clear {filterMonth.split('-')[1]}</span>
              </button>
            )}
            <button 
              onClick={handleClearAll}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all text-sm font-black uppercase shadow-sm group"
              title="Clear all manual entries across all months"
            >
              <Eraser size={16} />
              <span>Reset All</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center space-x-2 px-4 py-2 text-white rounded-xl font-black uppercase text-sm shadow-md transition-all active:scale-95 ${
                forcedType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-black'
              }`}
            >
              <Plus size={16} />
              <span>Add Entry</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-[9px] font-black text-indigo-700 uppercase tracking-widest flex items-center space-x-2">
           <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
           <span>Forensic Ledger: Double-click any cell to edit. Manual entries can be cleared via "Clear Month" or "Reset All".</span>
        </div>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity / Source</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (ZAR)</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group animate-fadeIn">
                <td 
                  className="px-6 py-4 text-xs text-slate-500 font-bold cursor-pointer"
                  onDoubleClick={() => startEdit(t, 'date')}
                >
                  {editCell?.id === t.id && editCell.field === 'date' 
                    ? renderEditControl(t, 'date') 
                    : t.date}
                </td>
                <td 
                  className="px-6 py-4 cursor-pointer"
                  onDoubleClick={() => startEdit(t, 'entity')}
                >
                  {editCell?.id === t.id && editCell.field === 'entity' ? (
                    renderEditControl(t, 'entity')
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-slate-900 leading-none">{t.entity}</span>
                        {t.id.startsWith('auto-') && (
                          <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-tighter">
                            <RefreshCw size={8} />
                            <span>Recurring</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[250px] mt-1">{t.description}</span>
                    </div>
                  )}
                </td>
                <td 
                  className="px-6 py-4 cursor-pointer"
                  onDoubleClick={() => startEdit(t, 'category')}
                >
                  {editCell?.id === t.id && editCell.field === 'category' ? (
                    renderEditControl(t, 'category')
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-tighter bg-slate-50 text-slate-600">
                      {t.category}
                    </span>
                  )}
                </td>
                <td 
                  className="px-6 py-4 cursor-pointer"
                  onDoubleClick={() => startEdit(t, 'department')}
                >
                  {editCell?.id === t.id && editCell.field === 'department' ? (
                    renderEditControl(t, 'department')
                  ) : (
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      t.department === 'Labor' ? 'text-indigo-600' :
                      t.department === 'Occupancy' ? 'text-amber-600' :
                      (t.department === 'COGS Food' || t.department === 'COGS Bev') ? 'text-rose-600' :
                      t.department === 'Repair and Maintenance' ? 'text-orange-600' :
                      t.department === 'Cleaning' ? 'text-cyan-600' :
                      'text-slate-400'
                    }`}>
                      {t.department}
                    </span>
                  )}
                </td>
                <td 
                  className="px-6 py-4 text-[10px] text-slate-400 font-black uppercase cursor-pointer"
                  onDoubleClick={() => startEdit(t, 'paymentMethod')}
                >
                  {editCell?.id === t.id && editCell.field === 'paymentMethod' 
                    ? renderEditControl(t, 'paymentMethod') 
                    : t.paymentMethod}
                </td>
                <td 
                  className={`px-6 py-4 text-sm font-black text-right cursor-pointer ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}`}
                  onDoubleClick={() => startEdit(t, 'amount')}
                >
                  {editCell?.id === t.id && editCell.field === 'amount' ? (
                    renderEditControl(t, 'amount')
                  ) : (
                    `${t.type === 'INCOME' ? '+' : '-'} R${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {!t.id.startsWith('auto-') && (
                    <button onClick={() => onDelete(t.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 uppercase">Manual Entry</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Recording to Ledger</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Date</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Category</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" 
                    value={formData.category} 
                    onChange={e => {
                      const newCat = e.target.value as Category;
                      let newDept: Department | 'REVENUE' = formData.department;
                      for (const [d, cats] of Object.entries(DEPT_CATEGORIES)) {
                        if ((cats as string[]).includes(newCat)) {
                          newDept = d as Department | 'REVENUE';
                          break;
                        }
                      }
                      setFormData({...formData, category: newCat, department: newDept});
                    }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Amount (ZAR)</label>
                  <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Method</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Entity (Vendor / Employee / Source)</label>
                <input type="text" placeholder="e.g. SAB, Kitchen Wages, Unit 5" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.entity} onChange={e => setFormData({...formData, entity: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Reference / Notes</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium h-20 resize-none" placeholder="Reference details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button type="submit" className={`w-full py-4 text-white rounded-xl font-black uppercase text-sm shadow-xl ${
                forcedType === 'INCOME' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-slate-900 shadow-slate-100'
              }`}>Record Entry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;
