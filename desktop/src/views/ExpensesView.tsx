import React, { useState, useEffect } from 'react';
import {
  Hammer,
  Plus,
  Search,
  Building2,
  HardHat,
  Wrench,
  Receipt,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Property, Transaction, ExpensesData } from '../types';
import { formatINR, formatDate } from '../utils/format';
import { api } from '../api';

interface ExpensesViewProps {
  properties: Property[];
  onOpenRecordExpense: (propertyId?: number) => void;
  onOpenAddProperty: () => void;
  onRefresh?: () => Promise<void> | void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  properties,
  onOpenRecordExpense,
  onOpenAddProperty,
  onRefresh,
}) => {
  const [data, setData] = useState<ExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capex' | 'opex'>('all');
  const [search, setSearch] = useState('');

  // Multi-select & Delete states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const json = await api.getExpenses(
        propertyFilter === 'all' ? undefined : propertyFilter,
        typeFilter === 'all' ? undefined : typeFilter
      );
      setData(json);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [propertyFilter, typeFilter]);

  const filteredExpenses = (data?.expenses || []).filter((e) => {
    const s = search.toLowerCase();
    return (
      e.description.toLowerCase().includes(s) ||
      (e.vendor && e.vendor.toLowerCase().includes(s)) ||
      (e.property_name && e.property_name.toLowerCase().includes(s)) ||
      (e.category && e.category.toLowerCase().includes(s)) ||
      (e.reference && e.reference.toLowerCase().includes(s))
    );
  });

  // Selection calculations
  const filteredIds = filteredExpenses.map((e) => e.id);
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

  const selectedExpenses = (data?.expenses || []).filter((e) => selectedIds.includes(e.id));
  const selectedTotalAmount = selectedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Single delete execution
  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteTransaction(itemToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      setItemToDelete(null);
      await fetchExpenses();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove expense');
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
      await fetchExpenses();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove selected expenses');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const targetList = selectedIds.length > 0 ? selectedExpenses : filteredExpenses;
    const headers = [
      'ID',
      'Date',
      'Classification',
      'Category',
      'Property',
      'Vendor',
      'Description',
      'Method',
      'Ref',
      'Amount (INR)',
    ];
    const rows = targetList.map((e) => [
      e.id,
      e.date,
      e.expense_type || 'opex',
      `"${e.category}"`,
      `"${e.property_name || 'General'}"`,
      `"${e.vendor || ''}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.payment_method || ''}"`,
      `"${e.reference || ''}"`,
      e.amount / 100,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `expenses_capex_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Expenses & Construction Capex
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              New Property & Capex Ready
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit capital investments, building costs for new properties, and routine operational maintenance
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
            onClick={() => onOpenRecordExpense()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outflow */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Total Expenses & Outflow</span>
            <TrendingDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatINR(data?.total_expenses || 0)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Total cash spent across all projects</div>
        </div>

        {/* Construction & Capex */}
        <div className="rounded-xl bg-white p-4 border border-indigo-200/70 shadow-xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-xs font-medium text-indigo-900 mb-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <HardHat className="w-4 h-4 text-indigo-600" />
              Construction & Capex
            </span>
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
              {data?.total_expenses
                ? `${Math.round(((data?.total_capex || 0) / data.total_expenses) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-900 font-mono">
            {formatINR(data?.total_capex || 0)}
          </div>
          <div className="text-[11px] text-indigo-600/80 mt-1">
            Building materials, civil labor, contractor payouts
          </div>
        </div>

        {/* Operational Maintenance (Opex) */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-gray-500" />
              Operational Maintenance (Opex)
            </span>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {data?.total_expenses
                ? `${Math.round(((data?.total_opex || 0) / data.total_expenses) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatINR(data?.total_opex || 0)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Routine repairs, utilities, cleaning, tenant turnover
          </div>
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Project / Property */}
        <div className="rounded-xl bg-white p-5 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Spend by Property & Project
              </h3>
            </div>
            <button
              onClick={onOpenAddProperty}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              + Add Property / Project
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.by_property || []).map((p) => {
              const pct = data?.total_expenses
                ? Math.round((p.total_spent / data.total_expenses) * 100)
                : 0;
              return (
                <div key={p.property_id || 0} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-800 flex items-center gap-1.5">
                      {p.property_name}
                      {p.status === 'under_construction' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          Under Construction
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-semibold text-gray-900">
                      {formatINR(p.total_spent)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p.status === 'under_construction' ? 'bg-indigo-600' : 'bg-gray-800'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="rounded-xl bg-white p-5 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Top Expense Categories
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Classified Breakdown</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(data?.by_category || []).map((c) => {
              const isCapex =
                c.expense_type === 'capex' ||
                c.category.includes('Construction') ||
                c.category.includes('Material') ||
                c.category.includes('Labor');
              return (
                <div
                  key={c.category}
                  className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 truncate">{c.category}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isCapex ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isCapex ? 'CAPEX' : 'OPEX'}
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-gray-900 mt-1">
                    {formatINR(c.total_spent)}
                  </div>
                </div>
              );
            })}
          </div>
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
              {selectedIds.length} expense record{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-300 border-l border-gray-700 pl-3">
              <span>Total Outflow:</span>
              <span className="text-rose-400 font-bold">-{formatINR(selectedTotalAmount)}</span>
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Outflows
          </button>
          <button
            onClick={() => setTypeFilter('capex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'capex'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Construction / Capex</span>
          </button>
          <button
            onClick={() => setTypeFilter('opex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'opex'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Operations & Repairs</span>
          </button>
        </div>

        {/* Property Dropdown Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={propertyFilter}
            onChange={(e) =>
              setPropertyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All Properties & Projects</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.status === 'under_construction' ? '(Construction)' : ''}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor, contractor, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
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
                <th className="py-3 px-4">Work Description & Items</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Property / Project</th>
                <th className="py-3 px-4">Vendor / Contractor</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4 text-right">Amount Spent</th>
                <th className="py-3 px-3 w-14 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No expense or construction records found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isCapex =
                    exp.expense_type === 'capex' ||
                    exp.category.includes('Construction') ||
                    exp.category.includes('Material') ||
                    exp.category.includes('Labor');
                  const isSelected = selectedIds.includes(exp.id);
                  return (
                    <tr
                      key={exp.id}
                      className={`transition ${
                        isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(exp.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-600 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{exp.description}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isCapex
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {exp.property_name || <span className="text-gray-400">General Overhead</span>}
                        </div>
                        {exp.property_status === 'under_construction' && (
                          <span className="text-[9px] font-bold text-indigo-600 uppercase">
                            Under Construction
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-700 font-medium">
                        {exp.vendor || <span className="text-gray-400">—</span>}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
                        <div>{exp.payment_method || 'Direct'}</div>
                        {exp.reference && (
                          <div className="text-[10px] text-gray-400 font-mono">{exp.reference}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-gray-900">
                          -{formatINR(exp.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 w-14 text-center">
                        <button
                          onClick={() => setItemToDelete(exp)}
                          title="Remove expense"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Expense Delete Modal */}
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
                    Remove Expense Record?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Deleting this expense will remove it from project capex / opex accounting and restore the spent money to your available cash balance.
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
                  <span>Project / Property:</span>
                  <span className="font-semibold text-gray-900">{itemToDelete.property_name || 'General Overhead'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Description:</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                    {itemToDelete.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Spent:</span>
                  <span className="font-mono font-bold text-gray-900">
                    -{formatINR(itemToDelete.amount)}
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
                  {isDeleting ? 'Removing...' : 'Yes, Remove Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Expenses Modal */}
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
                    Delete {selectedIds.length} Selected Expenses?
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This will permanently delete {selectedIds.length} expense/capex records. Available money and cost totals will be recalculated across your properties.
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
                  <span className="font-semibold text-gray-900">{selectedIds.length} expense records</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount to Restore:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatINR(selectedTotalAmount)}</span>
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
                  {isDeleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length} Expenses`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
