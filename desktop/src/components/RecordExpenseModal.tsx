import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Hammer, Wrench, Building2 } from 'lucide-react';
import { Property } from '../types';
import { formatINR, rupeesToPaise } from '../utils/format';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSuccess: () => void;
  initialPropertyId?: number;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSuccess,
  initialPropertyId,
}) => {
  const [expenseType, setExpenseType] = useState<'capex' | 'opex'>('capex');
  const [propertyId, setPropertyId] = useState<number | ''>(initialPropertyId || '');
  const [category, setCategory] = useState<string>('Civil Construction & Labor');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExpenseTypeChange = (type: 'capex' | 'opex') => {
    setExpenseType(type);
    if (type === 'capex') {
      setCategory('Civil Construction & Labor');
    } else {
      setCategory('Repairs & Maintenance');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProp = properties.find((p) => p.id === Number(propertyId));
      const autoDesc = description.trim() || `${category}${vendor ? ` paid to ${vendor}` : ''}${selectedProp ? ` for ${selectedProp.name}` : ''}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          property_id: propertyId ? Number(propertyId) : null,
          tenant_id: null,
          transaction_type: 'expense',
          category,
          amount: paise,
          description: autoDesc,
          vendor: vendor.trim() || null,
          expense_type: expenseType,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record expense');
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
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Record Landlord Expense</h2>
            <p className="text-xs text-gray-500">Track construction capex, site building costs, or operational maintenance</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Classification Selector: Construction & Capex vs Opex */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleExpenseTypeChange('capex')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                expenseType === 'capex'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Hammer className="w-4 h-4 text-indigo-600" />
              <span>Construction / Capex (5th Property)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExpenseTypeChange('opex')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                expenseType === 'opex'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-gray-600" />
              <span>Operations & Repairs</span>
            </button>
          </div>

          {/* Property Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Property / Project</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">General Overhead / Unassigned</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'under_construction' ? '(Under Construction / Capex)' : '(Active)'}
                </option>
              ))}
            </select>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {expenseType === 'capex' ? (
                  <>
                    <option value="Civil Construction & Labor">Civil Construction & Labor</option>
                    <option value="Raw Building Materials">Raw Materials (Steel, Cement, Bricks)</option>
                    <option value="Architectural & Engineering">Architectural & Engineering</option>
                    <option value="Municipal Approvals & Sanctions">Municipal Approvals & Sanctions</option>
                    <option value="Electrical & Plumbing (New Site)">Electrical & Plumbing (New Site)</option>
                    <option value="Flooring, Fixtures & Finishing">Flooring, Fixtures & Finishing</option>
                    <option value="Landscaping & External Works">Landscaping & External Works</option>
                    <option value="Other Capex">Other Capex</option>
                  </>
                ) : (
                  <>
                    <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                    <option value="Property Tax">Property Tax</option>
                    <option value="Electricity & Utilities">Electricity & Utilities</option>
                    <option value="Society Maintenance">Society Maintenance</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Legal & Professional">Legal & Professional</option>
                    <option value="Other Expense">Other Expense</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹ Rupees)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-400 font-bold">₹</span>
              <input
                type="number"
                placeholder="0"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full text-sm font-semibold pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                min="1"
              />
            </div>
            {amountRupees && Number(amountRupees) > 0 && (
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                Formatted: {formatINR(rupeesToPaise(amountRupees))}
              </p>
            )}
          </div>

          {/* Vendor / Contractor & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor / Contractor / Payee</label>
              <input
                type="text"
                placeholder="e.g. Apex Civil Contractors"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Reference / Invoice # & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice / Bill / Reference #</label>
              <input
                type="text"
                placeholder="e.g. INV-2026-081"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Work Description / Items</label>
              <input
                type="text"
                placeholder="e.g. 50 tonnes steel bars deliver site"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 shrink-0">
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
              <span>{isSubmitting ? 'Recording...' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
