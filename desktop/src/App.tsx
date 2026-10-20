import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Sidebar, NavView } from './components/Sidebar';
import { RecordTransactionModal } from './components/RecordTransactionModal';
import { EditTenantModal } from './components/EditTenantModal';
import { EditChargeModal } from './components/EditChargeModal';
import { WaiveChargeModal } from './components/WaiveChargeModal';
import { AddPropertyModal } from './components/AddPropertyModal';
import { AddTenantModal } from './components/AddTenantModal';
import { RecordExpenseModal } from './components/RecordExpenseModal';

import { DashboardView } from './views/DashboardView';
import { PropertiesView } from './views/PropertiesView';
import { TenantsView } from './views/TenantsView';
import { RentChargesView } from './views/RentChargesView';
import { TransactionsView } from './views/TransactionsView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

import {
  DashboardData,
  Property,
  Tenant,
  RentCharge,
  Transaction,
  SettingsData,
} from './types';
import { api } from './api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');

  // Core Data State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordTenantId, setRecordTenantId] = useState<number | undefined>(undefined);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingCharge, setEditingCharge] = useState<RentCharge | null>(null);
  const [waivingCharge, setWaivingCharge] = useState<RentCharge | null>(null);

  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [expensePropertyId, setExpensePropertyId] = useState<number | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Refresh all application data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [dash, props, tens, chgs, txs, sets] = await Promise.all([
        api.getDashboard(),
        api.getProperties(),
        api.getTenants(),
        api.getCharges(),
        api.getTransactions(),
        api.getSettings(),
      ]);

      setDashboardData(dash);
      setProperties(props);
      setTenants(tens);
      setCharges(chgs);
      setTransactions(txs);
      setSettings(sets);
      setLoadError(null);
    } catch (err: any) {
      console.error('Failed to fetch data from RentLedger server:', err);
      setLoadError(err?.message || 'Could not connect to the RentLedger background server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Open Record Modal helper
  const handleOpenRecordModal = (tenantId?: number) => {
    setRecordTenantId(tenantId);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAFAFA]">
      {/* Maybe-inspired Left Navigation Bar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenRecordModal={() => handleOpenRecordModal()}
        availableCash={dashboardData?.available_cash || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA]">
        {loadError && !dashboardData ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-200">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl mb-4 border border-rose-200 shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Server Connection Issue</h2>
            <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">{loadError}</p>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {isLoading ? 'Reconnecting...' : 'Retry Connection'}
            </button>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <DashboardView
                data={dashboardData}
                tenants={tenants}
                transactions={transactions}
                onOpenRecordModal={handleOpenRecordModal}
                onOpenEditTenant={(t) => setEditingTenant(t)}
                onNavigate={(view) => setCurrentView(view)}
                onRefresh={refreshData}
              />
            )}

        {currentView === 'properties' && (
          <PropertiesView
            properties={properties}
            onOpenAddProperty={() => setIsAddPropertyOpen(true)}
            onNavigateToTenants={() => setCurrentView('tenants')}
            onRefresh={refreshData}
          />
        )}

        {currentView === 'tenants' && (
          <TenantsView
            tenants={tenants}
            onOpenAddTenant={() => setIsAddTenantOpen(true)}
            onOpenEditTenant={(t) => setEditingTenant(t)}
            onOpenRecordModal={handleOpenRecordModal}
            onOpenEditCharge={(c) => setEditingCharge(c)}
            onOpenWaiveCharge={(c) => setWaivingCharge(c)}
            onRefresh={refreshData}
          />
        )}

        {currentView === 'charges' && (
          <RentChargesView
            charges={charges}
            onRefresh={refreshData}
            onOpenEditCharge={(c) => setEditingCharge(c)}
            onOpenWaiveCharge={(c) => setWaivingCharge(c)}
            onOpenRecordModal={handleOpenRecordModal}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            properties={properties}
            tenants={tenants}
            onOpenRecordModal={() => handleOpenRecordModal()}
            onRefresh={refreshData}
          />
        )}

        {currentView === 'expenses' && (
          <ExpensesView
            properties={properties}
            onOpenRecordExpense={(propId) => {
              setExpensePropertyId(propId);
              setIsRecordExpenseOpen(true);
            }}
            onOpenAddProperty={() => setIsAddPropertyOpen(true)}
            onRefresh={refreshData}
          />
        )}

        {currentView === 'reports' && (
          <ReportsView
            tenants={tenants}
            charges={charges}
            transactions={transactions}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView settings={settings} onRefresh={refreshData} />
        )}
          </>
        )}
      </main>

      {/* Modals */}
      <RecordTransactionModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordTenantId(undefined);
        }}
        properties={properties}
        tenants={tenants}
        onSuccess={refreshData}
        initialTenantId={recordTenantId}
      />

      {/* Record Expense & Capex Modal */}
      <RecordExpenseModal
        isOpen={isRecordExpenseOpen}
        onClose={() => {
          setIsRecordExpenseOpen(false);
          setExpensePropertyId(undefined);
        }}
        properties={properties}
        onSuccess={refreshData}
        initialPropertyId={expensePropertyId}
      />

      {/* Option to change liability rent at Tenant level */}
      <EditTenantModal
        tenant={editingTenant}
        isOpen={Boolean(editingTenant)}
        onClose={() => setEditingTenant(null)}
        onSuccess={refreshData}
        properties={properties}
      />

      {/* Option to change liability rent at Charge level */}
      <EditChargeModal
        charge={editingCharge}
        isOpen={Boolean(editingCharge)}
        onClose={() => setEditingCharge(null)}
        onSuccess={refreshData}
      />

      {/* Waive / Concession Modal */}
      <WaiveChargeModal
        charge={waivingCharge}
        isOpen={Boolean(waivingCharge)}
        onClose={() => setWaivingCharge(null)}
        onSuccess={refreshData}
      />

      {/* Add Property */}
      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={refreshData}
      />

      {/* Add Tenant */}
      <AddTenantModal
        isOpen={isAddTenantOpen}
        onClose={() => setIsAddTenantOpen(false)}
        properties={properties}
        onSuccess={refreshData}
      />
    </div>
  );
};
