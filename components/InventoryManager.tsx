
import React, { useState, useRef } from 'react';
import { InventoryItem } from '../types';
import { Upload, Download, Search, Trash2, Package, HardDrive, Filter, FileSpreadsheet, Plus, CheckCircle2 } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  onUpdate: (items: InventoryItem[]) => void;
  onClear: () => void;
}

const InventoryManager: React.FC<Props> = ({ inventory, onUpdate, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'STOCK' | 'ASSET'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = inventory.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.unitOfMeasure.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const stockValue = inventory.filter(i => i.type === 'STOCK').reduce((sum, item) => sum + item.totalValue, 0);
  const assetValue = inventory.filter(i => i.type === 'ASSET').reduce((sum, item) => sum + item.totalValue, 0);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const newItems: InventoryItem[] = [];
      const headers = lines[0].toLowerCase().split(',');
      
      // Helper to find index by keywords
      const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
      
      const productIdx = findIdx(['product', 'item', 'description', 'name']);
      const uomIdx = findIdx(['unit', 'uom', 'measure']);
      const stockIdx = findIdx(['stock', 'on hand', 'quantity', 'qty']);
      const costIdx = findIdx(['cost', 'price', 'unit cost']);
      const valueIdx = findIdx(['total value', 'value', 'total cost', 'total']);
      const typeIdx = findIdx(['type', 'category', 'class']);

      for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

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

        try {
          const product = productIdx !== -1 ? parts[productIdx] : parts[0];
          if (!product) continue;

          const unitOfMeasure = uomIdx !== -1 ? parts[uomIdx] : (parts[1] || 'each');
          const stockOnHand = stockIdx !== -1 ? parseFloat(parts[stockIdx].replace(/[^\d.-]/g, '')) || 0 : 0;
          const cost = costIdx !== -1 ? parseFloat(parts[costIdx].replace(/[^\d.-]/g, '')) || 0 : 0;
          const totalValue = valueIdx !== -1 ? parseFloat(parts[valueIdx].replace(/[^\d.-]/g, '')) || 0 : (stockOnHand * cost);
          
          let type: 'STOCK' | 'ASSET' = 'STOCK';
          if (typeIdx !== -1 && parts[typeIdx]) {
            const val = parts[typeIdx].toUpperCase();
            if (val.includes('ASSET') || val.includes('EQUIPMENT') || val.includes('FIXED')) {
              type = 'ASSET';
            }
          } else {
            // Heuristic if no type column
            const p = product.toLowerCase();
            if (p.includes('fridge') || p.includes('machine') || p.includes('bench') || p.includes('table') || p.includes('oven') || p.includes('computer')) {
              type = 'ASSET';
            }
          }

          newItems.push({
            id: crypto.randomUUID(),
            product,
            unitOfMeasure,
            stockOnHand,
            cost,
            totalValue,
            type,
            lastUpdated: new Date().toISOString().split('T')[0]
          });
        } catch (err) {
          console.error(`Error parsing line ${i}:`, err);
        }
      }

      onUpdate(newItems);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = ['Product', 'Type (STOCK or ASSET)', 'Unit of Measure', 'Stock On Hand', 'Cost (R)', 'Total Value (R)'];
    const exampleRows = [
      ['"100s and 1000s - 319"', 'STOCK', 'kg', '10', '45.00', '450.00'],
      ['"Bag Refuse Clear - 886"', 'STOCK', 'each', '100', '2.00', '200.00'],
      ['"Coffee Grinder Italian - 1011"', 'ASSET', 'each', '1', '8500.00', '8500.00'],
      ['"Fridge Underbar 3.5 Glass Door - 1027"', 'ASSET', 'each', '2', '12500.00', '25000.00']
    ];
    const csvContent = [headers, ...exampleRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Rawdons_Inventory_Template.csv");
    link.click();
  };

  const exportToCSV = () => {
    const headers = ['Product', 'Type', 'Unit of Measure', 'Stock On Hand', 'Cost (R)', 'Total Value (R)'];
    const rows = inventory.map(item => [
      `"${item.product.replace(/"/g, '""')}"`,
      item.type,
      `"${item.unitOfMeasure.replace(/"/g, '""')}"`,
      item.stockOnHand,
      item.cost,
      item.totalValue
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Package className="text-indigo-400" size={28} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Inventory & Asset Audit</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Consolidated register for F&B Stock and Equipment Assets. Use a single CSV file to reconcile current holdings against the financial framework.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[140px] backdrop-blur-sm">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Stock Value</p>
              <p className="text-xl font-black">R{stockValue.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[140px] backdrop-blur-sm">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Asset Value</p>
              <p className="text-xl font-black">R{assetValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products or assets..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['ALL', 'STOCK', 'ASSET'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterType === t 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={downloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-sm font-black uppercase shadow-sm"
          >
            <FileSpreadsheet size={16} />
            <span>Template</span>
          </button>
          <label className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-700 transition-all text-sm font-black uppercase shadow-md active:scale-95">
            <Upload size={16} />
            <span>Import Audit CSV</span>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button 
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all text-sm font-black uppercase shadow-sm"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the entire inventory audit?')) {
                onClear();
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all text-sm font-black uppercase shadow-sm"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product / Asset</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">UOM</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stock On Hand</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Cost</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Value (R)</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${item.type === 'ASSET' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.type === 'ASSET' ? <HardDrive size={14} /> : <Package size={14} />}
                      </div>
                      <span className="text-sm font-black text-slate-900">{item.product}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                      item.type === 'ASSET' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-bold uppercase">{item.unitOfMeasure}</td>
                  <td className="px-6 py-4 text-sm font-black text-right text-slate-700">{item.stockOnHand.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-slate-400">R{item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-sm font-black text-right text-indigo-600">R{item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{item.lastUpdated}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-slate-50 rounded-full">
                      <FileSpreadsheet size={48} className="text-slate-200" />
                    </div>
                    <div>
                      <p className="text-slate-900 font-black uppercase tracking-tight">No Audit Data Found</p>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Import a CSV to populate the register</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryManager;
