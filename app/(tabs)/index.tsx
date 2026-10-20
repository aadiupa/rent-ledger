// ============================================================
// RentLedger — Dashboard Screen
// iPhone-first native dashboard with month filtering and stats
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import {
  getDashboardStats,
  getCurrentYearMonth,
} from '../../src/services/AccountingService';
import type { DashboardStats } from '../../src/models/types';
import { formatCurrency, formatPeriod } from '../../src/utils/currency';
import { MonthPicker } from '../../src/components/common/MonthPicker';
import { StatCard } from '../../src/components/common/StatCard';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const currentYM = getCurrentYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentYM.year);
  const [selectedMonth, setSelectedMonth] = useState(currentYM.month);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!db) return;
    try {
      const data = await getDashboardStats(db, selectedYear, selectedMonth);
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        fetchStats();
      }
    }, [isReady, db, fetchStats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    refresh();
    fetchStats();
  };

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setLoading(true);
  };

  if (!isReady || (loading && !stats)) {
    return <LoadingSpinner message="Loading RentLedger..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.appTitle}>RentLedger</Text>
          <Text style={styles.appSubtitle}>Rental Accounting & Ledger</Text>
        </View>
        <TouchableOpacity
          style={styles.chargesButton}
          onPress={() => router.push('/charges')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.chargesButtonText}>Charges</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Available Money Hero Card (Lifetime Cash) */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Total Available Money</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.heroLink}>View Ledger →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroAmount}>
            {formatCurrency(stats?.available_cash ?? 0)}
          </Text>
          <Text style={styles.heroFooterText}>
            Lifetime cash in hand / bank (opening + receipts − expenses)
          </Text>
        </View>

        {/* Month Selector for Period Stats */}
        <View style={styles.monthPickerContainer}>
          <MonthPicker
            year={selectedYear}
            month={selectedMonth}
            onChange={handleMonthChange}
          />
        </View>

        {/* Selected Month Summary Section */}
        <SectionHeader
          title={`${formatPeriod(selectedYear, selectedMonth)} Summary`}
          action="Details"
          onAction={() => router.push('/(tabs)/reports')}
        />

        <View style={styles.statsGrid}>
          <View style={styles.gridCol}>
            <StatCard
              label="Expected Rent"
              amount={stats?.monthly_rent_expected ?? 0}
              subtitle="From active tenants"
              color={Colors.textPrimary}
              onPress={() => router.push('/charges')}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Rent Collected"
              amount={stats?.rent_collected_month ?? 0}
              subtitle="Current month rent"
              color={Colors.success}
              onPress={() => router.push('/(tabs)/transactions')}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.gridCol}>
            <StatCard
              label="Arrears Collected"
              amount={stats?.arrears_collected_month ?? 0}
              subtitle="Past dues received"
              color={Colors.accent}
              onPress={() => router.push('/(tabs)/transactions')}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Security Deposits"
              amount={stats?.security_deposits_received_month ?? 0}
              subtitle="Received in month"
              color={Colors.deposit}
              onPress={() => router.push('/deposits')}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.gridCol}>
            <StatCard
              label="Monthly Expenses"
              amount={stats?.expenses_month ?? 0}
              subtitle="Paid out"
              color={Colors.danger}
              onPress={() => router.push('/(tabs)/transactions')}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Net Cash Flow"
              amount={stats?.net_cash_flow_month ?? 0}
              subtitle="Receipts − expenses"
              color={(stats?.net_cash_flow_month ?? 0) >= 0 ? Colors.success : Colors.danger}
            />
          </View>
        </View>

        {/* Global Balances: Outstanding Arrears & Deposit Liabilities */}
        <SectionHeader title="Liabilities & Dues" />
        <View style={styles.liabilitiesContainer}>
          <TouchableOpacity
            style={styles.liabilityRow}
            activeOpacity={0.7}
            onPress={() => router.push('/charges')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={24} color={Colors.danger} />
            </View>
            <View style={styles.liabilityContent}>
              <Text style={styles.liabilityTitle}>Total Outstanding Arrears</Text>
              <Text style={styles.liabilitySubtitle}>Cumulative rent overdue</Text>
            </View>
            <Text style={[styles.liabilityAmount, { color: Colors.danger }]}>
              {formatCurrency(stats?.total_outstanding_arrears ?? 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.liabilityRow}
            activeOpacity={0.7}
            onPress={() => router.push('/deposits')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.deposit} />
            </View>
            <View style={styles.liabilityContent}>
              <Text style={styles.liabilityTitle}>Refundable Deposit Liability</Text>
              <Text style={styles.liabilitySubtitle}>Active deposit balance</Text>
            </View>
            <Text style={[styles.liabilityAmount, { color: Colors.deposit }]}>
              {formatCurrency(stats?.total_refundable_deposits ?? 0)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overdue / Partially Paid Tenants */}
        <SectionHeader
          title="Tenants With Dues"
          action={stats?.overdue_tenants && stats.overdue_tenants.length > 0 ? "View All" : undefined}
          onAction={() => router.push('/charges')}
        />

        {stats?.overdue_tenants && stats.overdue_tenants.length > 0 ? (
          <View style={styles.overdueList}>
            {stats.overdue_tenants.map((item) => (
              <TouchableOpacity
                key={item.tenant.id}
                style={styles.overdueItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/tenant/${item.tenant.id}`)}
              >
                <View style={styles.overdueAvatar}>
                  <Text style={styles.avatarText}>
                    {item.tenant.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.overdueDetails}>
                  <Text style={styles.tenantName}>{item.tenant.name}</Text>
                  <Text style={styles.tenantMeta}>
                    Rent: {formatCurrency(item.tenant.monthly_rent)}/mo
                  </Text>
                </View>
                <View style={styles.dueAmountBox}>
                  <Text style={styles.dueLabel}>Arrears</Text>
                  <Text style={styles.dueAmount}>
                    {formatCurrency(item.current_arrears)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyOverdue}>
            <Ionicons name="checkmark-circle-outline" size={32} color={Colors.success} />
            <Text style={styles.emptyOverdueText}>No overdue rent or unpaid arrears!</Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Action Button for Quick Add */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/transaction/add')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  appTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chargesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  chargesButtonText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    ...Shadow.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroLink: {
    color: '#FFFFFF',
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: Typography.xxxl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: Spacing.xs,
    letterSpacing: -0.5,
  },
  heroFooterText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: Typography.xs,
    marginTop: 4,
  },
  monthPickerContainer: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  gridCol: {
    flex: 1,
  },
  liabilitiesContainer: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  liabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  liabilityContent: {
    flex: 1,
  },
  liabilityTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  liabilitySubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  liabilityAmount: {
    fontSize: Typography.md,
    fontWeight: '700',
  },
  overdueList: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  overdueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  overdueAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  overdueDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tenantMeta: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dueAmountBox: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  dueLabel: {
    fontSize: Typography.xs,
    color: Colors.danger,
    fontWeight: '500',
  },
  dueAmount: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.danger,
  },
  emptyOverdue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  emptyOverdueText: {
    fontSize: Typography.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  desktopTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  desktopPageTitle: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  desktopPageSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  desktopOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  desktopOutlineBtnText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  desktopPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  desktopPrimaryBtnText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopScrollContent: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  desktopMaxContainer: {
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
  },
  desktopHeroCard: {
    marginHorizontal: 0,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  desktopMonthPicker: {
    marginHorizontal: 0,
    alignSelf: 'flex-start',
    minWidth: 260,
  },
  desktopStatsGrid: {
    paddingHorizontal: 0,
    flexWrap: 'wrap',
  },
  desktopGridCol: {
    flexBasis: '31.8%',
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  desktopSplitRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  desktopSplitColLeft: {
    flex: 1.3,
  },
  desktopSplitColRight: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl + 20,
    right: Spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
    elevation: 8,
  },
});
