export interface Property {
  id: number;
  name: string;
  address: string;
  notes?: string;
  status?: 'active' | 'under_construction';
  unit_count?: number;
  tenant_count?: number;
  total_monthly_rent?: number;
  created_at: string;
}

export interface Tenant {
  id: number;
  property_id: number;
  unit_id?: number | null;
  name: string;
  monthly_rent: number; // in paise
  rent_due_day: number;
  lease_start: string;
  lease_end?: string | null;
  security_deposit: number; // in paise
  security_deposit_refundable: number;
  opening_arrears: number; // in paise
  opening_arrears_date?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  is_active: number;
  property_name?: string;
  unit_name?: string | null;
  arrears: number; // calculated in paise
  deposit_held?: number; // in paise
  created_at: string;
}

export interface RentCharge {
  id: number;
  tenant_id: number;
  property_id: number;
  tenant_name?: string;
  property_name?: string;
  period_year: number;
  period_month: number;
  due_date: string;
  amount_due: number; // in paise
  amount_paid: number; // in paise
  waived_amount: number; // in paise
  waived_reason?: string | null;
  status: 'due' | 'overdue' | 'partially_paid' | 'paid' | 'waived';
  created_at: string;
}

export interface Transaction {
  id: number;
  date: string;
  property_id?: number | null;
  tenant_id?: number | null;
  tenant_name?: string | null;
  property_name?: string | null;
  property_status?: 'active' | 'under_construction' | null;
  transaction_type: 'income' | 'expense';
  category: string;
  amount: number; // in paise
  description: string;
  vendor?: string | null;
  expense_type?: 'capex' | 'opex' | null;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  is_opening_balance?: number;
  created_at: string;
}

export interface ExpensesData {
  expenses: Transaction[];
  total_expenses: number;
  total_capex: number;
  total_opex: number;
  by_property: Array<{
    name: string;
    property_id: number | null;
    property_status?: string;
    total: number;
  }>;
  by_category: Array<{
    category: string;
    total: number;
    count: number;
  }>;
}

export interface SecurityDeposit {
  id: number;
  tenant_id: number;
  property_id: number;
  tenant_name: string;
  property_name: string;
  receipt_date: string;
  amount_received: number; // in paise
  amount_refunded: number; // in paise
  amount_retained: number; // in paise
  balance: number; // in paise
  refund_date?: string | null;
  status: string;
}

export interface DashboardData {
  available_cash: number;
  expected_rent: number;
  rent_collected: number;
  arrears_collected: number;
  security_deposits_received: number;
  total_expenses: number;
  net_cash_flow: number;
  total_outstanding_arrears: number;
  total_refundable_deposits: number;
  overdue_tenants: Array<{
    id: number;
    name: string;
    property_name?: string;
    monthly_rent: number;
    rent_due_day: number;
    arrears: number;
  }>;
}

export interface SettingsData {
  opening_cash_balance: string;
  auto_generate_charges: string;
  [key: string]: string;
}
