// ============================================================
// RentLedger — Transaction Detail Screen
// Detailed breakdown, allocations audit, and delete action
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, queryAll } from '../../src/db/database';
import { deleteTransaction } from '../../src/services/AccountingService';
import type { Transaction, Tenant, Property, RentCharge } from '../../src/models/types';
import { formatCurrency, formatDate, formatPeriod } from '../../src/utils/currency';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { StatusBadge } from '../../src/components/common/SharedComponents';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

interface AllocationDetail {
  id: number;
  amount_allocated: number;
  period_year: number;
  period_month: number;
  due_date: string;
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [allocations, setAllocations] = useState<AllocationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!db || !id) return;
    try {
      const tx = await queryFirst<Transaction>(
        db,
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );
      setTransaction(tx);

      if (tx) {
        if (tx.tenant_id) {
          const ten = await queryFirst<Tenant>(
            db,
            'SELECT * FROM tenants WHERE id = ?',
            [tx.tenant_id]
          );
          setTenant(ten);
        }
        if (tx.property_id) {
          const prop = await queryFirst<Property>(
            db,
            'SELECT * FROM properties WHERE id = ?',
            [tx.property_id]
          );
          setProperty(prop);
        }

        const allocs = await queryAll<AllocationDetail>(
          db,
          `SELECT rpa.id, rpa.amount_allocated, rc.period_year, rc.period_month, rc.due_date
           FROM rent_payment_allocations rpa
           JOIN rent_charges rc ON rc.id = rpa.rent_charge_id
           WHERE rpa.transaction_id = ?`,
          [tx.id]
        );
        setAllocations(allocs);
      }
    } catch (err) {
      console.error('Error loading transaction:', err);
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadData();
      }
    }, [isReady, db, loadData])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction?',
      'Deleting this record will recalculate all cash totals and reverse any allocated rent charge payments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!db || !id) return;
            await deleteTransaction(db, parseInt(id, 10));
            refresh();
            router.back();
          },
        },
      ]
    );
  };

  if (!isReady || loading) {
    return <LoadingSpinner message="Loading Transaction..." />;
  }

  if (!transaction) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Transaction not found</Text>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';

  return (
    <>
      <Stack.Screen options={{ title: 'Transaction Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.typeBadgeRow}>
            <StatusBadge status={transaction.type} />
            <Text style={styles.categoryBadge}>{transaction.category}</Text>
          </View>

          <Text
            style={[
              styles.amountText,
              { color: isIncome ? Colors.income : Colors.expense },
            ]}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>

          <Text style={styles.descriptionText}>{transaction.description}</Text>
          <Text style={styles.dateText}>{formatDate(transaction.date)}</Text>
        </View>

        {/* Association & Metadata Card */}
        <SectionHeader title="Transaction Details" />
        <View style={styles.detailsCard}>
          {tenant && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tenant</Text>
              <TouchableOpacity
                onPress={() => router.push(`/tenant/${tenant.id}`)}
                style={styles.linkWrap}
              >
                <Text style={styles.linkText}>{tenant.name}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {property && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Property</Text>
              <TouchableOpacity
                onPress={() => router.push(`/property/${property.id}`)}
                style={styles.linkWrap}
              >
                <Text style={styles.linkText}>{property.name}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {transaction.payment_method ? transaction.payment_method.toUpperCase() : 'N/A'}
            </Text>
          </View>

          {transaction.reference ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference / UTR</Text>
              <Text style={styles.detailValue}>{transaction.reference}</Text>
            </View>
          ) : null}

          {transaction.notes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>{transaction.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Rent Charge Allocations */}
        {allocations.length > 0 && (
          <>
            <SectionHeader title="Applied Rent Allocations" />
            <View style={styles.detailsCard}>
              {allocations.map((a) => (
                <View key={a.id} style={styles.allocRow}>
                  <View>
                    <Text style={styles.allocPeriod}>
                      {formatPeriod(a.period_year, a.period_month)} Charge
                    </Text>
                    <Text style={styles.allocDate}>Due: {formatDate(a.due_date)}</Text>
                  </View>
                  <Text style={styles.allocAmount}>
                    {formatCurrency(a.amount_allocated)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Delete Action */}
        <View style={styles.dangerBox}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Transaction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  heroCard: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.sm,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  amountText: {
    fontSize: Typography.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  descriptionText: {
    fontSize: Typography.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  dateText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  detailsCard: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  detailLabel: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  allocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  allocPeriod: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  allocDate: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  allocAmount: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.primary,
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
});
