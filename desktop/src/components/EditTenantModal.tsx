import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Building2, Shield, DollarSign, Calendar } from 'lucide-react';
import { Tenant, Property } from '../types';
import { formatINR, rupeesToPaise, paiseToRupees } from '../utils/format';

interface EditTenantModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  properties?: Property[];
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSuccess,
  properties = [],
}) => {
  const [propertyId, setPropertyId] = useState<number>(1);
  const [securityDepositRupees, setSecurityDepositRupees] = useState<string>('');
  const [monthlyRentRupees, setMonthlyRentRupees] = useState<string>('');
  const [leaseStart, setLeaseStart] = useState<string>('');
  const [rentDueDay, setRentDueDay] = useState<number>(1);
  const [openingArrearsRupees, setOpeningArrearsRupees] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setPropertyId(tenant.property_id);
      const depositVal =
        tenant.deposit_held !== undefined && tenant.deposit_held !== null
          ? tenant.deposit_held
          : (tenant.security_deposit || 0);
      setSecurityDepositRupees(String(paiseToRupees(depositVal)));
      setMonthlyRentRupees(String(paiseToRupees(tenant.monthly_rent)));
      setLeaseStart(tenant.lease_start || '');
      setRentDueDay(tenant.rent_due_day || 1);
      setOpeningArrearsRupees(String(paiseToRupees(tenant.opening_arrears || 0)));
      setIsActive(tenant.is_active === 1);
      setContactPhone(tenant.contact_phone || '');
      setContactEmail(tenant.contact_email || '');
      setNotes(tenant.notes || '');
      setError(null);
    }
  }, [tenant]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rentPaise = rupeesToPaise(monthlyRentRupees);
    if (rentPaise <= 0) {
      setError('Monthly rent must be greater than 0');
      return;
    }

    const arrearsPaise = rupeesToPaise(openingArrearsRupees);
    const depositPaise = rupeesToPaise(securityDepositRupees);

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: Number(propertyId),
          security_deposit: depositPaise,
          monthly_rent: rentPaise,
          lease_start: leaseStart || undefined,
          rent_due_day: Number(rentDueDay),
          opening_arrears: arrearsPaise,
          is_active: isActive,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update tenant details');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMovedProperty = Number(propertyId) !== tenant.property_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Edit Tenant & Lease — {tenant.name}
            </h2>
            <p className="text-xs text-gray-500">
              Reassign property, update security deposit, monthly rent, and lease terms
            </p>
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

          {/* Current Summary Context Banner */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Current Property:</span>
              <span className="font-semibold text-gray-900">
                {tenant.property_name} {tenant.unit_name ? `(${tenant.unit_name})` : ''}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Security Deposit Held:</span>
              <span className="font-mono font-semibold text-emerald-700">
                {formatINR(tenant.deposit_held !== undefined ? tenant.deposit_held : (tenant.security_deposit || 0))}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Current Outstanding Arrears:</span>
              <span className="font-mono font-bold text-rose-600">{formatINR(tenant.arrears)}</span>
            </div>
          </div>

          {/* Move Tenant to Another Property */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <span>Assigned Property (Move Tenant)</span>
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
            >
              {properties.length > 0 ? (
                properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status === 'under_construction' ? '(Under Construction)' : ''}
                  </option>
                ))
              ) : (
                <option value={tenant.property_id}>{tenant.property_name || `Property #${tenant.property_id}`}</option>
              )}
            </select>
            {hasMovedProperty && (
              <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200 rounded p-1.5 mt-1 font-medium">
                ⚠️ Moving this tenant will reassign their security deposit record and any upcoming unpaid rent charges to the new property.
              </p>
            )}
          </div>

          {/* Monthly Rent & Security Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Monthly Rent (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={monthlyRentRupees}
                  onChange={(e) => setMonthlyRentRupees(e.target.value)}
                  className="w-full text-xs font-semibold pl-6 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  min="100"
                />
              </div>
              {monthlyRentRupees && Number(monthlyRentRupees) > 0 && (
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  {formatINR(rupeesToPaise(monthlyRentRupees))}/mo
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <Shield className="w-3.5 h-3.5 text-gray-500" />
                <span>Security Deposit (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={securityDepositRupees}
                  onChange={(e) => setSecurityDepositRupees(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs font-semibold pl-6 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  min="0"
                />
              </div>
              {securityDepositRupees && Number(securityDepositRupees) > 0 && (
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  {formatINR(rupeesToPaise(securityDepositRupees))} held
                </p>
              )}
            </div>
          </div>

          {/* Rental Start Date & Rent Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>Lease / Rental Start Date</span>
              </label>
              <input
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Rent Due Day (Day of Month)
              </label>
              <select
                value={rentDueDay}
                onChange={(e) => setRentDueDay(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opening Arrears Balance */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Opening Arrears Balance (₹)
            </label>
            <input
              type="number"
              value={openingArrearsRupees}
              onChange={(e) => setOpeningArrearsRupees(e.target.value)}
              placeholder="0"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              min="0"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 90000 00000"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="tenant@example.com"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-gray-700 cursor-pointer">
              Active Tenant (Generates monthly rent charges)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Agreed 5% annual escalation from next March"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Actions */}
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
