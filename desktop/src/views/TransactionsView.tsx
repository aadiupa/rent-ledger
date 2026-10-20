import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Transaction, Property, Tenant } from '../types';
import { formatINR, formatDate } from '../utils/format';
import { api } from '../api';
import { EditTransactionModal } from '../components/EditTransactionModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  onOpenRecordModal: () => void;
  onRefresh?: () => Promise<void> | void;
  properties?: Property[];
  tenants?: Tenant[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onOpenRecordModal,
  onRefresh,
  properties = [],
  tenants = [],
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Edit state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Multi-select & Delete states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
    const matchesSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      (tx.tenant_name && tx.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
      (tx.property_name && tx.property_name.toLowerCase().includes(search.toLowerCase())) ||
      (tx.reference && tx.reference.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesCategory && matchesSearch;
  });

  const totalInflow = transactions
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOutflow = transactions
    .filter((tx) => tx.transaction_type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Selection calculations
  const filteredIds = filtered.map((tx) => tx.id);
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

  const selectedTxs = transactions.filter((t) => selectedIds.includes(t.id));
  const selectedInflow = selectedTxs
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const selectedOutflow = selectedTxs
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Single delete execution
  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteTransaction(itemToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      setItemToDelete(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete execution
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.bulkDeleteTransactions(selectedIds);
      setSelectedIds([]);
      setShowBulkConfirm(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete selected transactions');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV export function
  const handleExportCSV = () => {
    const targetList = selectedIds.length > 0 ? selectedTxs : filtered;
    const headers = [
      'ID',
      'Date',
      'Type',
      'Category',
      'Amount (INR)',
      'Tenant',
      'Property',
      'Payment Method',
      'Reference',
      'Description',
    ];
    const rows = targetList.map((tx) => [
      tx.id,
      tx.date,
      tx.transaction_type,
      `"${tx.category}"`,
      tx.amount / 100,
      `"${tx.tenant_name || ''}"`,
      `"${tx.property_name || ''}"`,
      `"${tx.payment_method || ''}"`,
      `"${tx.reference || ''}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rentledger_transactions_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Financial Ledger</h1>
          <p className="text-xs text-gray-500">
            Real-time transaction history of all rent collections, security deposits & landlord expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>{selectedIds.length > 0 ? `Export (${selectedIds.length})` : 'Export CSV'}</span>
          </button>
          <button
            onClick={onOpenRecordModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Total Inflow (Receipts)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            +{formatINR(totalInflow)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Rent, arrears, deposits</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Total Outflow (Expenses)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            -{formatINR(totalOutflow)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Repairs, maintenance, taxes</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Net Operating Balance</span>
            <ArrowLeftRight className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatINR(totalInflow - totalOutflow)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Recorded ledger surplus</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              typeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Ledger Entries
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              typeFilter === 'income'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Income Only
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              typeFilter === 'expense'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Expenses Only
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search description, reference, tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
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
              {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono border-l border-gray-700 pl-3">
              {selectedInflow > 0 && (
                <span className="text-emerald-400">+{formatINR(selectedInflow)}</span>
              )}
              {selectedOutflow > 0 && (
                <span className="text-rose-400">-{formatINR(selectedOutflow)}</span>
              )}
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
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Notes</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Entity / Tenant</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-3 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isIncome = tx.transaction_type === 'income';
                  const isSelected = selectedIds.includes(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`transition ${
                        isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-600 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{tx.description}</div>
                        {tx.property_name && (
                          <div className="text-[11px] text-gray-400">{tx.property_name}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-800">
                        {tx.tenant_name || <span className="text-gray-400">—</span>}
                      </td>

                      <td
                        className="py-3.5 px-4 whitespace-nowrap text-gray-700 cursor-pointer group"
                        onClick={() => setEditingTransaction(tx)}
                        title="Click to edit payment method or transaction details"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium group-hover:text-blue-600 group-hover:underline">
                            {tx.payment_method || 'Direct'}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        {tx.reference && (
                          <div className="text-[10px] text-gray-400 font-mono">{tx.reference}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isIncome ? 'text-emerald-600' : 'text-gray-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 w-20 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            title="Edit transaction details"
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(tx)}
                            title="Remove from ledger"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Delete Confirmation Modal */}
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
                    Remove from Ledger?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Deleting this transaction will recompute available ledger cash and reverse any associated rent payment allocations.
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
                  <span>Date:</span>
                  <span className="font-semibold text-gray-900">{formatDate(itemToDelete.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-semibold text-gray-900">{itemToDelete.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Description:</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                    {itemToDelete.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span
                    className={`font-mono font-bold ${
                      itemToDelete.transaction_type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                    }`}
                  >
                    {itemToDelete.transaction_type === 'income' ? '+' : '-'}
                    {formatINR(itemToDelete.amount)}
                  </span>
                </div>
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
                  {isDeleting ? 'Removing...' : 'Yes, Remove Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
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
                    Delete {selectedIds.length} Selected Transactions?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This will permanently delete {selectedIds.length} transactions from the ledger. Dependent rent arrears and ledger cash balances will be automatically recalculated.
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
                  <span>Selected Count:</span>
                  <span className="font-semibold text-gray-900">{selectedIds.length} records</span>
                </div>
                {selectedInflow > 0 && (
                  <div className="flex justify-between">
                    <span>Income Reversals:</span>
                    <span className="font-mono font-bold text-emerald-600">+{formatINR(selectedInflow)}</span>
                  </div>
                )}
                {selectedOutflow > 0 && (
                  <div className="flex justify-between">
                    <span>Expense Reversals:</span>
                    <span className="font-mono font-bold text-rose-600">-{formatINR(selectedOutflow)}</span>
                  </div>
                )}
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
                  {isDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length} Transactions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSuccess={async () => {
          setEditingTransaction(null);
          if (onRefresh) await onRefresh();
        }}
        properties={properties}
        tenants={tenants}
      />
    </div>
  );
};
