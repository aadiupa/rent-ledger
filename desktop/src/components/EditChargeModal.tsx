import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { RentCharge } from '../types';
import { formatINR, rupeesToPaise, paiseToRupees, formatPeriod } from '../utils/format';

interface EditChargeModalProps {
  charge: RentCharge | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditChargeModal: React.FC<EditChargeModalProps> = ({
  charge,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amountDueRupees, setAmountDueRupees] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (charge) {
      setAmountDueRupees(String(paiseToRupees(charge.amount_due)));
      setDueDate(charge.due_date);
      setError(null);
    }
  }, [charge]);

  if (!isOpen || !charge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const duePaise = rupeesToPaise(amountDueRupees);
    if (duePaise < 0) {
      setError('Amount due cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/charges/${charge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_due: duePaise,
          due_date: dueDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update charge');
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
            <h2 className="text-base font-semibold text-gray-900">
              Edit Rent Liability Due
            </h2>
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

          {/* Current Status Overview */}
          <div className="p-3 bg-gray-50 border border-gray-200/70 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Already Paid:</span>
              <span className="font-mono font-semibold text-emerald-600">
                {formatINR(charge.amount_paid)}
              </span>
            </div>
            {charge.waived_amount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Waived:</span>
                <span className="font-mono font-semibold text-amber-600">
                  {formatINR(charge.waived_amount)}
                </span>
              </div>
            )}
          </div>

          {/* Amount Due Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Revised Rent Due (₹ Rupees)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-400 font-bold">₹</span>
              <input
                type="number"
                value={amountDueRupees}
                onChange={(e) => setAmountDueRupees(e.target.value)}
                className="w-full text-sm font-semibold pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                min="0"
              />
            </div>
            {amountDueRupees && (
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {formatINR(rupeesToPaise(amountDueRupees))}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
              <span>{isSubmitting ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
