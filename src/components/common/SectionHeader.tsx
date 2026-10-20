// ============================================================
// RentLedger — SectionHeader Component
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg, paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sm, fontWeight: '700',
    color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  action: {
    fontSize: Typography.sm, color: Colors.primary, fontWeight: '600',
  },
});
