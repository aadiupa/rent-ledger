import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Gift,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { RentCharge } from '../types';
import { formatINR, formatDate, formatPeriod } from '../utils/format';
import { api } from '../api';

interface RentChargesViewProps {
  charges: RentCharge[];
  onRefresh: () => void;
  onOpenEditCharge: (charge: RentCharge) => void;
  onOpenWaiveCharge: (charge: RentCharge) => void;
  onOpenRecordModal: (tenantId: number) => void;
}

export const RentChargesView: React.FC<RentChargesViewProps> = ({
  charges,
  onRefresh,
  onOpenEditCharge,
  onOpenWaiveCharge,
  onOpenRecordModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  // Multi-select & Deletion states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemToDelete, setItemToDelete] = useState<RentCharge | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = charges.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      (c.tenant_name && c.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.property_name && c.property_name.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Multi-select helpers
  const filteredIds = filtered.map((c) => c.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected =
    filteredIds.some((id) => selectedIds.includes(id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedCharges = charges.filter((c) => selectedIds.includes(c.id));
  const selectedTotalDues = selectedCharges.reduce((sum, c) => sum + c.amount_due, 0);

  // Execution: Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCharge(itemToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      setItemToDelete(null);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete charge');
    } finally {
      setIsDeleting(false);
    }
  };

  // Execution: Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.bulkDeleteCharges(selectedIds);
      setSelectedIds([]);
      setShowBulkConfirm(false);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete selected charges');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateDues = async () => {
    setIsGenerating(true);
    setGenerateMsg(null);
    try {
      const data = await api.generateCharges();
      setGenerateMsg(
        data.count > 0
          ? `Successfully generated ${data.count} new monthly rent charges!`
          : 'All current monthly rent charges are already up to date.'
      );
      onRefresh();
    } catch {
      setGenerateMsg('Failed to generate charges');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalOutstandingDues = charges
    .filter((c) => c.status !== 'paid' && c.status !== 'waived')
    .reduce((sum, c) => sum + Math.max(0, c.amount_due - c.amount_paid - c.waived_amount), 0);

  const totalCollectedOnCharges = charges.reduce((sum, c) => sum + c.amount_paid, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Rent Charges & Dues</h1>
          <p className="text-xs text-gray-500">
            Audit monthly rent liabilities, edit due amounts, extend dates, remove erroneous dues, or grant landlord waivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateDues}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generate Monthly Dues</span>
          </button>
        </div>
      </div>

      {generateMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-center justify-between">
          <span>{generateMsg}</span>
          <button
            onClick={() => setGenerateMsg(null)}
            className="text-blue-500 hover:text-blue-800 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Outstanding Dues</div>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {formatINR(totalOutstandingDues)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Pending collection from tenants</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Paid on Charges</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {formatINR(totalCollectedOnCharges)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Allocated to date</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Generated Charges</div>
          <div className="text-2xl font-bold text-gray-900 font-mono">{charges.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">Across all properties</div>
        </div>
      </div>

      {/* Multi-Select Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-900 text-white rounded-xl shadow-lg border border-gray-800 transition">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium">
              {selectedIds.length} rent charge{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-300 border-l border-gray-700 pl-3">
              <span>Total Liability:</span>
              <span className="text-white font-bold">{formatINR(selectedTotalDues)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Controls: Search + Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Dues' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'due', label: 'Due' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Paid' },
            { id: 'waived', label: 'Waived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tenant or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Tenant & Property</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Paid / Waived</th>
                <th className="py-3 px-4">Balance Remaining</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((charge) => {
                const remaining = Math.max(
                  0,
                  charge.amount_due - charge.amount_paid - charge.waived_amount
                );
                const isSelected = selectedIds.includes(charge.id);
                return (
                  <tr
                    key={charge.id}
                    className={`transition ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <td className="py-3.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(charge.id)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                      />
                    </td>

                    {/* Period */}
                    <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                      {formatPeriod(charge.period_year, charge.period_month)}
                    </td>

                    {/* Tenant & Property */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{charge.tenant_name}</div>
                      <div className="text-[11px] text-gray-400">{charge.property_name}</div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      {formatDate(charge.due_date)}
                    </td>

                    {/* Amount Due */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-gray-900">
                        {formatINR(charge.amount_due)}
                      </div>
                      {charge.notes && (
                        <div className="text-[10px] text-indigo-600 font-medium whitespace-nowrap mt-0.5">
                          {charge.notes}
                        </div>
                      )}
                    </td>

                    {/* Paid & Waived */}
                    <td className="py-3.5 px-4 font-mono">
                      {charge.amount_paid > 0 ? (
                        <div className="text-emerald-600 font-semibold">
                          +{formatINR(charge.amount_paid)}
                        </div>
                      ) : (
                        <span className="text-gray-400">₹0</span>
                      )}
                      {charge.waived_amount > 0 && (
                        <div className="text-amber-600 text-[10px]">
                          Waived: {formatINR(charge.waived_amount)}
                        </div>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={remaining > 0 ? 'text-rose-600' : 'text-gray-400'}>
                        {formatINR(remaining)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                          charge.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : charge.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : charge.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : charge.status === 'waived'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {charge.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions: Edit Due, Waive, Collect, Delete */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenEditCharge(charge)}
                          className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-md border border-gray-200 transition shadow-xs"
                          title="Change due amount or due date"
                        >
                          Edit Due
                        </button>

                        {remaining > 0 && (
                          <button
                            onClick={() => onOpenWaiveCharge(charge)}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition"
                            title="Grant rent waiver or concession"
                          >
                            Waive
                          </button>
                        )}

                        {remaining > 0 && (
                          <button
                            onClick={() => onOpenRecordModal(charge.tenant_id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-900 hover:bg-black text-white rounded-md transition shadow-xs"
                          >
                            Collect
                          </button>
                        )}

                        <button
                          onClick={() => setItemToDelete(charge)}
                          title="Remove charge"
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

      {/* Single Charge Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    Remove Rent Charge?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Deleting this charge will eliminate this rent due from the tenant's ledger and recalculate arrears balances.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {deleteError}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Tenant:</span>
                  <span className="font-semibold text-gray-900">{itemToDelete.tenant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-semibold text-gray-900">
                    {formatPeriod(itemToDelete.period_year, itemToDelete.period_month)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Due:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {formatINR(itemToDelete.amount_due)}
                  </span>
                </div>
                {itemToDelete.amount_paid > 0 && (
                  <div className="text-[11px] text-amber-600 pt-1 border-t border-gray-200/60">
                    ⚠️ This charge has {formatINR(itemToDelete.amount_paid)} allocated payments. Deleting this charge will release these allocations.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmSingleDelete}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {isDeleting ? 'Removing...' : 'Yes, Remove Charge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Charges Delete Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    Delete {selectedIds.length} Selected Charges?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This will permanently delete {selectedIds.length} rent charges. Tenant dues and outstanding arrears will be recomputed automatically.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {deleteError}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Selected Charges:</span>
                  <span className="font-semibold text-gray-900">{selectedIds.length} records</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Liability to Remove:</span>
                  <span className="font-mono font-bold text-gray-900">{formatINR(selectedTotalDues)}</span>
                </div>
                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                  ⚠️ This action cannot be undone.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length} Charges`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
