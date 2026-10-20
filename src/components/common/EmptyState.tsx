// ============================================================
// RentLedger — EmptyState Component
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon as any} size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xxxl, gap: Spacing.sm,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.md, fontWeight: '700',
    color: Colors.textPrimary, textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  button: {
    marginTop: Spacing.md, backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: Typography.base },
});
