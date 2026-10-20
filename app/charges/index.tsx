// ============================================================
// RentLedger — Rent Charges & Arrears Management Screen
// Generate charges, filter by status, waive/adjust charges
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryAll, executeSQL } from '../../src/db/database';
import {
  generateMonthlyCharges,
  updateRentChargeStatuses,
  updateRentChargeAmount,
} from '../../src/services/AccountingService';
import type { RentCharge } from '../../src/models/types';
import { formatCurrency, formatDate, formatPeriod, rupeesToPaise } from '../../src/utils/currency';
import { StatusBadge } from '../../src/components/common/SharedComponents';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

interface EnrichedCharge extends RentCharge {
  tenant_name: string;
}

type StatusFilter = 'all' | 'overdue' | 'due' | 'partially_paid' | 'paid';

export default function RentChargesScreen() {
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [charges, setCharges] = useState<EnrichedCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Waive Modal State
  const [selectedCharge, setSelectedCharge] = useState<EnrichedCharge | null>(null);
  const [waiveAmountRupees, setWaiveAmountRupees] = useState<string>('');
  const [waiveReason, setWaiveReason] = useState<string>('');

  // Edit Due / Liability Modal State
  const [chargeToEdit, setChargeToEdit] = useState<EnrichedCharge | null>(null);
  const [editAmountRupees, setEditAmountRupees] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');

  const loadCharges = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      await updateRentChargeStatuses(db);
      const rows = await queryAll<EnrichedCharge>(
        db,
        `SELECT rc.*, t.name as tenant_name
         FROM rent_charges rc
         JOIN tenants t ON rc.tenant_id = t.id
         ORDER BY rc.due_date DESC, rc.id DESC`
      );
      setCharges(rows);
    } catch (err) {
      console.error('Error loading rent charges:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadCharges();
      }
    }, [isReady, db, loadCharges])
  );

  const handleGenerateNow = async () => {
    if (!db) return;
    try {
      const count = await generateMonthlyCharges(db);
      refresh();
      loadCharges();
      Alert.alert('Rent Charges', `${count} new rent charges were generated.`);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleOpenWaiveModal = (chg: EnrichedCharge) => {
    setSelectedCharge(chg);
    const balance = Math.max(0, chg.amount_due - chg.amount_paid - chg.waived_amount);
    setWaiveAmountRupees((balance / 100).toString());
    setWaiveReason('');
  };

  const handleOpenEditModal = (chg: EnrichedCharge) => {
    setChargeToEdit(chg);
    setEditAmountRupees((chg.amount_due / 100).toString());
    setEditDueDate(chg.due_date);
  };

  const handleConfirmEdit = async () => {
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
      loadCharges();
      Alert.alert('Liability Updated', 'Rent charge liability amount has been updated.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleConfirmWaive = async () => {
    if (!selectedCharge || !db) return;
    const waivePaise = rupeesToPaise(waiveAmountRupees);
    if (waivePaise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to waive.');
      return;
    }

    try {
      await executeSQL(
        db,
        `UPDATE rent_charges
         SET waived_amount = waived_amount + ?,
             waived_reason = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        [waivePaise, waiveReason.trim() || 'Landlord concession/waiver', selectedCharge.id]
      );
      await updateRentChargeStatuses(db);
      setSelectedCharge(null);
      refresh();
      loadCharges();
      Alert.alert('Waiver Recorded', 'Rent charge balance updated.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const filteredCharges = charges.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rent Charges & Dues',
          headerRight: () => (
            <TouchableOpacity onPress={handleGenerateNow} style={styles.headerBtn}>
              <Ionicons name="flash-outline" size={18} color={Colors.primary} />
              <Text style={styles.headerBtnText}>Generate</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Status Filter Tabs */}
        <View style={styles.tabContainer}>
          {(['all', 'overdue', 'partially_paid', 'due', 'paid'] as StatusFilter[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, filter === tab && styles.tabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab === 'all'
                  ? 'All'
                  : tab === 'partially_paid'
                  ? 'Partial'
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <LoadingSpinner message="Checking Charges..." />
        ) : (
          <FlatList
            data={filteredCharges}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const outstanding = Math.max(
                0,
                item.amount_due - item.amount_paid - item.waived_amount
              );
              return (
                <View style={styles.chargeCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenantName}>{item.tenant_name}</Text>
                      <Text style={styles.chargePeriod}>
                        {formatPeriod(item.period_year, item.period_month)} • Due {formatDate(item.due_date)}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.amountBreakdown}>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>Due</Text>
                      <Text style={styles.amountVal}>{formatCurrency(item.amount_due)}</Text>
                    </View>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>Paid</Text>
                      <Text style={[styles.amountVal, { color: Colors.success }]}>
                        {formatCurrency(item.amount_paid)}
                      </Text>
                    </View>
                    {item.waived_amount > 0 && (
                      <View style={styles.amountCol}>
                        <Text style={styles.amountLabel}>Waived</Text>
                        <Text style={[styles.amountVal, { color: Colors.textTertiary }]}>
                          {formatCurrency(item.waived_amount)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>Outstanding</Text>
                      <Text
                        style={[
                          styles.amountVal,
                          { color: outstanding > 0 ? Colors.danger : Colors.success },
                        ]}
                      >
                        {formatCurrency(outstanding)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    {outstanding > 0 && (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() =>
                          router.push(
                            `/transaction/add?tenantId=${item.tenant_id}&type=income&category=Monthly+Rent`
                          )
                        }
                      >
                        <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.payBtnText}>Record Payment</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={styles.editBtnText}>Edit Due</Text>
                    </TouchableOpacity>

                    {outstanding > 0 && (
                      <TouchableOpacity
                        style={styles.waiveBtn}
                        onPress={() => handleOpenWaiveModal(item)}
                      >
                        <Text style={styles.waiveBtnText}>Waive</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color={Colors.border} />
                <Text style={styles.emptyTitle}>No Rent Charges Found</Text>
                <Text style={styles.emptySubtitle}>
                  Rent charges are automatically generated when due dates arrive.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Edit Rent Liability / Due Modal */}
      <Modal visible={!!chargeToEdit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Rent Liability</Text>
            <Text style={styles.modalSubtitle}>
              {chargeToEdit?.tenant_name} •{' '}
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
                style={[styles.confirmWaiveBtn, { backgroundColor: Colors.primary }]}
                onPress={handleConfirmEdit}
              >
                <Text style={styles.confirmWaiveBtnText}>Update Liability</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Waive / Concession Modal */}
      <Modal visible={!!selectedCharge} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Waive Rent Charge</Text>
            <Text style={styles.modalSubtitle}>
              Tenant: {selectedCharge?.tenant_name} (
              {selectedCharge &&
                formatPeriod(selectedCharge.period_year, selectedCharge.period_month)}
              )
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount to Waive (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={waiveAmountRupees}
                onChangeText={setWaiveAmountRupees}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason / Remarks</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                placeholder="e.g. Vacancy discount, renovation delay waiver"
                value={waiveReason}
                onChangeText={setWaiveReason}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedCharge(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmWaiveBtn}
                onPress={handleConfirmWaive}
              >
                <Text style={styles.confirmWaiveBtnText}>Apply Waiver</Text>
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
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
  },
  headerBtnText: {
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  chargeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantName: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chargePeriod: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  amountBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountCol: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  amountVal: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  payBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.xs,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '10',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  editBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.xs,
  },
  waiveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  waiveBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: Typography.xs,
  },
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
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
    marginVertical: Spacing.xs,
  },
  inputGroup: {
    marginVertical: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  cancelBtnText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmWaiveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  confirmWaiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.base,
  },
});
