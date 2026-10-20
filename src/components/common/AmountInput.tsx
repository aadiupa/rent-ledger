// ============================================================
// RentLedger — AmountInput Component
// ============================================================

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

export function AmountInput({ value, onChange, label, placeholder = '0', error }: AmountInputProps) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? { borderColor: Colors.danger } : undefined]}>
        <Text style={styles.prefix}>₹</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => {
            // Allow digits and single decimal point only
            const cleaned = t.replace(/[^0-9.]/g, '');
            // Prevent multiple dots
            const parts = cleaned.split('.');
            if (parts.length > 2) return;
            onChange(cleaned);
          }}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="done"
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.sm, fontWeight: '600',
    color: Colors.textSecondary, marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  prefix: {
    fontSize: Typography.md, color: Colors.textSecondary,
    paddingRight: Spacing.xs, fontWeight: '600',
  },
  input: {
    flex: 1, fontSize: Typography.md, color: Colors.textPrimary,
    paddingVertical: Spacing.sm, fontWeight: '600',
  },
  error: { fontSize: Typography.xs, color: Colors.danger, marginTop: Spacing.xs },
});
