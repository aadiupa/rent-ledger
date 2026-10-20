// ============================================================
// RentLedger — Root Layout (Expo Router)
// ============================================================

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '../src/hooks/useDatabase';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.primary,
          headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tenant/[id]" options={{ title: 'Tenant Details', presentation: 'card' }} />
        <Stack.Screen name="property/[id]" options={{ title: 'Property Details', presentation: 'card' }} />
        <Stack.Screen name="transaction/add" options={{ title: 'Add Transaction', presentation: 'modal' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction', presentation: 'card' }} />
        <Stack.Screen name="charges/index" options={{ title: 'Rent Charges', presentation: 'card' }} />
        <Stack.Screen name="deposits/index" options={{ title: 'Security Deposits', presentation: 'card' }} />
        <Stack.Screen name="reports/index" options={{ title: 'Monthly Report', presentation: 'card' }} />
        <Stack.Screen name="categories/index" options={{ title: 'Categories', presentation: 'card' }} />
        <Stack.Screen name="backup/index" options={{ title: 'Backup & Restore', presentation: 'card' }} />
        <Stack.Screen name="tenant/add" options={{ title: 'Add Tenant', presentation: 'modal' }} />
        <Stack.Screen name="property/add" options={{ title: 'Add Property', presentation: 'modal' }} />
      </Stack>
    </DatabaseProvider>
  );
}
