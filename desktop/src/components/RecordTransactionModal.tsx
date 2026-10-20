import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Property, Tenant } from '../types';
import { formatINR, rupeesToPaise } from '../utils/format';

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  tenants: Tenant[];
  onSuccess: () => void;
  initialTenantId?: number;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  onClose,
  properties,
  tenants,
  onSuccess,
  initialTenantId,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>(initialTenantId || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | ''>('');
  const [category, setCategory] = useState<string>('Monthly Rent');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialTenantId if provided
  useEffect(() => {
    if (initialTenantId) {
      setSelectedTenantId(initialTenantId);
      const t = tenants.find((item) => item.id === initialTenantId);
      if (t) {
        setSelectedPropertyId(t.property_id);
        setAmountRupees(String(Math.round(t.monthly_rent / 100)));
      }
    }
  }, [initialTenantId, tenants]);

  // When tenant changes, sync property and suggested amount
  const handleTenantChange = (tenantId: number | '') => {
    setSelectedTenantId(tenantId);
    if (tenantId) {
      const t = tenants.find((item) => item.id === tenantId);
      if (t) {
        setSelectedPropertyId(t.property_id);
        if (!amountRupees && t.monthly_rent) {
          setAmountRupees(String(Math.round(t.monthly_rent / 100)));
        }
      }
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    if (newType === 'income') {
      setCategory('Monthly Rent');
    } else {
      setCategory('Repairs & Maintenance');
    }
  };

  if (!isOpen) return null;

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
      const defaultDesc =
        type === 'income'
          ? `${category} receipt${selectedTenantId ? ` from ${tenants.find((t) => t.id === selectedTenantId)?.name}` : ''}`
          : `${category} expense`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          property_id: selectedPropertyId ? Number(selectedPropertyId) : null,
          tenant_id: selectedTenantId ? Number(selectedTenantId) : null,
          transaction_type: type,
          category,
          amount: paise,
          description: description.trim() || defaultDesc,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record transaction');
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
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Record Transaction</h2>
            <p className="text-xs text-gray-500">Record rent collections, security deposits, or landlord expenses</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Type Selector (Income vs Expense) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Income (Receipt)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>Expense (Payment)</span>
            </button>
          </div>

          {/* Category & Tenant / Property */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {type === 'income' ? (
                  <>
                    <option value="Monthly Rent">Monthly Rent</option>
                    <option value="Arrears Recovery">Arrears Recovery</option>
                    <option value="Security Deposit">Security Deposit</option>
                    <option value="Late Fee">Late Fee</option>
                    <option value="Other Income">Other Income</option>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
          </div>

          {/* Tenant Selection (For rent / deposits) */}
          {type === 'income' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tenant {category.includes('Rent') || category.includes('Arrears') ? '(Auto-allocates to dues)' : ''}
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select Tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.property_name} {t.arrears > 0 ? `(Arrears: ${formatINR(t.arrears)})` : '(Clear)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Property Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Property</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">No specific property / General</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹ Rupees)</label>
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

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference / UTR / Cheque #</label>
              <input
                type="text"
                placeholder="e.g. UTR-9823192"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="e.g. October rent paid via Google Pay"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Footer Actions */}
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
              <span>{isSubmitting ? 'Recording...' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
