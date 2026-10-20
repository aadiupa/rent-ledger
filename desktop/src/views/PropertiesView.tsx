import React, { useState } from 'react';
import { Building2, Plus, MapPin, Users, Home, Search } from 'lucide-react';
import { Property } from '../types';
import { formatINR } from '../utils/format';

interface PropertiesViewProps {
  properties: Property[];
  onOpenAddProperty: () => void;
  onNavigateToTenants: () => void;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties,
  onOpenAddProperty,
  onNavigateToTenants,
}) => {
  const [search, setSearch] = useState('');

  const filtered = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalRentRoll = properties.reduce((sum, p) => sum + (p.total_monthly_rent || 0), 0);
  const totalTenants = properties.reduce((sum, p) => sum + (p.tenant_count || 0), 0);
  const totalUnits = properties.reduce((sum, p) => sum + (p.unit_count || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Properties</h1>
          <p className="text-xs text-gray-500">Manage real estate assets, buildings, units & rent rolls</p>
        </div>
        <button
          onClick={onOpenAddProperty}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Properties</div>
          <div className="text-2xl font-bold text-gray-900 font-mono">{properties.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">{totalUnits} configured units</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Active Leased Tenants</div>
          <div className="text-2xl font-bold text-gray-900 font-mono">{totalTenants}</div>
          <div className="text-[11px] text-gray-400 mt-1">Generating recurring monthly rent</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-gray-200/80 shadow-xs">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Monthly Rent Roll</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{formatINR(totalRentRoll)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Expected portfolio gross monthly</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search properties or addresses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((prop) => (
          <div
            key={prop.id}
            className="rounded-2xl bg-white border border-gray-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-gray-300 transition"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900">{prop.name}</h3>
                      {prop.status === 'under_construction' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                          Under Construction
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[200px]">{prop.address}</span>
                    </p>
                  </div>
                </div>
              </div>

              {prop.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {prop.notes}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Units / Tenants</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {prop.tenant_count || 0} active tenants
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Monthly Rent Roll</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm mt-0.5 block">
                    {formatINR(prop.total_monthly_rent || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-400 text-[11px]">ID #{prop.id}</span>
              <button
                onClick={onNavigateToTenants}
                className="text-[11px] font-semibold text-gray-700 hover:text-gray-900 transition"
              >
                View Tenants →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
