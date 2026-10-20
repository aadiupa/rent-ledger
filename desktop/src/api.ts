import { Property, Tenant, RentCharge, Transaction, SecurityDeposit, DashboardData, SettingsData, ExpensesData } from './types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.error) errorMsg = err.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<DashboardData>(`/dashboard${query}`);
  },

  // Properties
  getProperties: () => request<Property[]>('/properties'),
  createProperty: (data: { name: string; address: string; notes?: string; status?: 'active' | 'under_construction' }) =>
    request<{ id: number }>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteProperty: (id: number) =>
    request<{ success: boolean }>(`/properties/${id}`, {
      method: 'DELETE',
    }),

  // Tenants
  getTenants: () => request<Tenant[]>('/tenants'),
  getTenant: (id: number) =>
    request<Tenant & { charges: RentCharge[]; transactions: Transaction[] }>(`/tenants/${id}`),
  createTenant: (data: {
    property_id: number;
    unit_id?: number | null;
    name: string;
    monthly_rent: number;
    rent_due_day: number;
    lease_start: string;
    security_deposit?: number;
    opening_arrears?: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    notes?: string;
  }) =>
    request<{ id: number }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTenant: (
    id: number,
    data: {
      property_id?: number;
      unit_id?: number | null;
      monthly_rent?: number;
      rent_due_day?: number;
      security_deposit?: number;
      opening_arrears?: number;
      is_active?: boolean;
      notes?: string;
      contact_phone?: string;
      contact_email?: string;
    }
  ) =>
    request<{ success: boolean }>(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTenant: (id: number) =>
    request<{ success: boolean }>(`/tenants/${id}`, {
      method: 'DELETE',
    }),

  // Charges / Liabilities
  getCharges: () => request<RentCharge[]>('/charges'),
  generateCharges: () => request<{ count: number }>('/charges/generate', { method: 'POST' }),
  updateCharge: (id: number, data: { amount_due?: number; due_date?: string }) =>
    request<{ success: boolean }>(`/charges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  waiveCharge: (id: number, data: { waived_amount: number; waived_reason?: string }) =>
    request<{ success: boolean }>(`/charges/${id}/waive`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCharge: (id: number) =>
    request<{ success: boolean; count: number }>(`/charges/${id}`, {
      method: 'DELETE',
    }),
  bulkDeleteCharges: (ids: number[]) =>
    request<{ success: boolean; count: number }>('/charges/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Transactions & Expenses
  getTransactions: () => request<Transaction[]>('/transactions'),
  getExpenses: (propertyId?: number, expenseType?: 'capex' | 'opex') => {
    const params = new URLSearchParams();
    if (propertyId) params.set('property_id', String(propertyId));
    if (expenseType) params.set('expense_type', expenseType);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request<ExpensesData>(`/expenses${q}`);
  },
  createTransaction: (data: {
    date: string;
    property_id?: number | null;
    tenant_id?: number | null;
    transaction_type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    vendor?: string;
    expense_type?: 'capex' | 'opex';
    payment_method?: string;
    reference?: string;
  }) =>
    request<{ id: number }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: number) =>
    request<{ success: boolean; count: number }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
  bulkDeleteTransactions: (ids: number[]) =>
    request<{ success: boolean; count: number }>('/transactions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Security Deposits
  getDeposits: () => request<SecurityDeposit[]>('/deposits'),

  // Settings
  getSettings: () => request<SettingsData>('/settings'),
  updateSettings: (data: Partial<SettingsData>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
