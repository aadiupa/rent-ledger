import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { RentCharge } from '../types';
import { formatINR, rupeesToPaise, formatPeriod } from '../utils/format';

interface WaiveChargeModalProps {
  charge: RentCharge | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WaiveChargeModal: React.FC<WaiveChargeModalProps> = ({
  charge,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [waiveAmountRupees, setWaiveAmountRupees] = useState<string>('');
  const [reason, setReason] = useState<string>('Landlord concession');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !charge) return null;

  const remainingPaise = Math.max(0, charge.amount_due - charge.amount_paid - charge.waived_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const waivePaise = rupeesToPaise(waiveAmountRupees);
    if (waivePaise <= 0) {
      setError('Waived amount must be greater than 0');
      return;
    }
    if (waivePaise > remainingPaise) {
      setError(`Cannot waive more than remaining balance (${formatINR(remainingPaise)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/charges/${charge.id}/waive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waived_amount: waivePaise,
          waived_reason: reason.trim() || 'Landlord concession',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to waive charge');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Waive Rent / Grant Concession</h2>
            <p className="text-xs text-gray-500">
              {charge.tenant_name} • {formatPeriod(charge.period_year, charge.period_month)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-gray-700">
              <span>Total Rent Due:</span>
              <span className="font-mono font-medium">{formatINR(charge.amount_due)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Already Paid:</span>
              <span className="font-mono font-medium text-emerald-600">{formatINR(charge.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-amber-200">
              <span>Remaining Outstanding:</span>
              <span className="font-mono text-rose-600">{formatINR(remainingPaise)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">Amount to Waive (₹)</label>
              <button
                type="button"
                onClick={() => setWaiveAmountRupees(String(Math.round(remainingPaise / 100)))}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Waive Full Remaining
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={waiveAmountRupees}
                onChange={(e) => setWaiveAmountRupees(e.target.value)}
                placeholder="0"
                className="w-full text-sm font-semibold pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Concession</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Mutual agreement / plumbing inconvenience discount"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Waiving...' : 'Confirm Waiver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
