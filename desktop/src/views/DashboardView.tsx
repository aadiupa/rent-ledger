import React from 'react';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Users,
  ChevronRight,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { DashboardData, Tenant, Transaction } from '../types';
import { formatINR, formatDate } from '../utils/format';

interface DashboardViewProps {
  data: DashboardData | null;
  tenants: Tenant[];
  transactions: Transaction[];
  onOpenRecordModal: (tenantId?: number) => void;
  onOpenEditTenant: (tenant: Tenant) => void;
  onNavigate: (view: any) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  tenants,
  transactions,
  onOpenRecordModal,
  onOpenEditTenant,
  onNavigate,
}) => {
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-gray-400">
        <div className="animate-pulse flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 animate-spin text-gray-500" />
          Loading financial data...
        </div>
      </div>
    );
  }

  const collectionPercent =
    data.expected_rent > 0
      ? Math.min(100, Math.round((data.rent_collected / data.expected_rent) * 100))
      : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-xs text-gray-500">Portfolio cash flow, rent liabilities, and arrears status</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenRecordModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
          >
            <span>+ Record Payment</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Banner — Available Cash (Maybe style) */}
      <div className="rounded-2xl bg-white border border-gray-200/80 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span>Total Available Liquid Cash</span>
            </div>
            <div className="text-3xl lg:text-4xl font-extrabold text-gray-900 font-mono tracking-tight">
              {formatINR(data.available_cash)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Reflects all recorded rent receipts, security deposits, and expenses to date
            </p>
          </div>

          <div className="flex items-center gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-gray-500">Refundable Deposits Held</span>
              <div className="text-sm font-bold text-gray-800 font-mono">
                {formatINR(data.total_refundable_deposits)}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-1" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-gray-500">Net Flow This Month</span>
              <div
                className={`text-sm font-bold font-mono ${
                  data.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {data.net_cash_flow >= 0 ? '+' : ''}
                {formatINR(data.net_cash_flow)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Expected Rent */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Expected Rent (Mo)</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {formatINR(data.expected_rent)}
          </div>
          <div className="text-[11px] text-gray-400">Sum of all active lease contracts</div>
        </div>

        {/* 2. Collected Rent */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Rent Collected (Mo)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono">
            {formatINR(data.rent_collected)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Collection Rate</span>
              <span className="font-semibold text-gray-900 font-mono">{collectionPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${collectionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Outstanding Arrears */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Total Overdue Arrears</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono">
            {formatINR(data.total_outstanding_arrears)}
          </div>
          <div className="text-[11px] text-rose-600/80 font-medium">
            {data.overdue_tenants.length} tenants with overdue balances
          </div>
        </div>

        {/* 4. Total Expenses */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Expenses (Mo)</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {formatINR(data.total_expenses)}
          </div>
          <div className="text-[11px] text-gray-400">Maintenance, taxes & repairs</div>
        </div>
      </div>

      {/* Main Grid: Overdue Tenants & Liabilities vs Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Overdue Tenants & Liabilities */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tenants with Outstanding Liabilities ({data.overdue_tenants.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigate('tenants')}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
              >
                <span>View all tenants</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data.overdue_tenants.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All tenant accounts are up to date! No overdue rent liabilities.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.overdue_tenants.map((ot) => {
                  const fullTenant = tenants.find((t) => t.id === ot.id);
                  return (
                    <div
                      key={ot.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-xs truncate">
                            {ot.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            Due {ot.rent_due_day}th
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {ot.property_name} • Monthly Rent: {formatINR(ot.monthly_rent)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            Arrears
                          </span>
                          <span className="text-xs font-bold text-rose-600 font-mono">
                            {formatINR(ot.arrears)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Option to change liability rent directly */}
                          {fullTenant && (
                            <button
                              onClick={() => onOpenEditTenant(fullTenant)}
                              className="px-2 py-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md border border-gray-200 transition"
                              title="Change monthly rent or opening arrears"
                            >
                              Edit Due
                            </button>
                          )}
                          <button
                            onClick={() => onOpenRecordModal(ot.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition"
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Portfolio Stats */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('properties')}
              className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition text-left flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Manage Properties</div>
                <div className="text-[11px] text-gray-500">View units, addresses & rent rolls</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('charges')}
              className="p-4 rounded-xl bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition text-left flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Rent Charges & Dues</div>
                <div className="text-[11px] text-gray-500">Edit dues, dates & grant waivers</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Recent Transactions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Recent Transactions
              </h3>
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
              >
                <span>Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.slice(0, 7).map((tx) => {
                  const isIncome = tx.transaction_type === 'income';
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between hover:bg-gray-50/50 transition gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatDate(tx.date)} • {tx.payment_method || 'Direct'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold font-mono ${
                            isIncome ? 'text-emerald-600' : 'text-gray-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
