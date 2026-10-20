// ============================================================
// RentLedger — Tab / Desktop Layout
// Renders responsive native Mac sidebar on desktop screens
// and iOS tab bar on mobile devices.
// ============================================================

import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { DesktopSidebar } from '../../src/components/desktop/DesktopSidebar';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const content = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: Colors.surface,
              borderTopColor: Colors.border,
              borderTopWidth: 0.5,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '700', color: Colors.textPrimary, fontSize: 18 },
        headerShadowVisible: false,
        headerShown: !isDesktop,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Properties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <DesktopSidebar />
        <View style={styles.desktopMain}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  desktopMain: {
    flex: 1,
    height: '100%',
  },
});

