import React, { useState, useEffect } from 'react';
import {
  Hammer,
  Plus,
  Search,
  Filter,
  Building2,
  HardHat,
  Wrench,
  Receipt,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { Property, Transaction, ExpensesData } from '../types';
import { formatINR, formatDate } from '../utils/format';

interface ExpensesViewProps {
  properties: Property[];
  onOpenRecordExpense: (propertyId?: number) => void;
  onOpenAddProperty: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  properties,
  onOpenRecordExpense,
  onOpenAddProperty,
}) => {
  const [data, setData] = useState<ExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capex' | 'opex'>('all');
  const [search, setSearch] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (propertyFilter !== 'all') q.set('property_id', String(propertyFilter));
      if (typeFilter !== 'all') q.set('expense_type', typeFilter);

      const res = await fetch(`/api/expenses?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
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

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Classification', 'Category', 'Property', 'Vendor', 'Description', 'Method', 'Ref', 'Amount (INR)'];
    const rows = filteredExpenses.map((e) => [
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Expenses & Construction Capex</h1>
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
            <span>Export CSV</span>
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

        {/* Construction & Capex (New property) */}
        <div className="rounded-xl bg-white p-4 border border-indigo-200/70 shadow-xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-xs font-medium text-indigo-900 mb-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <HardHat className="w-4 h-4 text-indigo-600" />
              Construction & Capex
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold">
              Site Building
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 font-mono">
            {formatINR(data?.total_capex || 0)}
          </div>
          <div className="text-[11px] text-indigo-600/80 mt-1">Capital deployed into building & materials</div>
        </div>

        {/* Operational Maintenance */}
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-gray-400" />
              Operational & Maintenance
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
              Opex
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatINR(data?.total_opex || 0)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Repairs, taxes, utilities & society dues</div>
        </div>
      </div>

      {/* Property Project Investment Overview */}
      {data?.by_property && data.by_property.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              Capital & Expense Deployment by Property / Project
            </h3>
            <button
              onClick={onOpenAddProperty}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              + Add 5th Property Site
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {data.by_property.map((bp, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition ${
                  bp.property_status === 'under_construction'
                    ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300'
                    : 'bg-gray-50/60 border-gray-200/70 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-gray-900 truncate">{bp.name}</span>
                  {bp.property_status === 'under_construction' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                      Building
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-gray-900 font-mono">
                  {formatINR(bp.total)}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Total spent on this site</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Filter */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              typeFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Outflows
          </button>
          <button
            onClick={() => setTypeFilter('capex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'capex' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Construction / Capex</span>
          </button>
          <button
            onClick={() => setTypeFilter('opex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'opex' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
            onChange={(e) => setPropertyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
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
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Work Description & Items</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Property / Project</th>
                <th className="py-3 px-4">Vendor / Contractor</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4 text-right">Amount Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No expense or construction records found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isCapex = exp.expense_type === 'capex' || exp.category.includes('Construction') || exp.category.includes('Material') || exp.category.includes('Labor');
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50/60 transition">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
