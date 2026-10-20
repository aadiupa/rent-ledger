import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Plus,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatINR, formatDate } from '../utils/format';

interface TransactionsViewProps {
  transactions: Transaction[];
  onOpenRecordModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onOpenRecordModal,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  // CSV export function
  const handleExportCSV = () => {
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
    const rows = filtered.map((tx) => [
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
    link.setAttribute('download', `rentledger_transactions_${new Date().toISOString().split('T')[0]}.csv`);
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
            Immutable transaction history of all rent collections, security deposits & landlord expenses
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

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Notes</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Entity / Tenant</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tx) => {
                const isIncome = tx.transaction_type === 'income';
                return (
                  <tr key={tx.id} className="hover:bg-gray-50/60 transition">
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

                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
                      <div>{tx.payment_method || 'Direct'}</div>
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
