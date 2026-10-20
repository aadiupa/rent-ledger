// ============================================================
// RentLedger — Reports Screen
// Income/Expense, Tenant Collections, Arrears, and Exports
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import {
  getMonthlyReport,
  getAllTenantsArrears,
  getCurrentYearMonth,
} from '../../src/services/AccountingService';
import {
  exportTransactionsCSV,
  exportArrearsReportCSV,
  createFullBackup,
  shareCSV,
  shareJSON,
} from '../../src/services/ExportService';
import type { MonthlyReport } from '../../src/models/types';
import { formatCurrency, formatPeriod } from '../../src/utils/currency';
import { MonthPicker } from '../../src/components/common/MonthPicker';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function ReportsScreen() {
  const { db, isReady } = useDatabase();
  const currentYM = getCurrentYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentYM.year);
  const [selectedMonth, setSelectedMonth] = useState(currentYM.month);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [arrearsData, setArrearsData] = useState<{ tenantId: number; tenantName: string; arrears: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    if (!db) return;
    try {
      const [rep, arr] = await Promise.all([
        getMonthlyReport(db, selectedYear, selectedMonth),
        getAllTenantsArrears(db),
      ]);
      setReport(rep);
      setArrearsData(arr);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }, [db, selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadData();
      }
    }, [isReady, db, loadData])
  );

  const handleExportTransactionsCSV = async () => {
    if (!db) return;
    try {
      setExporting(true);
      const csv = await exportTransactionsCSV(db);
      await shareCSV(csv, `rentledger-transactions-${Date.now()}.csv`);
    } catch (err) {
      Alert.alert('Export Error', String(err));
    } finally {
      setExporting(false);
    }
  };

  const handleExportArrearsCSV = async () => {
    if (!db) return;
    try {
      setExporting(true);
      const csv = await exportArrearsReportCSV(db);
      await shareCSV(csv, `rentledger-arrears-${Date.now()}.csv`);
    } catch (err) {
      Alert.alert('Export Error', String(err));
    } finally {
      setExporting(false);
    }
  };

  const handleExportFullBackup = async () => {
    if (!db) return;
    try {
      setExporting(true);
      const backup = await createFullBackup(db);
      const today = new Date().toISOString().split('T')[0];
      await shareJSON(backup, `rentledger-backup-${today}.json`);
    } catch (err) {
      Alert.alert('Backup Error', String(err));
    } finally {
      setExporting(false);
    }
  };

  if (!isReady || (loading && !report)) {
    return <LoadingSpinner message="Generating Reports..." />;
  }

  const categoryEntries = Object.entries(report?.expenses_by_category ?? {});

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Reports</Text>
        <Text style={styles.subtitle}>Monthly summaries & tenant dues</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Month Selector */}
        <View style={styles.monthPickerWrap}>
          <MonthPicker
            year={selectedYear}
            month={selectedMonth}
            onChange={(y, m) => {
              setSelectedYear(y);
              setSelectedMonth(m);
              setLoading(true);
            }}
          />
        </View>

        {/* High-level Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {formatPeriod(selectedYear, selectedMonth)} P&L Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.rowLabel}>Total Income Received</Text>
            <Text style={[styles.rowValue, { color: Colors.income }]}>
              {formatCurrency(report?.income_total ?? 0)}
            </Text>
          </View>

          <View style={styles.indentRow}>
            <Text style={styles.subRowLabel}>• Monthly Rent</Text>
            <Text style={styles.subRowValue}>{formatCurrency(report?.rent_collected ?? 0)}</Text>
          </View>
          <View style={styles.indentRow}>
            <Text style={styles.subRowLabel}>• Arrears Recovery</Text>
            <Text style={styles.subRowValue}>{formatCurrency(report?.arrears_collected ?? 0)}</Text>
          </View>
          <View style={styles.indentRow}>
            <Text style={styles.subRowLabel}>• Security Deposits</Text>
            <Text style={styles.subRowValue}>{formatCurrency(report?.security_deposits ?? 0)}</Text>
          </View>
          <View style={styles.indentRow}>
            <Text style={styles.subRowLabel}>• Other Income</Text>
            <Text style={styles.subRowValue}>{formatCurrency(report?.other_income ?? 0)}</Text>
          </View>

          <View style={[styles.divider, { marginVertical: Spacing.sm }]} />

          <View style={styles.summaryRow}>
            <Text style={styles.rowLabel}>Total Expenses Paid</Text>
            <Text style={[styles.rowValue, { color: Colors.expense }]}>
              {formatCurrency(report?.expense_total ?? 0)}
            </Text>
          </View>

          <View style={[styles.divider, { marginVertical: Spacing.sm }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.rowLabel, { fontWeight: '700' }]}>Net Monthly Cash Flow</Text>
            <Text
              style={[
                styles.rowValue,
                {
                  fontWeight: '800',
                  color: (report?.net_cash_flow ?? 0) >= 0 ? Colors.income : Colors.expense,
                },
              ]}
            >
              {formatCurrency(report?.net_cash_flow ?? 0)}
            </Text>
          </View>
        </View>

        {/* Expenses by Category */}
        <SectionHeader title="Expenses By Category" />
        <View style={styles.listCard}>
          {categoryEntries.length > 0 ? (
            categoryEntries.map(([cat, amount], idx) => (
              <View
                key={cat}
                style={[
                  styles.categoryRow,
                  idx < categoryEntries.length - 1 && styles.borderBottom,
                ]}
              >
                <Text style={styles.categoryName}>{cat}</Text>
                <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No expenses recorded for this month.</Text>
            </View>
          )}
        </View>

        {/* Current Tenant Arrears Report */}
        <SectionHeader title="Tenant Outstanding Arrears" />
        <View style={styles.listCard}>
          {arrearsData.length > 0 ? (
            arrearsData.map((item, idx) => (
              <View
                key={item.tenantId}
                style={[
                  styles.arrearsRow,
                  idx < arrearsData.length - 1 && styles.borderBottom,
                ]}
              >
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{item.tenantName}</Text>
                  <Text style={styles.tenantSubtitle}>Current Balance Due</Text>
                </View>
                <Text
                  style={[
                    styles.arrearsAmount,
                    { color: item.arrears > 0 ? Colors.danger : Colors.success },
                  ]}
                >
                  {formatCurrency(item.arrears)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No active tenants found.</Text>
            </View>
          )}
        </View>

        {/* Export & Actions Section */}
        <SectionHeader title="Export & Backup" />
        <View style={styles.exportSection}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportTransactionsCSV}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.exportButtonText}>Export Transactions CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportArrearsCSV}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.exportButtonText}>Export Arrears Summary CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, styles.backupButton]}
            onPress={handleExportFullBackup}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.exportButtonText, { color: '#FFFFFF' }]}>
              Generate Full JSON Backup
            </Text>
          </TouchableOpacity>
        </View>

        {exporting && (
          <View style={styles.exportingIndicator}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.exportingText}>Preparing file...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  monthPickerWrap: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },
  summaryCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  summaryTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  indentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingVertical: 2,
  },
  subRowLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  subRowValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  listCard: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  categoryName: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  categoryAmount: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.expense,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  emptyBox: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
  },
  arrearsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tenantSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  arrearsAmount: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  exportSection: {
    marginHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  exportButtonText: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  backupButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  exportingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  exportingText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});
