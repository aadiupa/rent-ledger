import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  ArrowLeftRight,
  Hammer,
  BarChart3,
  Settings,
  PlusCircle,
  Database,
  Wallet,
} from 'lucide-react';
import { formatINR } from '../utils/format';

export type NavView = 'dashboard' | 'properties' | 'tenants' | 'charges' | 'transactions' | 'expenses' | 'reports' | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenRecordModal: () => void;
  availableCash?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenRecordModal,
  availableCash = 0,
}) => {
  const navItems = [
    { id: 'dashboard' as NavView, label: 'Overview', icon: LayoutDashboard },
    { id: 'properties' as NavView, label: 'Properties', icon: Building2 },
    { id: 'tenants' as NavView, label: 'Tenants', icon: Users },
    { id: 'charges' as NavView, label: 'Rent Charges & Dues', icon: Receipt },
    { id: 'transactions' as NavView, label: 'Financial Ledger', icon: ArrowLeftRight },
    { id: 'expenses' as NavView, label: 'Expenses & Capex', icon: Hammer },
    { id: 'reports' as NavView, label: 'Reports & P&L', icon: BarChart3 },
    { id: 'settings' as NavView, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200/80 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold shadow-sm">
            <span className="text-base tracking-tight font-mono">RL</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-gray-900 text-sm tracking-tight">RentLedger</h1>
              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                DESKTOP
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Landlord Accounting</p>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-3">
        <button
          onClick={onOpenRecordModal}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition active:scale-[0.99]"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 px-3 py-1.5">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition ${
                  isActive ? 'text-gray-900' : 'text-gray-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-gray-100 space-y-2 bg-gray-50/60">
        {/* Available Cash Snapshot */}
        <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-gray-400" />
              Available Cash
            </span>
          </div>
          <div className="text-sm font-bold text-gray-900 tracking-tight font-mono">
            {formatINR(availableCash)}
          </div>
        </div>

        {/* SQLite Database Status */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px]">Local SQLite</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">v1.0 (Port 3002)</span>
        </div>
      </div>
    </aside>
  );
};
