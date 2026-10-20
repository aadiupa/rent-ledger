// ============================================================
// RentLedger — Transactions Ledger Screen
// Shows all transactions with search, filter bar, and summary.
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryAll } from '../../src/db/database';
import { formatCurrency, formatDate, getShortMonthName, getCurrentYearMonth } from '../../src/utils/currency';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

// ---- Types ----------------------------------------------------------------

interface TransactionRow {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  tenant_name: string | null;
  property_name: string | null;
  payment_method: string | null;
}

type FilterType = 'all' | 'income' | 'expense';

// ---- Month options --------------------------------------------------------

function buildMonthOptions(): { label: string; year: number; month: number }[] {
  const { year, month } = getCurrentYearMonth();
  const options: { label: string; year: number; month: number }[] = [
    { label: 'All Time', year: 0, month: 0 },
  ];
  // Last 12 months
  for (let i = 0; i < 13; i++) {
    let y = year;
    let m = month - i;
    while (m <= 0) { m += 12; y--; }
    options.push({ label: `${getShortMonthName(m)} ${y}`, year: y, month: m });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

// ---- Component ------------------------------------------------------------

export default function TransactionsScreen() {
  const router = useRouter();
  const { db, isReady } = useDatabase();

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [monthIdx, setMonthIdx] = useState(0); // 0 = all time
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await queryAll<TransactionRow>(
        db,
        `SELECT t.id, t.date, t.type, t.category, t.description, t.amount,
                t.payment_method,
                ten.name AS tenant_name,
                p.name   AS property_name
         FROM transactions t
         LEFT JOIN tenants ten ON t.tenant_id = ten.id
         LEFT JOIN properties p ON t.property_id = p.id
         WHERE t.is_opening_balance = 0
         ORDER BY t.date DESC, t.id DESC`
      );
      setTransactions(rows);

      // Summary totals
      let inc = 0;
      let exp = 0;
      for (const r of rows) {
        if (r.type === 'income') inc += r.amount;
        else exp += r.amount;
      }
      setTotalIncome(inc);
      setTotalExpense(exp);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady) loadTransactions();
    }, [isReady, loadTransactions])
  );

  // ---- Filtering --------------------------------------------------------

  const filtered = transactions.filter((t) => {
    // Type filter
    if (filterType !== 'all' && t.type !== filterType) return false;

    // Month filter
    if (monthIdx > 0) {
      const opt = MONTH_OPTIONS[monthIdx];
      const [ty, tm] = t.date.split('-').map(Number);
      if (ty !== opt.year || tm !== opt.month) return false;
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        (t.tenant_name ?? '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Summary of filtered set
  let filteredIncome = 0;
  let filteredExpense = 0;
  for (const t of filtered) {
    if (t.type === 'income') filteredIncome += t.amount;
    else filteredExpense += t.amount;
  }

  // ---- Render helpers ---------------------------------------------------

  const renderItem = ({ item }: { item: TransactionRow }) => {
    const isIncome = item.type === 'income';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/transaction/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.typeIcon, { backgroundColor: isIncome ? Colors.income + '18' : Colors.expense + '18' }]}>
            <Ionicons
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={22}
              color={isIncome ? Colors.income : Colors.expense}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
            <Text style={styles.categoryText}>{item.category}</Text>
            {item.tenant_name ? (
              <Text style={styles.tenantText} numberOfLines={1}>{item.tenant_name}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amount, { color: isIncome ? Colors.income : Colors.expense }]}>
            {isIncome ? '+' : '−'}{formatCurrency(item.amount)}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          {item.payment_method ? (
            <Text style={styles.methodText}>{formatPaymentMethod(item.payment_method)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search description, tenant, category…"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filterType === f && styles.filterBtnActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.filterBtnText, filterType === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expense'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month picker (horizontal scroll) */}
      <FlatList
        horizontal
        data={MONTH_OPTIONS}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthScroll}
        renderItem={({ item: opt, index }) => (
          <TouchableOpacity
            style={[styles.monthChip, monthIdx === index && styles.monthChipActive]}
            onPress={() => setMonthIdx(index)}
          >
            <Text style={[styles.monthChipText, monthIdx === index && styles.monthChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Summary header */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.income }]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, { color: Colors.income }]}>
            {formatCurrency(filteredIncome)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.expense }]}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryAmount, { color: Colors.expense }]}>
            {formatCurrency(filteredExpense)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: filteredIncome - filteredExpense >= 0 ? Colors.income : Colors.expense }]}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryAmount, { color: filteredIncome - filteredExpense >= 0 ? Colors.income : Colors.expense }]}>
            {formatCurrency(Math.abs(filteredIncome - filteredExpense))}
          </Text>
        </View>
      </View>

      <Text style={styles.countLabel}>
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
      </Text>
    </>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={56} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptySubtitle}>
        {search || filterType !== 'all' || monthIdx > 0
          ? 'Try clearing your filters.'
          : 'Tap + to record income or expense.'}
      </Text>
    </View>
  );

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/transaction/add')}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

// ---- Helpers ---------------------------------------------------------------

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    neft: 'NEFT',
    rtgs: 'RTGS',
    other: 'Other',
  };
  return map[method] ?? method;
}

// ---- Styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + Spacing.sm : Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  // Filter row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterBtnTextActive: {
    color: Colors.textInverse,
  },
  // Month chips
  monthScroll: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  monthChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  monthChipActive: {
    backgroundColor: Colors.primary + '18',
    borderColor: Colors.primary,
  },
  monthChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    ...Shadow.sm,
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  countLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  // Transaction card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  cardContent: {
    flex: 1,
  },
  description: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
  tenantText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    marginTop: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  dateText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  methodText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
