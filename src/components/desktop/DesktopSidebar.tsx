// ============================================================
// RentLedger — Desktop Sidebar Navigation
// Native macOS desktop sidebar with navigation, quick actions,
// and real-time ledger summary.
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../hooks/useDatabase';
import { getAvailableCash } from '../../services/AccountingService';
import { formatCurrency } from '../../utils/currency';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'home-outline', route: '/(tabs)' },
  { name: 'properties', label: 'Properties & Units', icon: 'business-outline', route: '/(tabs)/properties' },
  { name: 'charges', label: 'Rent Charges & Dues', icon: 'calendar-outline', route: '/charges' },
  { name: 'transactions', label: 'Financial Ledger', icon: 'receipt-outline', route: '/(tabs)/transactions' },
  { name: 'reports', label: 'Reports & P&L', icon: 'bar-chart-outline', route: '/(tabs)/reports' },
  { name: 'deposits', label: 'Security Deposits', icon: 'shield-checkmark-outline', route: '/deposits' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline', route: '/(tabs)/settings' },
];

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { db, isReady } = useDatabase();
  const [cashBalance, setCashBalance] = useState<number>(0);

  useEffect(() => {
    if (isReady && db) {
      getAvailableCash(db)
        .then(setCashBalance)
        .catch(() => {});
    }
  }, [isReady, db, pathname]);

  const isActive = (route: string) => {
    if (route === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)' || pathname === '/index')) {
      return true;
    }
    return pathname.startsWith(route);
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandIconBox}>
          <Ionicons name="wallet" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.brandInfo}>
          <Text style={styles.brandTitle}>RentLedger</Text>
          <Text style={styles.brandSubtitle}>macOS Edition • Local</Text>
        </View>
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/transaction/add')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={18} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>Record Transaction</Text>
      </TouchableOpacity>

      {/* Navigation List */}
      <View style={styles.navSection}>
        <Text style={styles.sectionHeader}>NAVIGATION</Text>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={active ? '#FFFFFF' : '#94A3B8'}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Footer Info Box */}
      <View style={styles.footerBox}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>100% Offline (SQLite)</Text>
        </View>
        <Text style={styles.cashLabel}>Total Available Cash</Text>
        <Text style={styles.cashAmount}>{formatCurrency(cashBalance)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#0F172A', // Deep dark slate
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    height: '100%',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
  },
  brandTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: Typography.xs - 1,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButtonText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navSection: {
    gap: 4,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 1,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  navItemActive: {
    backgroundColor: '#1E293B',
  },
  navLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerBox: {
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Emerald green
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cashLabel: {
    fontSize: Typography.xs,
    color: '#94A3B8',
    marginBottom: 2,
  },
  cashAmount: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});
