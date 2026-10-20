// ============================================================
// RentLedger — Core Data Models (TypeScript)
// All amounts in paise (integer) internally to avoid float errors.
// Display layer converts to rupees via formatCurrency().
// ============================================================

export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'monthly_rent'
  | 'arrears_recovery'
  | 'security_deposit'
  | 'other_income'
  | string; // custom categories

export type ExpenseCategory =
  | 'repairs_maintenance'
  | 'property_tax'
  | 'utilities'
  | 'insurance'
  | 'brokerage'
  | 'legal_registration'
  | 'loan_interest'
  | 'other_expense'
  | string; // custom categories

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'neft' | 'rtgs' | 'other';

export type RentChargeStatus = 'upcoming' | 'due' | 'partially_paid' | 'paid' | 'overdue' | 'waived';

export interface Property {
  id: number;
  name: string;
  address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_name: string;   // e.g. "Shop 1", "Flat A"
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: number;
  unit_id: number;
  property_id: number;
  name: string;
  monthly_rent: number;        // paise
  rent_due_day: number;        // 1–28
  lease_start: string;         // ISO date YYYY-MM-DD
  lease_end?: string;
  security_deposit: number;    // paise — amount received
  security_deposit_refundable: boolean;
  opening_arrears: number;     // paise — balance before first recorded transaction
  opening_arrears_date?: string; // ISO date
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  date: string;                // ISO date YYYY-MM-DD
  property_id?: number;
  tenant_id?: number;
  type: TransactionType;
  category: string;
  amount: number;              // paise — always positive
  description: string;
  payment_method?: PaymentMethod;
  reference?: string;
  notes?: string;
  is_opening_balance: boolean; // flag for opening cash balance
  created_at: string;
  updated_at: string;
}

export interface RentCharge {
  id: number;
  tenant_id: number;
  property_id: number;
  period_year: number;
  period_month: number;        // 1–12
  due_date: string;            // ISO date
  amount_due: number;          // paise
  amount_paid: number;         // paise — sum of allocations
  status: RentChargeStatus;
  waived_amount: number;       // paise
  waived_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentPaymentAllocation {
  id: number;
  transaction_id: number;
  rent_charge_id: number;
  amount_allocated: number;    // paise
  created_at: string;
}

export interface SecurityDeposit {
  id: number;
  tenant_id: number;
  property_id: number;
  receipt_date: string;        // ISO date
  amount_received: number;     // paise
  amount_refunded: number;     // paise
  amount_retained: number;     // paise
  retained_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  type: TransactionType;
  name: string;
  is_system: boolean;          // system categories cannot be deleted
  created_at: string;
}

export interface Settings {
  key: string;
  value: string;
}

// ---- View / DTO types (computed, not stored) ----

export interface TenantLedgerSummary {
  tenant: Tenant;
  opening_arrears: number;
  total_rent_charged: number;
  total_paid: number;
  total_waived: number;
  current_arrears: number;
  last_payment_date?: string;
  overdue_charges: RentCharge[];
}

export interface DashboardStats {
  available_cash: number;
  monthly_rent_expected: number;
  rent_collected_month: number;
  arrears_collected_month: number;
  security_deposits_received_month: number;
  expenses_month: number;
  net_cash_flow_month: number;
  total_outstanding_arrears: number;
  total_refundable_deposits: number;
  overdue_tenants: TenantLedgerSummary[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  income_total: number;
  expense_total: number;
  rent_collected: number;
  arrears_collected: number;
  security_deposits: number;
  other_income: number;
  expenses_by_category: Record<string, number>;
  net_cash_flow: number;
  transactions: Transaction[];
}
