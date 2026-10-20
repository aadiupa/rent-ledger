import React, { useState, useEffect } from 'react';
import { Settings, Database, CheckCircle, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { SettingsData } from '../types';
import { formatINR, rupeesToPaise, paiseToRupees } from '../utils/format';

interface SettingsViewProps {
  settings: SettingsData | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefresh }) => {
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const paise = parseInt(settings.opening_cash_balance || '0', 10);
      setOpeningBalanceRupees(String(paiseToRupees(paise)));
      setAutoGenerate(settings.auto_generate_charges === '1');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    const paise = rupeesToPaise(openingBalanceRupees);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_cash_balance: paise,
          auto_generate_charges: autoGenerate,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-gray-500">
          Configure accounting parameters, opening ledger balances, and database sync
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings successfully saved and cash ledger recalculated!</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Financial Accounting Settings */}
        <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Accounting Configuration
          </h2>

          {/* Opening Liquid Cash Balance */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Opening Bank / Cash Balance (₹)
            </label>
            <p className="text-[11px] text-gray-500 mb-2">
              The opening liquid balance in your landlord bank account before recording transactions.
            </p>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2 text-sm text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={openingBalanceRupees}
                onChange={(e) => setOpeningBalanceRupees(e.target.value)}
                placeholder="0"
                className="w-full text-sm font-semibold pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            {openingBalanceRupees && Number(openingBalanceRupees) > 0 && (
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {formatINR(rupeesToPaise(openingBalanceRupees))}
              </p>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Auto-generate monthly dues */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="autoGenerate"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4"
            />
            <div>
              <label htmlFor="autoGenerate" className="text-xs font-bold text-gray-900 cursor-pointer">
                Automatically generate monthly rent charges
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Automatically computes monthly rent dues for active tenants based on their contract start date and due day.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Database & Architecture Info */}
        <div className="rounded-xl bg-white border border-gray-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Local SQLite Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/60 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase">Engine</span>
              <div className="font-semibold text-gray-900">better-sqlite3 + Express</div>
              <div className="text-[10px] text-emerald-600 font-medium">● Port 3002 (WAL Mode Active)</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/60 space-y-1">
              <span className="text-[11px] text-gray-400 font-semibold uppercase">Data Isolation</span>
              <div className="font-semibold text-gray-900">Separate Port & Safe Git</div>
              <div className="text-[10px] text-gray-500 font-mono">*.db strictly gitignored</div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Git Privacy & Sample Data Compliance</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Only initial synthetic dummy fixtures are seeded for testing.
              Your live database file is strictly excluded from version control to
              prevent accidental leaking of financial data.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
