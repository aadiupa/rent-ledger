import React from 'react';
import { Download, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { Tenant, RentCharge, Transaction } from '../types';
import { formatINR, formatPeriod } from '../utils/format';

interface ReportsViewProps {
  tenants: Tenant[];
  charges: RentCharge[];
  transactions: Transaction[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tenants,
  charges,
  transactions,
}) => {
  // Group charges by Period
  const periodMap = new Map<string, { expected: number; collected: number; waived: number }>();

  for (const c of charges) {
    const key = `${c.period_year}-${String(c.period_month).padStart(2, '0')}`;
    const curr = periodMap.get(key) || { expected: 0, collected: 0, waived: 0 };
    curr.expected += c.amount_due;
    curr.collected += c.amount_paid;
    curr.waived += c.waived_amount;
    periodMap.set(key, curr);
  }

  const sortedPeriods = Array.from(periodMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  const totalExpected = charges.reduce((sum, c) => sum + c.amount_due, 0);
  const totalCollected = charges.reduce((sum, c) => sum + c.amount_paid, 0);
  const totalWaived = charges.reduce((sum, c) => sum + c.waived_amount, 0);
  const overallEfficiency = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Cash Ledger P&L Aggregations
  const totalIncome = transactions
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOpex = transactions
    .filter((tx) => tx.transaction_type === 'expense' && tx.expense_type !== 'capex')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCapex = transactions
    .filter((tx) => tx.transaction_type === 'expense' && tx.expense_type === 'capex')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netCashFlow = totalIncome - totalOpex - totalCapex;

  // Export Dues & Realization CSV
  const handleExportCSV = () => {
    const rows = [
      ['Period', 'Rent Invoiced (Paise)', 'Rent Invoiced (INR)', 'Collected (Paise)', 'Collected (INR)', 'Waived (Paise)', 'Waived (INR)', 'Unpaid (Paise)', 'Unpaid (INR)', 'Collection Rate (%)'],
    ];

    for (const [periodKey, val] of sortedPeriods) {
      const unpaid = Math.max(0, val.expected - val.collected - val.waived);
      const rate = val.expected > 0 ? Math.round((val.collected / val.expected) * 100) : 0;
      rows.push([
        periodKey,
        String(val.expected),
        (val.expected / 100).toFixed(2),
        String(val.collected),
        (val.collected / 100).toFixed(2),
        String(val.waived),
        (val.waived / 100).toFixed(2),
        String(unpaid),
        (unpaid / 100).toFixed(2),
        `${rate}%`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rentledger-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Reports & Performance</h1>
          <p className="text-xs text-gray-500">
            Monthly P&L breakdown, rent realization rate, and arrears aging
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200/80 rounded-lg hover:bg-gray-50 shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          Export Report CSV
        </button>
      </div>

      {/* Cash P&L Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Total Cash Inflow</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono">{formatINR(totalIncome)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Rent + Deposits + Arrears</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Operational Opex</span>
            <PieChart className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 font-mono">{formatINR(totalOpex)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Maintenance, taxes, utilities</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Capital Capex</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 font-mono">{formatINR(totalCapex)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Construction & assets</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Net Cash Flow</span>
            <span className="text-[10px] font-bold uppercase text-gray-400">P&L</span>
          </div>
          <div className={`text-xl font-bold font-mono ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(netCashFlow)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Net surplus cash</div>
        </div>
      </div>

      {/* Realization Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Rent Billed</div>
          <div className="text-xl font-bold text-gray-900 font-mono">{formatINR(totalExpected)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Across all tracked months</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Realized & Collected</div>
          <div className="text-xl font-bold text-emerald-600 font-mono">{formatINR(totalCollected)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Successfully collected</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Concessions / Waivers</div>
          <div className="text-xl font-bold text-amber-600 font-mono">{formatINR(totalWaived)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Authorized discounts</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Realization Efficiency</div>
          <div className="text-xl font-bold text-gray-900 font-mono">{overallEfficiency}%</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallEfficiency}%` }}
            />
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Monthly Rent Performance Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Rent Invoiced</th>
                <th className="py-3 px-4">Collected</th>
                <th className="py-3 px-4">Waivers</th>
                <th className="py-3 px-4">Unpaid Outstanding</th>
                <th className="py-3 px-4 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPeriods.map(([periodKey, val]) => {
                const [y, m] = periodKey.split('-').map(Number);
                const unpaid = Math.max(0, val.expected - val.collected - val.waived);
                const rate = val.expected > 0 ? Math.round((val.collected / val.expected) * 100) : 0;

                return (
                  <tr key={periodKey} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatPeriod(y, m)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-800">
                      {formatINR(val.expected)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      {formatINR(val.collected)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-600">
                      {formatINR(val.waived)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                      {formatINR(unpaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-semibold text-gray-900">{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Arrears Aging */}
      <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Tenant Arrears & Liability Exposure
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          {tenants.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-gray-900">{t.name}</span>
                <span className="text-gray-400 ml-2 font-normal">
                  ({t.property_name} • Monthly: {formatINR(t.monthly_rent)})
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                    Outstanding Arrears
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      t.arrears > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatINR(t.arrears)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
