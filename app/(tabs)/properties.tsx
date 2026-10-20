// ============================================================
// RentLedger — Properties Screen
// Lists all properties with unit/tenant counts and total rent.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../src/hooks/useDatabase';
import { queryAll } from '../../src/db/database';
import { formatCurrency } from '../../src/utils/currency';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadow,
} from '../../src/constants/theme';

interface PropertyRow {
  id: number;
  name: string;
  address: string;
  notes: string | null;
  tenant_count: number;
  total_monthly_rent: number;
}

export default function PropertiesScreen() {
  const router = useRouter();
  const { db, isReady } = useDatabase();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await queryAll<PropertyRow>(
        db,
        `SELECT
           p.id,
           p.name,
           p.address,
           p.notes,
           COUNT(DISTINCT t.id) AS tenant_count,
           COALESCE(SUM(CASE WHEN t.is_active = 1 THEN t.monthly_rent ELSE 0 END), 0) AS total_monthly_rent
         FROM properties p
         LEFT JOIN tenants t ON t.property_id = p.id
         GROUP BY p.id
         ORDER BY p.name ASC`
      );
      setProperties(rows);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadProperties();
      }
    }, [isReady, db, loadProperties])
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={72} color={Colors.border} />
      <Text style={styles.emptyTitle}>No Properties Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button above to add your first property.
      </Text>
    </View>
  );

  const renderProperty = ({ item }: { item: PropertyRow }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={22} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.address ? (
            <Text style={styles.address} numberOfLines={1}>
              {item.address}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.statValue}>{item.tenant_count}</Text>
          <Text style={styles.statLabel}>
            {item.tenant_count === 1 ? 'Tenant' : 'Tenants'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="cash-outline" size={14} color={Colors.accent} />
          <Text style={[styles.statValue, { color: Colors.accent }]}>
            {formatCurrency(item.total_monthly_rent)}
          </Text>
          <Text style={styles.statLabel}>Monthly</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Properties</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/property/add')}
          accessibilityLabel="Add property"
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProperty}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          properties.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.base,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadow.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardBody: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  propertyName: {
    fontSize: Typography.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  address: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.md,
  },
  statValue: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.base,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
