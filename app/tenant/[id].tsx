// ============================================================
// RentLedger — Tenant Detail & Rent History Screen
// Detailed arrears, monthly charges, deposits, and transactions
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, queryAll, executeSQL } from '../../src/db/database';
import {
  getTenantArrears,
  getTenantDepositBalance,
  updateRentChargeAmount,
} from '../../src/services/AccountingService';
import type { Tenant, Property, RentCharge, Transaction } from '../../src/models/types';
import { formatCurrency, formatDate, formatPeriod, rupeesToPaise } from '../../src/utils/currency';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { StatusBadge } from '../../src/components/common/SharedComponents';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [arrears, setArrears] = useState<number>(0);
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Rent Charge Modal
  const [chargeToEdit, setChargeToEdit] = useState<RentCharge | null>(null);
  const [editAmountRupees, setEditAmountRupees] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');

  const handleOpenEditCharge = (rc: RentCharge) => {
    setChargeToEdit(rc);
    setEditAmountRupees((rc.amount_due / 100).toString());
    setEditDueDate(rc.due_date);
  };

  const handleConfirmEditCharge = async () => {
    if (!chargeToEdit || !db) return;
    const newPaise = rupeesToPaise(editAmountRupees);
    if (newPaise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid rent due amount greater than 0.');
      return;
    }

    try {
      await updateRentChargeAmount(db, chargeToEdit.id, newPaise, editDueDate.trim() || undefined);
      setChargeToEdit(null);
      refresh();
      loadTenantData();
      Alert.alert('Rent Liability Updated', 'The rent charge amount has been updated.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const loadTenantData = useCallback(async () => {
    if (!db || !id) return;
    try {
      const ten = await queryFirst<Tenant>(db, 'SELECT * FROM tenants WHERE id = ?', [id]);
      setTenant(ten);

      if (ten) {
        const prop = await queryFirst<Property>(
          db,
          'SELECT * FROM properties WHERE id = ?',
          [ten.property_id]
        );
        setProperty(prop);

        const arr = await getTenantArrears(db, ten.id);
        setArrears(arr);

        const dep = await getTenantDepositBalance(db, ten.id);
        setDepositBalance(dep);

        const chgs = await queryAll<RentCharge>(
          db,
          'SELECT * FROM rent_charges WHERE tenant_id = ? ORDER BY period_year DESC, period_month DESC',
          [ten.id]
        );
        setCharges(chgs);

        const txs = await queryAll<Transaction>(
          db,
          'SELECT * FROM transactions WHERE tenant_id = ? ORDER BY date DESC, id DESC LIMIT 15',
          [ten.id]
        );
        setTransactions(txs);
      }
    } catch (err) {
      console.error('Error loading tenant data:', err);
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadTenantData();
      }
    }, [isReady, db, loadTenantData])
  );

  const handleDeleteTenant = () => {
    Alert.alert(
      'Delete Tenant?',
      'Deleting this tenant will delete their associated rent charges and unassign their transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!db || !id) return;
            await executeSQL(db, 'DELETE FROM tenants WHERE id = ?', [id]);
            refresh();
            router.back();
          },
        },
      ]
    );
  };

  if (!isReady || loading) {
    return <LoadingSpinner message="Loading Tenant Profile..." />;
  }

  if (!tenant) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Tenant not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: tenant.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/tenant/add?id=${tenant.id}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerEdit}>Edit</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLetter}>
              {tenant.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.tenantName}>{tenant.name}</Text>
          <Text style={styles.propertyInfo}>
            {property?.name ?? 'Property'} • Rent Due on Day {tenant.rent_due_day}
          </Text>

          {tenant.contact_phone ? (
            <Text style={styles.contactText}>📞 {tenant.contact_phone}</Text>
          ) : null}

          {/* Quick Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
              onPress={() =>
                router.push(
                  `/transaction/add?tenantId=${tenant.id}&type=income&category=Monthly+Rent`
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Receive Rent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
              onPress={() =>
                router.push(
                  `/transaction/add?tenantId=${tenant.id}&type=income&category=Arrears+Recovery`
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="hourglass-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Pay Arrears</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Metrics Row */}
        <View style={styles.metricsCard}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Monthly Rent</Text>
            <Text style={styles.metricValue}>{formatCurrency(tenant.monthly_rent)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Total Arrears</Text>
            <Text
              style={[
                styles.metricValue,
                { color: arrears > 0 ? Colors.danger : Colors.success },
              ]}
            >
              {formatCurrency(arrears)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Deposit Held</Text>
            <Text style={[styles.metricValue, { color: Colors.deposit }]}>
              {formatCurrency(depositBalance)}
            </Text>
          </View>
        </View>

        {/* Change Monthly Rent & Liabilities Shortcut */}
        <TouchableOpacity
          style={styles.editLiabilitiesButton}
          onPress={() => router.push(`/tenant/add?id=${tenant.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.editLiabilitiesLeft}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.editLiabilitiesText}>Change Monthly Rent & Liabilities</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>

        {/* Opening Arrears Information */}
        {tenant.opening_arrears > 0 && (
          <View style={styles.openingArrearsCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.openingArrearsTitle}>Opening Arrears Balance</Text>
              <Text style={styles.openingArrearsText}>
                {formatCurrency(tenant.opening_arrears)} carried forward as of{' '}
                {tenant.opening_arrears_date ? formatDate(tenant.opening_arrears_date) : 'lease start'}.
              </Text>
            </View>
          </View>
        )}

        {/* Rent Charges Ledger */}
        <SectionHeader
          title={`Rent Charges (${charges.length})`}
          action="View All"
          onAction={() => router.push('/charges')}
        />

        <View style={styles.chargesList}>
          {charges.length > 0 ? (
            charges.map((rc) => {
              const outstanding = Math.max(0, rc.amount_due - rc.amount_paid - rc.waived_amount);
              return (
                <TouchableOpacity
                  key={rc.id}
                  style={styles.chargeItem}
                  onPress={() => handleOpenEditCharge(rc)}
                  activeOpacity={0.7}
                >
                  <View style={styles.chargeLeft}>
                    <Text style={styles.chargePeriod}>
                      {formatPeriod(rc.period_year, rc.period_month)}
                    </Text>
                    <Text style={styles.chargeDue}>Due: {formatDate(rc.due_date)}</Text>
                  </View>
                  <View style={styles.chargeCenter}>
                    <StatusBadge status={rc.status} small />
                  </View>
                  <View style={styles.chargeRight}>
                    <Text style={styles.chargeDueAmount}>
                      Due: {formatCurrency(rc.amount_due)}
                    </Text>
                    <Text
                      style={[
                        styles.chargePaidAmount,
                        { color: outstanding > 0 ? Colors.danger : Colors.success },
                      ]}
                    >
                      {outstanding > 0
                        ? `Balance: ${formatCurrency(outstanding)}`
                        : 'Fully Paid'}
                    </Text>
                  </View>
                  <View style={{ marginLeft: Spacing.sm }}>
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No rent charges generated yet.</Text>
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <SectionHeader title="Recent Payments & Receipts" />
        <View style={styles.txList}>
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              >
                <View style={styles.txLeft}>
                  <Text style={styles.txCategory}>{tx.category}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                  {tx.description ? (
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? Colors.income : Colors.expense },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                  <Text style={styles.txMethod}>{tx.payment_method || 'Payment'}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No transactions recorded for this tenant.</Text>
            </View>
          )}
        </View>

        {/* Danger: Delete Tenant */}
        <View style={styles.dangerBox}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteTenant}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Tenant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Rent Liability / Due Modal */}
      <Modal visible={!!chargeToEdit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Rent Liability</Text>
            <Text style={styles.modalSubtitle}>
              {tenant.name} •{' '}
              {chargeToEdit && formatPeriod(chargeToEdit.period_year, chargeToEdit.period_month)}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rent Due Amount (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={editAmountRupees}
                onChangeText={setEditAmountRupees}
                placeholder="e.g. 17500"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={editDueDate}
                onChangeText={setEditDueDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setChargeToEdit(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleConfirmEditCharge}
              >
                <Text style={styles.saveBtnText}>Update Liability</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  headerEdit: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  profileCard: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.sm,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarLetter: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  tenantName: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  propertyInfo: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  contactText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.sm,
  },
  metricsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadow.sm,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Colors.divider,
  },
  metricLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  openingArrearsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  openingArrearsTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  openingArrearsText: {
    fontSize: Typography.xs,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  chargesList: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  chargeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  chargeLeft: {
    flex: 1.2,
  },
  chargePeriod: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chargeDue: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chargeCenter: {
    marginHorizontal: Spacing.xs,
  },
  chargeRight: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  chargeDueAmount: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  chargePaidAmount: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  txList: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  txLeft: {
    flex: 1,
  },
  txCategory: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txDate: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txDesc: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  txMethod: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  emptyBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
  },
  dangerBox: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  editLiabilitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  editLiabilitiesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editLiabilitiesText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
