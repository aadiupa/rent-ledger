import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'under_construction'>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !address.trim()) {
      setError('Property name and address are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          status,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add property');
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
            <h2 className="text-base font-semibold text-gray-900">Add New Property</h2>
            <p className="text-xs text-gray-500">Add an apartment building, commercial complex, or house</p>
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Property Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition ${
                  status === 'active'
                    ? 'border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>🏢 Active & Leased</div>
                <div className="text-[10px] text-gray-400 font-normal">Operational property</div>
              </button>
              <button
                type="button"
                onClick={() => setStatus('under_construction')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition ${
                  status === 'under_construction'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>🏗️ Under Construction</div>
                <div className="text-[10px] text-indigo-500 font-normal">New Capex project</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Property Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oakwood Residency"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Main Street, Suite 400, North Zone"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Description</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Commercial 3-floor building"
              className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              <span>{isSubmitting ? 'Adding...' : 'Create Property'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
