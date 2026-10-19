
import React from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Landmark, Factory, PieChart, FileText, Package } from 'lucide-react';
import { Category, PaymentMethod, Department } from './types';

// Updated to 2025 to match the user's current data cycle
export const MONTHS = ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

export const DEPARTMENTS: Department[] = ['COGS Food', 'COGS Bev', 'Labor', 'WAGES', 'Occupancy', 'Direct Operating', 'Repair and Maintenance', 'Cleaning', 'G&A', 'CAPEX'];

export const DEPT_CATEGORIES: Record<Department | 'REVENUE', Category[]> = {
  REVENUE: ['POS Cash', 'POS Card', 'Account Sales', 'Tenant Income'],
  'COGS Food': ['Food Costs', 'Paper Goods'],
  'COGS Bev': ['Beverage Costs'],
  Labor: ['Payroll Taxes', 'Employee Benefits', 'Workers Comp', 'Wages & Salaries'],
  WAGES: ['Wages & Salaries'],
  Occupancy: ['Rent/Mortgage', 'Property Taxes', 'Utilities', 'CAM'],
  'Direct Operating': ['Marketing & Advertising', 'Technology', 'Licenses & Permits', 'Insurance'],
  'Repair and Maintenance': ['Repairs & Maintenance'],
  Cleaning: ['Cleaning & Sanitation'],
  'G&A': ['Professional Fees', 'Bank Fees', 'Office Supplies'],
  CAPEX: ['Equipment', 'Renovations']
};

export const CATEGORIES: Category[] = Object.values(DEPT_CATEGORIES).flat();

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'EFT', 'ACCOUNT', 'PETTY_CASH'];

export const NAV_ITEMS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'INCOME', label: 'Income', icon: <TrendingUp size={20} className="text-emerald-500" /> },
  { id: 'INCOME_SUMMARY', label: 'Income Summary', icon: <PieChart size={20} className="text-emerald-600" /> },
  { id: 'EXPENDITURE', label: 'Expenditure', icon: <TrendingDown size={20} className="text-rose-500" /> },
  { id: 'SUPPLIERS', label: 'Expense Summary', icon: <Factory size={20} className="text-amber-500" /> },
  { id: 'LOANS', label: 'Loan Accounts', icon: <Landmark size={20} /> },
  { id: 'PL_STATEMENT', label: 'P&L Statement', icon: <FileText size={20} className="text-indigo-600" /> },
  { id: 'INVENTORY', label: 'Inventory & Assets', icon: <Package size={20} className="text-indigo-500" /> },
] as const;
