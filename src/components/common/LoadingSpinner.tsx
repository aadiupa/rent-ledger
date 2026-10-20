// ============================================================
// RentLedger — LoadingSpinner Component
// ============================================================

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: Spacing.md, backgroundColor: Colors.background,
  },
  message: {
    fontSize: Typography.base, color: Colors.textSecondary,
  },
});
