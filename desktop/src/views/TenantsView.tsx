import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  Calendar,
  AlertTriangle,
  CreditCard,
  Edit,
  X,
  Phone,
  Mail,
  CheckCircle2,
  Receipt,
  FileText,
  Trash2,
} from 'lucide-react';
import { Tenant, RentCharge, Transaction } from '../types';
import { formatINR, formatDate, formatPeriod } from '../utils/format';
import { api } from '../api';

interface TenantsViewProps {
  tenants: Tenant[];
  onOpenAddTenant: () => void;
  onOpenEditTenant: (tenant: Tenant) => void;
  onOpenRecordModal: (tenantId: number) => void;
  onOpenEditCharge: (charge: RentCharge) => void;
  onOpenWaiveCharge: (charge: RentCharge) => void;
  onRefresh?: () => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  tenants,
  onOpenAddTenant,
  onOpenEditTenant,
  onOpenRecordModal,
  onOpenEditCharge,
  onOpenWaiveCharge,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDetails, setTenantDetails] = useState<{
    charges: RentCharge[];
    transactions: Transaction[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Tenant deletion states
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);
  const [deleteTenantError, setDeleteTenantError] = useState<string | null>(null);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.property_name && t.property_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.contact_phone && t.contact_phone.includes(search))
  );

  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setLoadingDetails(true);
    try {
      const data = await api.getTenant(tenant.id);
      setTenantDetails({
        charges: data.charges || [],
        transactions: data.transactions || [],
      });
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setIsDeletingTenant(true);
    setDeleteTenantError(null);
    try {
      await api.deleteTenant(tenantToDelete.id);
      if (selectedTenant?.id === tenantToDelete.id) {
        setSelectedTenant(null);
      }
      setTenantToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setDeleteTenantError(err.message || 'Failed to delete tenant');
    } finally {
      setIsDeletingTenant(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tenants & Lease Agreements</h1>
          <p className="text-xs text-gray-500">
            Track active lease agreements, modify monthly rent liabilities, and review arrears
          </p>
        </div>
        <button
          onClick={onOpenAddTenant}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tenant name, property, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Tenant / Contact</th>
                <th className="py-3 px-4">Property & Unit</th>
                <th className="py-3 px-4">Monthly Rent Liability</th>
                <th className="py-3 px-4">Due Schedule</th>
                <th className="py-3 px-4">Deposit Held</th>
                <th className="py-3 px-4 text-right">Outstanding Arrears</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tenant) => {
                const hasArrears = tenant.arrears > 0;
                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50/60 transition group cursor-pointer"
                    onClick={() => handleSelectTenant(tenant)}
                  >
                    {/* Tenant Name & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{tenant.name}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        {tenant.contact_phone && <span>{tenant.contact_phone}</span>}
                        {tenant.contact_email && <span>• {tenant.contact_email}</span>}
                      </div>
                    </td>

                    {/* Property & Unit */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{tenant.property_name}</div>
                      <div className="text-[11px] text-gray-400">
                        {tenant.unit_name || 'Standard Unit'}
                      </div>
                    </td>

                    {/* Monthly Contract Rent */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-gray-900 text-sm">
                        {formatINR(tenant.monthly_rent)}
                      </div>
                      <div className="text-[10px] text-gray-400">per month</div>
                    </td>

                    {/* Due Schedule */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">
                        {tenant.rent_due_day}
                        {tenant.rent_due_day === 1
                          ? 'st'
                          : tenant.rent_due_day === 2
                          ? 'nd'
                          : tenant.rent_due_day === 3
                          ? 'rd'
                          : 'th'}{' '}
                        of month
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Lease: {formatDate(tenant.lease_start)}
                      </div>
                    </td>

                    {/* Deposit */}
                    <td className="py-3.5 px-4 font-mono text-gray-700">
                      {formatINR(tenant.deposit_held || 0)}
                    </td>

                    {/* Arrears */}
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          hasArrears ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatINR(tenant.arrears)}
                      </div>
                      {hasArrears && (
                        <div className="text-[10px] text-rose-500 font-medium">Overdue</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenEditTenant(tenant)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition shadow-xs flex items-center gap-1"
                          title="Change Monthly Rent, Due Day, or Opening Arrears"
                        >
                          <Edit className="w-3 h-3 text-gray-400" />
                          <span>Change Rent</span>
                        </button>
                        <button
                          onClick={() => onOpenRecordModal(tenant.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-gray-900 hover:bg-black text-white rounded-lg transition shadow-xs"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => setTenantToDelete(tenant)}
                          title="Delete tenant"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Detail Drawer (when a tenant row is clicked) */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-200 overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedTenant.name}</h2>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedTenant.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {selectedTenant.is_active ? 'Active Lease' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedTenant.property_name} {selectedTenant.unit_name ? `• ${selectedTenant.unit_name}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white shrink-0">
              <button
                onClick={() => {
                  onOpenEditTenant(selectedTenant);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Change Rent</span>
              </button>
              <button
                onClick={() => {
                  onOpenRecordModal(selectedTenant.id);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Record Receipt</span>
              </button>
              <button
                onClick={() => setTenantToDelete(selectedTenant)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                title="Delete Tenant"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div className="text-[11px] text-gray-500 font-medium">Monthly Contract Rent</div>
                  <div className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                    {formatINR(selectedTenant.monthly_rent)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Due on {selectedTenant.rent_due_day}th of month
                  </div>
                </div>

                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/80">
                  <div className="text-[11px] text-rose-600 font-medium">Current Total Arrears</div>
                  <div className="text-lg font-bold text-rose-600 font-mono mt-0.5">
                    {formatINR(selectedTenant.arrears)}
                  </div>
                  <div className="text-[10px] text-rose-500 mt-1">
                    {selectedTenant.arrears > 0 ? 'Action needed' : 'All clear'}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 bg-white rounded-xl border border-gray-200/80 shadow-xs space-y-2 text-xs">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Contact Information
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedTenant.contact_phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedTenant.contact_email || 'No email recorded'}</span>
                </div>
              </div>

              {/* Monthly Charges Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Rent Charges History
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {tenantDetails?.charges.length || 0} charges
                  </span>
                </div>

                {loadingDetails ? (
                  <div className="py-6 text-center text-xs text-gray-400">Loading ledger...</div>
                ) : tenantDetails?.charges.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
                    No charges generated yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tenantDetails?.charges.map((chg) => (
                      <div
                        key={chg.id}
                        className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-gray-900">
                            {formatPeriod(chg.period_year, chg.period_month)}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Due: {formatDate(chg.due_date)} • Due Amount: {formatINR(chg.amount_due)}
                          </div>
                          {chg.amount_paid > 0 && (
                            <div className="text-[10px] text-emerald-600 mt-0.5">
                              Paid: {formatINR(chg.amount_paid)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              chg.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : chg.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {chg.status}
                          </span>

                          <button
                            onClick={() => onOpenEditCharge(chg)}
                            className="px-2 py-1 text-[10px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
                          >
                            Edit Due
                          </button>
                          {chg.status !== 'paid' && (
                            <button
                              onClick={() => onOpenWaiveCharge(chg)}
                              className="px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition"
                            >
                              Waive
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Delete Confirmation Modal */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    Delete Tenant: {tenantToDelete.name}?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This will remove the lease profile, monthly rent liabilities, and recurring dues. Historical payment records in the financial ledger will be safely preserved as general records.
                  </p>
                </div>
              </div>

              {deleteTenantError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {deleteTenantError}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Property & Unit:</span>
                  <span className="font-semibold text-gray-900">
                    {tenantToDelete.property_name} {tenantToDelete.unit_name ? `• ${tenantToDelete.unit_name}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Rent:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {formatINR(tenantToDelete.monthly_rent)}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Arrears:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatINR(tenantToDelete.arrears)}
                  </span>
                </div>
                {tenantToDelete.deposit_held > 0 && (
                  <div className="flex justify-between">
                    <span>Security Deposit Held:</span>
                    <span className="font-mono font-bold text-gray-700">
                      {formatINR(tenantToDelete.deposit_held)}
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                  ⚠️ This action cannot be undone.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingTenant}
                  onClick={() => setTenantToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingTenant}
                  onClick={handleConfirmDeleteTenant}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {isDeletingTenant ? 'Removing...' : 'Yes, Delete Tenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
