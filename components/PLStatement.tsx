
import React, { useState, useMemo } from 'react';
import { Transaction, LoanAccount, Department, Category } from '../types';
import { MONTHS, DEPT_CATEGORIES, DEPARTMENTS } from '../constants';
import { FileText, Download, TrendingUp, TrendingDown, Info, ShieldCheck, AlertTriangle, FileDown, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Props {
  transactions: Transaction[];
  loans: LoanAccount[];
}

const PLStatement: React.FC<Props> = ({ transactions, loans }) => {
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  const plData = useMemo(() => {
    const filteredTx = transactions.filter(t => selectedMonth === 'ALL' || t.month === selectedMonth);
    
    // Revenue Analysis
    const revenue = DEPT_CATEGORIES.REVENUE.reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0);

    // COGS Analysis
    const cogsFood = DEPT_CATEGORIES['COGS Food'].reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalCogsFood = Object.values(cogsFood).reduce((a, b) => a + b, 0);

    const cogsBev = DEPT_CATEGORIES['COGS Bev'].reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalCogsBev = Object.values(cogsBev).reduce((a, b) => a + b, 0);

    const totalCOGS = totalCogsFood + totalCogsBev;
    const grossProfit = totalRevenue - totalCOGS;

    // Operating Expenses
    const laborCategories = [...DEPT_CATEGORIES.Labor, ...DEPT_CATEGORIES.WAGES];
    const labor = laborCategories.reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalLabor = Object.values(labor).reduce((a, b) => a + b, 0);

    const occupancy = DEPT_CATEGORIES.Occupancy.reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalOccupancy = Object.values(occupancy).reduce((a, b) => a + b, 0);

    const directOp = DEPT_CATEGORIES['Direct Operating'].reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalDirectOp = Object.values(directOp).reduce((a, b) => a + b, 0);

    // FIX: Using bracket notation to access 'G&A' property safely
    const ga = DEPT_CATEGORIES['G&A'].reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalGA = Object.values(ga).reduce((a, b) => a + b, 0);

    const repairMaint = DEPT_CATEGORIES['Repair and Maintenance'].reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalRepairMaint = Object.values(repairMaint).reduce((a, b) => a + b, 0);

    const cleaning = DEPT_CATEGORIES.Cleaning.reduce((acc, cat) => {
      acc[cat] = filteredTx.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      return acc;
    }, {} as Record<Category, number>);
    const totalCleaning = Object.values(cleaning).reduce((a, b) => a + b, 0);

    const totalOpEx = totalLabor + totalOccupancy + totalDirectOp + totalGA + totalRepairMaint + totalCleaning;
    const ebitda = grossProfit - totalOpEx;

    // Interest Expense (Extracted from Loans)
    const totalInterest = loans.reduce((sum, loan) => {
      return sum + loan.history
        .filter(h => h.type === 'INTEREST_ACCRUAL' && (selectedMonth === 'ALL' || h.date.substring(0, 7) === selectedMonth))
        .reduce((s, h) => s + h.amount, 0);
    }, 0);

    const netIncome = ebitda - totalInterest;

    return {
      revenue, totalRevenue,
      cogsFood, totalCogsFood,
      cogsBev, totalCogsBev,
      totalCOGS, grossProfit,
      labor, totalLabor,
      occupancy, totalOccupancy,
      directOp, totalDirectOp,
      ga, totalGA,
      repairMaint, totalRepairMaint,
      cleaning, totalCleaning,
      totalOpEx, ebitda, totalInterest, netIncome
    };
  }, [transactions, loans, selectedMonth]);

  const forensicAnalysis = useMemo(() => {
    const { totalRevenue, totalCOGS, totalLabor, totalOccupancy, netIncome } = plData;
    if (totalRevenue === 0) return { health: 'Insufficient Data', notes: ['Add income data to generate forensic analysis.'], score: 0 };

    const cogsPct = (totalCOGS / totalRevenue) * 100;
    const laborPct = (totalLabor / totalRevenue) * 100;
    const primeCostPct = cogsPct + laborPct;
    const rentPct = (totalOccupancy / totalRevenue) * 100;
    const netPct = (netIncome / totalRevenue) * 100;

    const notes = [];
    let score = 100;

    if (primeCostPct > 65) {
      notes.push(`CRITICAL: Prime Cost is ${primeCostPct.toFixed(1)}%. Industry standard is <60%. COGS or Labor is severely mismanaged.`);
      score -= 30;
    } else if (primeCostPct > 60) {
      notes.push(`WARNING: Prime Cost at ${primeCostPct.toFixed(1)}% is slightly high. Target 55-60%.`);
      score -= 10;
    } else {
      notes.push(`EXCELLENT: Prime Cost at ${primeCostPct.toFixed(1)}% indicates strong operational control.`);
    }

    if (rentPct > 12) {
      notes.push(`Occupancy costs are high at ${rentPct.toFixed(1)}% of sales. Standard is 6-10%.`);
      score -= 15;
    }

    if (netPct < 5 && netPct > 0) {
      notes.push(`Net Margin is thin (${netPct.toFixed(1)}%). Look into Direct Operating expenses.`);
      score -= 10;
    } else if (netPct <= 0) {
      notes.push(`ALERT: The operation is currently UNPROFITABLE. Net Burn: R${Math.abs(netIncome).toLocaleString()}.`);
      score -= 50;
    }

    return { 
      health: score > 70 ? 'Healthy' : score > 40 ? 'Action Required' : 'Critical Risk',
      notes, 
      score: Math.max(0, score) 
    };
  }, [plData]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const period = selectedMonth === 'ALL' ? 'Consolidated YTD 2025' : selectedMonth;
    
    doc.setFontSize(22);
    doc.text('Rawdons Profit and loss', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(`Forensic Profit & Loss Statement`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Period: ${period} | Generated: ${new Date().toLocaleString()}`, 14, 34);

    const tableData = [
      [{ content: 'REVENUE', colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
      ...Object.entries(plData.revenue).map(([k, v]) => [k, `R${v.toLocaleString()}`]),
      [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold' } }, { content: `R${plData.totalRevenue.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      
      [{ content: 'COST OF GOODS SOLD (COGS)', colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
      ['COGS - Food & Paper', `R${plData.totalCogsFood.toLocaleString()}`],
      ['COGS - Beverage', `R${plData.totalCogsBev.toLocaleString()}`],
      [{ content: 'TOTAL COGS', styles: { fontStyle: 'bold' } }, { content: `R${plData.totalCOGS.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      
      [{ content: 'GROSS PROFIT', styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' } }, 
       { content: `R${plData.grossProfit.toLocaleString()}`, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' } }],
      
      [{ content: 'OPERATING EXPENSES', colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
      ['Labor Costs', `R${plData.totalLabor.toLocaleString()}`],
      ['Occupancy Costs', `R${plData.totalOccupancy.toLocaleString()}`],
      ['Repair & Maintenance', `R${plData.totalRepairMaint.toLocaleString()}`],
      ['Cleaning Costs', `R${plData.totalCleaning.toLocaleString()}`],
      ['Direct Operating', `R${plData.totalDirectOp.toLocaleString()}`],
      ['G&A Expenses', `R${plData.totalGA.toLocaleString()}`],
      [{ content: 'TOTAL OPEX', styles: { fontStyle: 'bold' } }, { content: `R${plData.totalOpEx.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      
      [{ content: 'EBITDA', styles: { fontStyle: 'bold' } }, { content: `R${plData.ebitda.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      ['Interest Expense', `R${plData.totalInterest.toLocaleString()}`],
      [{ content: 'NET INCOME', styles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' } }, 
       { content: `R${plData.netIncome.toLocaleString()}`, styles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' } }],
    ];

    (doc as any).autoTable({
      startY: 40,
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Forensic Audit Analysis', 14, finalY);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    
    let currentY = finalY + 8;
    forensicAnalysis.notes.forEach(note => {
      const splitText = doc.splitTextToSize(`• ${note}`, 180);
      doc.text(splitText, 14, currentY);
      currentY += (splitText.length * 5);
    });

    doc.save(`PL_Statement_Forensic_${period}.pdf`);
  };

  const Row = ({ label, value, isBold = false, isIndent = false, colorClass = "text-slate-900" }: any) => (
    <div className={`flex justify-between py-2 border-b border-slate-50 ${isIndent ? 'pl-8' : ''}`}>
      <span className={`${isBold ? 'font-black uppercase tracking-tight' : 'font-medium'} text-sm text-slate-600`}>{label}</span>
      <span className={`${isBold ? 'font-black' : 'font-bold'} text-sm ${colorClass}`}>R{value.toLocaleString()}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8">
           <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl flex items-center space-x-2">
              <ShieldCheck size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Forensic Authenticated</span>
           </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Profit & Loss Statement</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1 text-sm font-bold outline-none"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="ALL">Year to Date (YTD)</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button 
                onClick={exportToPDF}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2"
              >
                <FileDown size={14} />
                <span>Export Audit PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[24px] p-6 text-white min-w-[280px] shadow-2xl">
             <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Surplus/Loss</p>
                {plData.netIncome >= 0 ? <TrendingUp className="text-emerald-400" size={16} /> : <TrendingDown className="text-rose-400" size={16} />}
             </div>
             <p className={`text-4xl font-black ${plData.netIncome >= 0 ? 'text-white' : 'text-rose-400'}`}>
                R{plData.netIncome.toLocaleString()}
             </p>
             <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Health Index</p>
                <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  forensicAnalysis.score > 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {forensicAnalysis.health}
                </p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN: THE LEDGER */}
          <div className="space-y-4">
            <div className="bg-slate-50/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">I. Operating Revenue</h3>
              {Object.entries(plData.revenue).map(([cat, val]) => (
                <Row key={cat} label={cat} value={val} isIndent colorClass="text-emerald-600" />
              ))}
              <div className="pt-2">
                <Row label="Total Revenue" value={plData.totalRevenue} isBold colorClass="text-emerald-600" />
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">II. Variable Costs (COGS)</h3>
              <Row label="COGS - Food & Paper" value={plData.totalCogsFood} isIndent colorClass="text-rose-600" />
              <Row label="COGS - Beverage" value={plData.totalCogsBev} isIndent colorClass="text-rose-600" />
              <div className="pt-2">
                <Row label="Total COGS" value={plData.totalCOGS} isBold colorClass="text-rose-600" />
              </div>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl flex justify-between items-center">
               <span className="text-sm font-black uppercase tracking-widest">Gross Profit Margin</span>
               <div className="text-right">
                 <p className="text-2xl font-black">R{plData.grossProfit.toLocaleString()}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {plData.totalRevenue > 0 ? ((plData.grossProfit / plData.totalRevenue) * 100).toFixed(1) : 0}% Yield
                 </p>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: OPEX & NET */}
          <div className="space-y-4">
            <div className="bg-slate-50/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">III. Fixed & Operating Expenses</h3>
              <Row label="Total Labor Costs" value={plData.totalLabor} />
              <Row label="Occupancy & Rent" value={plData.totalOccupancy} />
              <Row label="Repair & Maintenance" value={plData.totalRepairMaint} />
              <Row label="Cleaning Costs" value={plData.totalCleaning} />
              <Row label="Direct Operating" value={plData.totalDirectOp} />
              <Row label="G&A / Banking Fees" value={plData.totalGA} />
              <div className="pt-2">
                <Row label="Total Operating Expenses" value={plData.totalOpEx} isBold />
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">IV. Non-Operating Components</h3>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-black uppercase text-slate-500">EBITDA Surplus</span>
                <span className="text-sm font-black">R{plData.ebitda.toLocaleString()}</span>
              </div>
              <Row label="Total Debt Interest" value={plData.totalInterest} colorClass="text-rose-500" />
              <div className="pt-4 mt-2">
                <div className="bg-indigo-600 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                   <span className="text-xs font-black uppercase tracking-widest">Final Audit Net Income</span>
                   <span className="text-xl font-black">R{plData.netIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* AI ANALYSIS SECTION */}
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
               <div className="flex items-center space-x-2 text-amber-800">
                  <AlertTriangle size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Forensic Analysis Report</h3>
               </div>
               <div className="space-y-2">
                  {forensicAnalysis.notes.map((note, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                       <div className="w-1 h-1 bg-amber-400 rounded-full mt-1.5 shrink-0"></div>
                       <p className="text-[11px] font-bold text-amber-900 uppercase leading-tight tracking-tight">
                          {note}
                       </p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Prime Cost %" value={plData.totalRevenue > 0 ? (((plData.totalCOGS + plData.totalLabor) / plData.totalRevenue) * 100).toFixed(1) + '%' : '0%'} target="Target: <60%" />
        <MetricCard label="Labor Efficiency" value={plData.totalRevenue > 0 ? ((plData.totalLabor / plData.totalRevenue) * 100).toFixed(1) + '%' : '0%'} target="Target: <30%" />
        <MetricCard label="Net Profit Margin" value={plData.totalRevenue > 0 ? ((plData.netIncome / plData.totalRevenue) * 100).toFixed(1) + '%' : '0%'} target="Target: >15%" />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, target }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">{target}</p>
  </div>
);

export default PLStatement;
