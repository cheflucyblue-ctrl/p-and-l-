
export type TransactionType = 'INCOME' | 'EXPENSE';

export type Department = 
  | 'COGS Food'
  | 'COGS Bev'
  | 'Labor'
  | 'WAGES'
  | 'Occupancy'
  | 'Direct Operating'
  | 'Repair and Maintenance'
  | 'Cleaning'
  | 'G&A'
  | 'CAPEX';

export type Category = 
  // Income
  | 'POS Cash' | 'POS Card' | 'Account Sales' | 'Tenant Income'
  // COGS
  | 'Food Costs' | 'Beverage Costs' | 'Paper Goods'
  // Labor
  | 'Wages & Salaries' | 'Payroll Taxes' | 'Employee Benefits' | 'Workers Comp'
  // Occupancy
  | 'Rent/Mortgage' | 'Property Taxes' | 'Utilities' | 'CAM'
  // Direct Operating
  | 'Marketing & Advertising' | 'Technology' | 'Repairs & Maintenance' | 'Licenses & Permits' | 'Insurance' | 'Cleaning & Sanitation'
  // G&A
  | 'Professional Fees' | 'Bank Fees' | 'Office Supplies'
  // CAPEX
  | 'Equipment' | 'Renovations'
  // Other
  | 'Other';

export type PaymentMethod = 'CASH' | 'CARD' | 'EFT' | 'ACCOUNT' | 'PETTY_CASH';

export interface Transaction {
  id: string;
  date: string; 
  type: TransactionType;
  department: Department | 'REVENUE';
  category: Category;
  amount: number;
  description: string;
  entity: string; 
  paymentMethod: PaymentMethod;
  month: string; 
}

export interface LoanAccount {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  startDate: string;
  balance: number;
  history: { 
    date: string; 
    amount: number; 
    type: 'PAYMENT' | 'INTEREST_ACCRUAL';
    description?: string;
  }[];
}

export interface InventoryItem {
  id: string;
  product: string;
  unitOfMeasure: string;
  stockOnHand: number;
  cost: number;
  totalValue: number;
  type: 'STOCK' | 'ASSET';
  lastUpdated: string;
}

export type AppView = 'DASHBOARD' | 'INCOME' | 'EXPENDITURE' | 'LOANS' | 'SUPPLIERS' | 'INCOME_SUMMARY' | 'PL_STATEMENT' | 'INVENTORY';
