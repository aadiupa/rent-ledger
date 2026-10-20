// ============================================================
// RentLedger — Security Deposits Register Screen
// Track deposits received, refunds, retentions, and liability
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
import { queryAll, executeSQL, withTransaction } from '../../src/db/database';
import { addTransaction } from '../../src/services/AccountingService';
import type { SecurityDeposit } from '../../src/models/types';
import {
  formatCurrency,
  formatDate,
  rupeesToPaise,
  getTodayISO,
} from '../../src/utils/currency';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

interface EnrichedDeposit extends SecurityDeposit {
  tenant_name: string;
  property_name: string;
}

export default function SecurityDepositsScreen() {
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [deposits, setDeposits] = useState<EnrichedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [actionDeposit, setActionDeposit] = useState<EnrichedDeposit | null>(null);
  const [actionType, setActionType] = useState<'refund' | 'retain'>('refund');
  const [actionAmountRupees, setActionAmountRupees] = useState('');
  const [actionReason, setActionReason] = useState('');

  const loadDeposits = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await queryAll<EnrichedDeposit>(
        db,
        `SELECT sd.*, t.name as tenant_name, p.name as property_name
         FROM security_deposits sd
         JOIN tenants t ON sd.tenant_id = t.id
         JOIN properties p ON sd.property_id = p.id
         ORDER BY sd.receipt_date DESC, sd.id DESC`
      );
      setDeposits(rows);
    } catch (err) {
      console.error('Error loading deposits:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadDeposits();
      }
    }, [isReady, db, loadDeposits])
  );

  const totalReceived = deposits.reduce((sum, d) => sum + d.amount_received, 0);
  const totalRefunded = deposits.reduce((sum, d) => sum + d.amount_refunded, 0);
  const totalRetained = deposits.reduce((sum, d) => sum + d.amount_retained, 0);
  const totalLiability = Math.max(0, totalReceived - totalRefunded - totalRetained);

  const handleOpenAction = (deposit: EnrichedDeposit, type: 'refund' | 'retain') => {
    setActionDeposit(deposit);
    setActionType(type);
    const balance = Math.max(
      0,
      deposit.amount_received - deposit.amount_refunded - deposit.amount_retained
    );
    setActionAmountRupees((balance / 100).toString());
    setActionReason(
      type === 'refund' ? 'Full/partial lease completion refund' : 'Deduction for damages / pending dues'
    );
  };

  const handleConfirmAction = async () => {
    if (!actionDeposit || !db) return;
    const paise = rupeesToPaise(actionAmountRupees);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      await withTransaction(db, async () => {
        if (actionType === 'refund') {
          // Record expense transaction to reduce available cash
          await addTransaction(db, {
            date: getTodayISO(),
            property_id: actionDeposit.property_id,
            tenant_id: actionDeposit.tenant_id,
            type: 'expense',
            category: 'Other Expense',
            amount: paise,
            description: `Security deposit refund to ${actionDeposit.tenant_name}`,
            is_opening_balance: false,
          });

          // Update deposit record
          await executeSQL(
            db,
            `UPDATE security_deposits
             SET amount_refunded = amount_refunded + ?, updated_at = datetime('now')
             WHERE id = ?`,
            [paise, actionDeposit.id]
          );
        } else {
          // Retained/deducted for damages or adjustments
          await executeSQL(
            db,
            `UPDATE security_deposits
             SET amount_retained = amount_retained + ?,
                 retained_reason = ?,
                 updated_at = datetime('now')
             WHERE id = ?`,
            [paise, actionReason.trim(), actionDeposit.id]
          );
        }
      });

      setActionDeposit(null);
      refresh();
      loadDeposits();
      Alert.alert('Success', `Deposit ${actionType === 'refund' ? 'refund' : 'deduction'} recorded.`);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Security Deposits' }} />

      <View style={styles.container}>
        {/* Liability Summary Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Refundable Liability</Text>
          <Text style={styles.heroAmount}>{formatCurrency(totalLiability)}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroSubText}>
              Received: {formatCurrency(totalReceived)}
            </Text>
            <Text style={styles.heroSubText}>•</Text>
            <Text style={styles.heroSubText}>
              Refunded: {formatCurrency(totalRefunded)}
            </Text>
            {totalRetained > 0 && (
              <>
                <Text style={styles.heroSubText}>•</Text>
                <Text style={styles.heroSubText}>
                  Retained: {formatCurrency(totalRetained)}
                </Text>
              </>
            )}
          </View>
        </View>

        {loading ? (
          <LoadingSpinner message="Loading Deposits..." />
        ) : (
          <FlatList
            data={deposits}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const balance = Math.max(
                0,
                item.amount_received - item.amount_refunded - item.amount_retained
              );
              return (
                <View style={styles.depositCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenantName}>{item.tenant_name}</Text>
                      <Text style={styles.propName}>
                        {item.property_name} • Received {formatDate(item.receipt_date)}
                      </Text>
                    </View>
                    <View style={styles.balanceBadge}>
                      <Text style={styles.balanceLabel}>Held</Text>
                      <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.rowDetails}>
                    <Text style={styles.detailText}>
                      Received: {formatCurrency(item.amount_received)}
                    </Text>
                    {item.amount_refunded > 0 && (
                      <Text style={[styles.detailText, { color: Colors.expense }]}>
                        Refunded: {formatCurrency(item.amount_refunded)}
                      </Text>
                    )}
                    {item.amount_retained > 0 && (
                      <Text style={[styles.detailText, { color: Colors.warning }]}>
                        Retained: {formatCurrency(item.amount_retained)}
                      </Text>
                    )}
                  </View>

                  {balance > 0 && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.refundBtn]}
                        onPress={() => handleOpenAction(item, 'refund')}
                      >
                        <Ionicons name="arrow-undo-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.refundBtnText}>Refund Deposit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.retainBtn]}
                        onPress={() => handleOpenAction(item, 'retain')}
                      >
                        <Text style={styles.retainBtnText}>Deduct / Adjust</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-outline" size={60} color={Colors.border} />
                <Text style={styles.emptyTitle}>No Security Deposits</Text>
                <Text style={styles.emptySubtitle}>
                  Deposits are recorded when tenants are created or via Income transactions.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Action Modal (Refund / Retain) */}
      <Modal visible={!!actionDeposit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionType === 'refund' ? 'Process Deposit Refund' : 'Deduct / Adjust Deposit'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Tenant: {actionDeposit?.tenant_name}
            </Text>

            <View style={styles.modalGroup}>
              <Text style={styles.modalLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                value={actionAmountRupees}
                onChangeText={setActionAmountRupees}
              />
            </View>

            <View style={styles.modalGroup}>
              <Text style={styles.modalLabel}>Notes / Reason</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                value={actionReason}
                onChangeText={setActionReason}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActionDeposit(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  actionType === 'refund'
                    ? { backgroundColor: Colors.primary }
                    : { backgroundColor: Colors.warning },
                ]}
                onPress={handleConfirmAction}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {actionType === 'refund' ? 'Confirm Refund' : 'Apply Deduction'}
                </Text>
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
  heroCard: {
    margin: Spacing.base,
    backgroundColor: Colors.deposit,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.md,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: Typography.xxxl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: Spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  heroSubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.xs,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  depositCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenantName: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  propName: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  balanceBadge: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.deposit,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  rowDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detailText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  refundBtn: {
    backgroundColor: Colors.primary,
  },
  refundBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Typography.xs,
  },
  retainBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retainBtnText: {
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
  modalGroup: {
    marginVertical: Spacing.sm,
  },
  modalLabel: {
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
  modalCancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modalCancelBtnText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.base,
  },
});
