import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ArrowDownLeft, ArrowUpRight, CreditCard, Building2, User, Hash } from 'lucide-react';
import { Transaction, Property, Tenant } from '../types';
import { formatINR, rupeesToPaise, paiseToRupees } from '../utils/format';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  properties?: Property[];
  tenants?: Tenant[];
}

const COMMON_PAYMENT_METHODS = [
  'Cash',
  'Direct',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'RTGS',
  'NEFT',
  'Debit / Credit Card',
  'Auto-Pay / Mandate',
  'Other',
];

const INCOME_CATEGORIES = [
  'Monthly Rent',
  'Arrears Recovery',
  'Security Deposit',
  'Late Fee',
  'Parking Fee',
  'Maintenance Surcharge',
  'Other Income',
];

const CAPEX_CATEGORIES = [
  'Civil Construction & Labor',
  'Raw Building Materials',
  'Architectural & Engineering',
  'Municipal Approvals & Sanctions',
  'Electrical & Plumbing (New Site)',
  'Flooring, Fixtures & Finishing',
  'Landscaping & External Works',
  'Other Capex',
];

const OPEX_CATEGORIES = [
  'Repairs & Maintenance',
  'Property Tax',
  'Electricity & Utilities',
  'Society Maintenance',
  'Insurance',
  'Legal & Professional',
  'Brokerage & Commission',
  'Other Expense',
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
  properties = [],
  tenants = [],
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [customPaymentMethod, setCustomPaymentMethod] = useState<string>('');
  const [isCustomPayment, setIsCustomPayment] = useState<boolean>(false);
  const [reference, setReference] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [propertyId, setPropertyId] = useState<number | ''>('');
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [vendor, setVendor] = useState<string>('');
  const [expenseType, setExpenseType] = useState<'capex' | 'opex'>('opex');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      const pm = transaction.payment_method || 'Direct';
      const isKnown = COMMON_PAYMENT_METHODS.includes(pm);
      if (isKnown) {
        setPaymentMethod(pm);
        setIsCustomPayment(false);
        setCustomPaymentMethod('');
      } else {
        setPaymentMethod('Other');
        setIsCustomPayment(true);
        setCustomPaymentMethod(pm);
      }

      setReference(transaction.reference || '');
      setCategory(transaction.category || '');
      setAmountRupees(String(paiseToRupees(transaction.amount)));
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setDescription(transaction.description || '');
      setPropertyId(transaction.property_id || '');
      setTenantId(transaction.tenant_id || '');
      setVendor(transaction.vendor || '');
      setExpenseType(transaction.expense_type || 'opex');
      setError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.transaction_type === 'income';

  const handlePaymentMethodSelect = (val: string) => {
    setPaymentMethod(val);
    if (val === 'Other') {
      setIsCustomPayment(true);
    } else {
      setIsCustomPayment(false);
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

    const finalPaymentMethod = isCustomPayment
      ? customPaymentMethod.trim() || 'Other'
      : paymentMethod;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          property_id: propertyId ? Number(propertyId) : null,
          tenant_id: isIncome && tenantId ? Number(tenantId) : null,
          category,
          amount: paise,
          description: description.trim() || `${category} ${isIncome ? 'receipt' : 'expense'}`,
          payment_method: finalPaymentMethod,
          reference: reference.trim() || null,
          vendor: !isIncome && vendor.trim() ? vendor.trim() : null,
          expense_type: !isIncome ? expenseType : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update transaction');
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
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Edit Financial Ledger Entry #{transaction.id}
              </h2>
              <p className="text-xs text-gray-500">
                Modify payment mode, reference, category, or transaction amounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Context Badge */}
          <div className="p-3 bg-gray-50/80 border border-gray-200/70 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                  isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isIncome ? 'Income / Receipt' : 'Expense / Outflow'}
              </span>
              <span className="text-gray-500 font-medium">Original:</span>
              <span className="font-semibold text-gray-900">{transaction.payment_method || 'Direct'}</span>
            </div>
            <div className="font-mono font-bold text-gray-900">
              {formatINR(transaction.amount)}
            </div>
          </div>

          {/* Payment Method / Mode & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                <span>Payment Mode</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => handlePaymentMethodSelect(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {COMMON_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <Hash className="w-3.5 h-3.5 text-gray-500" />
                <span>Reference / UTR / Cheque #</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR-9821829 or Chq #0412"
                className="w-full text-xs font-mono rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Custom Payment Mode Input (if Other selected) */}
          {isCustomPayment && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Specify Custom Payment Method
              </label>
              <input
                type="text"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                placeholder="e.g. Paytm Wallet, Forex Transfer, Escrow, etc."
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount (₹ Rupees)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full text-xs font-semibold pl-6 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  min="1"
                />
              </div>
              {amountRupees && Number(amountRupees) > 0 && (
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  {formatINR(rupeesToPaise(amountRupees))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {isIncome ? (
                  INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                ) : expenseType === 'capex' ? (
                  CAPEX_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                ) : (
                  OPEX_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
                <option value="Custom">Custom / Other Category</option>
              </select>
            </div>
          </div>

          {/* Property & Tenant / Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                <span>Assigned Property</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">General Overhead / Unassigned</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status === 'under_construction' ? '(Construction)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {isIncome ? (
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>Tenant</span>
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">No specific tenant / Direct</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.property_name})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vendor / Contractor
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. UltraTech Cement, Electrician"
                  className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}
          </div>

          {/* Expense Type (CapEx vs OpEx) */}
          {!isIncome && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseType('opex')}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    expenseType === 'opex'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Operational Expense (OpEx)
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseType('capex')}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    expenseType === 'capex'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Capital Expenditure (CapEx)
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly rent received in Cash"
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
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
