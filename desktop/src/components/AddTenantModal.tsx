import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Property } from '../types';
import { rupeesToPaise, formatINR } from '../utils/format';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSuccess: () => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSuccess,
}) => {
  const [propertyId, setPropertyId] = useState<number | ''>(properties[0]?.id || '');
  const [name, setName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [monthlyRentRupees, setMonthlyRentRupees] = useState('');
  const [rentDueDay, setRentDueDay] = useState(1);
  const [leaseStart, setLeaseStart] = useState(new Date().toISOString().split('T')[0]);
  const [securityDepositRupees, setSecurityDepositRupees] = useState('');
  const [openingArrearsRupees, setOpeningArrearsRupees] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proratedInfo = (() => {
    if (!leaseStart || !monthlyRentRupees || Number(monthlyRentRupees) <= 0) return null;
    const parts = leaseStart.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (d <= 1) return null;
    const daysInMonth = new Date(y, m, 0).getDate();
    const activeDays = daysInMonth - d + 1;
    const monthlyPaise = rupeesToPaise(monthlyRentRupees);
    const proratedPaise = Math.round((monthlyPaise * activeDays) / daysInMonth);
    return { d, daysInMonth, activeDays, proratedPaise };
  })();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !propertyId) {
      setError('Tenant name and Property are required');
      return;
    }

    const rentPaise = rupeesToPaise(monthlyRentRupees);
    if (rentPaise <= 0) {
      setError('Monthly rent must be greater than 0');
      return;
    }

    const depPaise = rupeesToPaise(securityDepositRupees);
    const arrearsPaise = rupeesToPaise(openingArrearsRupees);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: Number(propertyId),
          name: name.trim(),
          monthly_rent: rentPaise,
          rent_due_day: Number(rentDueDay),
          lease_start: leaseStart,
          security_deposit: depPaise,
          opening_arrears: arrearsPaise,
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create tenant');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add New Tenant</h2>
            <p className="text-xs text-gray-500">Configure lease terms, monthly rent liability & deposits</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Property & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Property</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              >
                <option value="">Select Property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit / Flat / Shop #</label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Flat 3A or Shop 4"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Tenant Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tenant Name / Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar or Urban Cafe"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          {/* Monthly Rent & Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Monthly Rent (₹ Rupees)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={monthlyRentRupees}
                  onChange={(e) => setMonthlyRentRupees(e.target.value)}
                  placeholder="25000"
                  className="w-full text-xs font-semibold pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  min="1"
                />
              </div>
              {monthlyRentRupees && (
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  {formatINR(rupeesToPaise(monthlyRentRupees))} / mo
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rent Due Day</label>
              <select
                value={rentDueDay}
                onChange={(e) => setRentDueDay(Number(e.target.value))}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of each month
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lease Start Date & Security Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Lease Start Date</label>
              <input
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                value={securityDepositRupees}
                onChange={(e) => setSecurityDepositRupees(e.target.value)}
                placeholder="0"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {proratedInfo && (
            <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200/70 text-[11px] text-indigo-900 flex items-center justify-between">
              <span>
                ⚡ <strong>Prorated First Month Rent:</strong> Lease starts on {proratedInfo.d}th ({proratedInfo.activeDays} days calculated for those dates).
              </span>
              <span className="font-mono font-bold text-indigo-700 ml-2 whitespace-nowrap">
                {formatINR(proratedInfo.proratedPaise)}
              </span>
            </div>
          )}

          {/* Opening Arrears Balance */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Opening Arrears Balance (if any past unpaid rent)
            </label>
            <input
              type="number"
              value={openingArrearsRupees}
              onChange={(e) => setOpeningArrearsRupees(e.target.value)}
              placeholder="0"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 90000 00000"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="tenant@example.com"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

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
              <span>{isSubmitting ? 'Creating...' : 'Create Tenant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
