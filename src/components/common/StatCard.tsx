// ============================================================
// RentLedger — StatCard Component
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface StatCardProps {
  label: string;
  amount: number;
  subtitle?: string;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
  small?: boolean;
  icon?: string;
}

export function StatCard({ label, amount, subtitle, color, bgColor, onPress, small }: StatCardProps) {
  const amountColor = color ?? Colors.textPrimary;
  const bg = bgColor ?? Colors.surface;

  const content = (
    <View style={[styles.card, { backgroundColor: bg }, small && styles.smallCard]}>
      <Text style={[styles.label, small && styles.smallLabel, bgColor ? { color: 'rgba(255,255,255,0.8)' } : undefined]}>
        {label}
      </Text>
      <Text style={[styles.amount, { color: bgColor ? '#fff' : amountColor }, small && styles.smallAmount]}>
        {formatCurrency(amount)}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, bgColor ? { color: 'rgba(255,255,255,0.7)' } : undefined]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  smallCard: {
    padding: Spacing.sm,
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  smallLabel: {
    fontSize: Typography.xs,
  },
  amount: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  smallAmount: {
    fontSize: Typography.md,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 4,
  },
});
