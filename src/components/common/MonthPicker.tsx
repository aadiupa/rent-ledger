// ============================================================
// RentLedger — MonthPicker Component
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../constants/theme';
import { formatPeriod } from '../../utils/currency';

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const goBack = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };

  const goForward = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack} style={styles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.label}>{formatPeriod(year, month)}</Text>
      <TouchableOpacity onPress={goForward} style={styles.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    gap: Spacing.md,
  },
  arrow: {
    padding: Spacing.xs,
  },
  label: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 140,
    textAlign: 'center',
  },
});
