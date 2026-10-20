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
} from 'lucide-react';
import { RentCharge } from '../types';
import { formatINR, formatDate, formatPeriod } from '../utils/format';

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

  const filtered = charges.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      (c.tenant_name && c.tenant_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.property_name && c.property_name.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleGenerateDues = async () => {
    setIsGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await fetch('/api/charges/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGenerateMsg(
          data.count > 0
            ? `Successfully generated ${data.count} new monthly rent charges!`
            : 'All current monthly rent charges are already up to date.'
        );
        onRefresh();
      }
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
            Audit monthly rent liabilities, edit due amounts, extend dates, or grant landlord waivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateDues}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-xs transition"
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
                return (
                  <tr key={charge.id} className="hover:bg-gray-50/60 transition">
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
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {formatINR(charge.amount_due)}
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

                    {/* Actions: Edit Due, Waive, Collect */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Option to change liability rent amount & due date */}
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
