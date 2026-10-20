// ============================================================
// RentLedger — Add Transaction Screen (Income / Expense)
// Automatic & manual rent charge allocation support
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryAll, queryFirst } from '../../src/db/database';
import { addTransaction, getTodayISO } from '../../src/services/AccountingService';
import type { Tenant, Property, Category, RentCharge } from '../../src/models/types';
import {
  rupeesToPaise,
  formatCurrency,
  formatPeriod,
  parseCurrencyInput,
} from '../../src/utils/currency';
import { AmountInput } from '../../src/components/common/AmountInput';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / GPay' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'neft', label: 'NEFT / RTGS' },
  { id: 'other', label: 'Other' },
];

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{
    type?: 'income' | 'expense';
    tenantId?: string;
    category?: string;
  }>();
  const router = useRouter();
  const { db, refresh } = useDatabase();

  const [type, setType] = useState<'income' | 'expense'>(params.type ?? 'income');
  const [date, setDate] = useState<string>(getTodayISO());
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [category, setCategory] = useState<string>(params.category ?? 'Monthly Rent');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>(
    params.tenantId ? parseInt(params.tenantId, 10) : undefined
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>();
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Rent charge allocation state
  const [unpaidCharges, setUnpaidCharges] = useState<RentCharge[]>([]);
  const [isManualAlloc, setIsManualAlloc] = useState<boolean>(false);
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  // Load categories, properties, and tenants
  useEffect(() => {
    if (!db) return;
    queryAll<Category>(db, 'SELECT * FROM categories ORDER BY name ASC').then(setCategories);
    queryAll<Property>(db, 'SELECT * FROM properties ORDER BY name ASC').then(setProperties);
    queryAll<Tenant>(db, 'SELECT * FROM tenants WHERE is_active = 1 ORDER BY name ASC').then(
      (tens) => {
        setTenants(tens);
        if (params.tenantId) {
          const match = tens.find((t) => t.id === parseInt(params.tenantId!, 10));
          if (match) setSelectedPropertyId(match.property_id);
        }
      }
    );
  }, [db, params.tenantId]);

  // Adjust default category when type flips
  useEffect(() => {
    if (type === 'income') {
      setCategory('Monthly Rent');
    } else {
      setCategory('Repairs & Maintenance');
    }
  }, [type]);

  // Load unpaid charges for selected tenant if rent/arrears
  useEffect(() => {
    if (!db || !selectedTenantId) {
      setUnpaidCharges([]);
      return;
    }
    if (type === 'income' && (category === 'Monthly Rent' || category === 'Arrears Recovery')) {
      queryAll<RentCharge>(
        db,
        `SELECT * FROM rent_charges
         WHERE tenant_id = ? AND status NOT IN ('paid', 'waived')
         ORDER BY due_date ASC`,
        [selectedTenantId]
      ).then(setUnpaidCharges);
    } else {
      setUnpaidCharges([]);
    }
  }, [db, selectedTenantId, type, category]);

  // Auto-generate description suggestion
  useEffect(() => {
    if (selectedTenantId && tenants.length > 0) {
      const ten = tenants.find((t) => t.id === selectedTenantId);
      if (ten) {
        setSelectedPropertyId(ten.property_id);
        if (!description || description.startsWith('Rent') || description.startsWith('Payment')) {
          setDescription(`${category} received from ${ten.name}`);
        }
      }
    }
  }, [selectedTenantId, category, tenants]);

  const handleSave = async () => {
    const paise = rupeesToPaise(amountRupees);
    if (!paise || paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a transaction description.');
      return;
    }
    if (!db) return;

    setLoading(true);
    try {
      let explicitAllocations: { chargeId: number; amount: number }[] | undefined = undefined;

      if (isManualAlloc && Object.keys(allocations).length > 0) {
        explicitAllocations = Object.entries(allocations)
          .map(([cId, amtStr]) => ({
            chargeId: parseInt(cId, 10),
            amount: rupeesToPaise(amtStr),
          }))
          .filter((a) => a.amount > 0);
      }

      await addTransaction(
        db,
        {
          date,
          property_id: selectedPropertyId,
          tenant_id: selectedTenantId,
          type,
          category,
          amount: paise,
          description: description.trim(),
          payment_method: paymentMethod as any,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          is_opening_balance: false,
        },
        explicitAllocations
      );

      refresh();
      router.back();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: type === 'income' ? 'Record Income / Receipt' : 'Record Expense',
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Type Toggle Segment */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'income' && styles.incomeSegmentActive]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={18}
              color={type === 'income' ? '#FFFFFF' : Colors.income}
            />
            <Text
              style={[
                styles.segmentText,
                type === 'income' && styles.segmentTextActive,
              ]}
            >
              Income / Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'expense' && styles.expenseSegmentActive]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={18}
              color={type === 'expense' ? '#FFFFFF' : Colors.expense}
            />
            <Text
              style={[
                styles.segmentText,
                type === 'expense' && styles.segmentTextActive,
              ]}
            >
              Expense Paid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount & Date Card */}
        <View style={styles.card}>
          <AmountInput
            label="Transaction Amount * (₹)"
            value={amountRupees}
            onChange={setAmountRupees}
            placeholder="0"
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Transaction Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        {/* Category & Tenant */}
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  category === cat.name && styles.chipActive,
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat.name && styles.chipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tenant Picker (Optional / Required for Rent) */}
          <View style={[styles.formGroup, { marginTop: Spacing.md }]}>
            <Text style={styles.label}>Associated Tenant (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedTenantId === undefined && styles.chipActive,
                ]}
                onPress={() => setSelectedTenantId(undefined)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedTenantId === undefined && styles.chipTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {tenants.map((ten) => (
                <TouchableOpacity
                  key={ten.id}
                  style={[
                    styles.chip,
                    selectedTenantId === ten.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedTenantId(ten.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedTenantId === ten.id && styles.chipTextActive,
                    ]}
                  >
                    {ten.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Rent Charge Allocations (Only when income for a tenant with open charges) */}
        {unpaidCharges.length > 0 && (
          <View style={styles.card}>
            <View style={styles.allocHeader}>
              <Text style={styles.cardTitle}>Rent Charge Allocation</Text>
              <View style={styles.manualSwitchRow}>
                <Text style={styles.manualSwitchLabel}>Custom</Text>
                <Switch
                  value={isManualAlloc}
                  onValueChange={setIsManualAlloc}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </View>
            </View>

            <Text style={styles.allocNote}>
              {isManualAlloc
                ? 'Specify exact amount to apply per monthly charge:'
                : 'By default, payment automatically applies to the oldest unpaid charge first.'}
            </Text>

            {unpaidCharges.map((chg) => {
              const due = chg.amount_due - chg.amount_paid - chg.waived_amount;
              return (
                <View key={chg.id} style={styles.allocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allocPeriod}>
                      {formatPeriod(chg.period_year, chg.period_month)}
                    </Text>
                    <Text style={styles.allocDueText}>
                      Outstanding: {formatCurrency(due)}
                    </Text>
                  </View>
                  {isManualAlloc && (
                    <View style={styles.manualInputWrap}>
                      <Text style={styles.manualPrefix}>₹</Text>
                      <TextInput
                        style={styles.manualInput}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        value={allocations[chg.id] || ''}
                        onChangeText={(t) =>
                          setAllocations((prev) => ({ ...prev, [chg.id]: t }))
                        }
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Details & Payment Method */}
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. October Rent received, Plumbing fix, etc."
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  style={[
                    styles.chip,
                    paymentMethod === pm.id && styles.chipActive,
                  ]}
                  onPress={() => setPaymentMethod(pm.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      paymentMethod === pm.id && styles.chipTextActive,
                    ]}
                  >
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reference / UTR Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="UPI Ref ID, Cheque #, NEFT reference"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional remarks"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {type === 'income' ? 'Record Receipt' : 'Record Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  incomeSegmentActive: {
    backgroundColor: Colors.income,
  },
  expenseSegmentActive: {
    backgroundColor: Colors.expense,
  },
  segmentText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginRight: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  allocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  manualSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualSwitchLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  allocNote: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  allocPeriod: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  allocDueText: {
    fontSize: Typography.xs,
    color: Colors.danger,
    marginTop: 2,
  },
  manualInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    width: 100,
  },
  manualPrefix: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginRight: 2,
  },
  manualInput: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: '600',
    paddingVertical: 4,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.base,
    fontWeight: '700',
  },
});
