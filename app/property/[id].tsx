// ============================================================
// RentLedger — Property Detail Screen
// Property info, unit/tenant roster, and property management
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, queryAll, executeSQL } from '../../src/db/database';
import { getTenantArrears } from '../../src/services/AccountingService';
import type { Property, Tenant } from '../../src/models/types';
import { formatCurrency } from '../../src/utils/currency';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

interface TenantWithArrears extends Tenant {
  current_arrears: number;
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<TenantWithArrears[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPropertyData = useCallback(async () => {
    if (!db || !id) return;
    try {
      const prop = await queryFirst<Property>(
        db,
        'SELECT * FROM properties WHERE id = ?',
        [id]
      );
      setProperty(prop);

      const tenantRows = await queryAll<Tenant>(
        db,
        'SELECT * FROM tenants WHERE property_id = ? ORDER BY name ASC',
        [id]
      );

      const enriched = await Promise.all(
        tenantRows.map(async (t) => ({
          ...t,
          current_arrears: await getTenantArrears(db, t.id),
        }))
      );
      setTenants(enriched);
    } catch (err) {
      console.error('Error loading property:', err);
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadPropertyData();
      }
    }, [isReady, db, loadPropertyData])
  );

  const handleDeleteProperty = () => {
    Alert.alert(
      'Delete Property?',
      'Deleting this property will also remove all its units and tenants. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!db || !id) return;
            await executeSQL(db, 'DELETE FROM properties WHERE id = ?', [id]);
            refresh();
            router.back();
          },
        },
      ]
    );
  };

  if (!isReady || loading) {
    return <LoadingSpinner message="Loading Property..." />;
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  const totalMonthlyRent = tenants
    .filter((t) => t.is_active)
    .reduce((sum, t) => sum + t.monthly_rent, 0);

  const totalPropertyArrears = tenants.reduce((sum, t) => sum + t.current_arrears, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: property.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/property/add?id=${property.id}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.headerEdit}>Edit</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyAddress}>
            {property.address || 'No address specified'}
          </Text>
          {property.notes ? (
            <Text style={styles.propertyNotes}>{property.notes}</Text>
          ) : null}

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Active Tenants</Text>
              <Text style={styles.metricValue}>
                {tenants.filter((t) => t.is_active).length}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Monthly Rent</Text>
              <Text style={styles.metricValue}>{formatCurrency(totalMonthlyRent)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Arrears</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: totalPropertyArrears > 0 ? Colors.danger : Colors.success },
                ]}
              >
                {formatCurrency(totalPropertyArrears)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tenant Roster */}
        <SectionHeader
          title={`Tenants (${tenants.length})`}
          action="+ Add Tenant"
          onAction={() => router.push(`/tenant/add?propertyId=${property.id}`)}
        />

        <View style={styles.tenantList}>
          {tenants.length > 0 ? (
            tenants.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.tenantItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/tenant/${t.id}`)}
              >
                <View style={styles.tenantAvatar}>
                  <Text style={styles.avatarLetter}>
                    {t.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.tenantDetails}>
                  <Text style={styles.tenantName}>{t.name}</Text>
                  <Text style={styles.tenantSub}>
                    Rent: {formatCurrency(t.monthly_rent)}/mo • Due Day: {t.rent_due_day}
                  </Text>
                </View>
                <View style={styles.tenantArrearsBox}>
                  {t.current_arrears > 0 ? (
                    <>
                      <Text style={styles.arrearsBadgeText}>Arrears</Text>
                      <Text style={styles.arrearsAmount}>
                        {formatCurrency(t.current_arrears)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.paidBadge}>Up to Date</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyTenants}>
              <Text style={styles.emptyTenantsText}>No tenants in this property yet.</Text>
              <TouchableOpacity
                style={styles.addTenantBtn}
                onPress={() => router.push(`/tenant/add?propertyId=${property.id}`)}
              >
                <Text style={styles.addTenantBtnText}>Add First Tenant</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delete Property Button */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProperty}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteButtonText}>Delete Property</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  headerEdit: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoCard: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  propertyName: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  propertyAddress: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  propertyNotes: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Colors.divider,
  },
  metricLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tenantList: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  tenantAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarLetter: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.primary,
  },
  tenantDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tenantSub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tenantArrearsBox: {
    alignItems: 'flex-end',
    marginRight: Spacing.xs,
  },
  arrearsBadgeText: {
    fontSize: 10,
    color: Colors.danger,
    fontWeight: '600',
  },
  arrearsAmount: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.danger,
  },
  paidBadge: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.success,
  },
  emptyTenants: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTenantsText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  addTenantBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addTenantBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Typography.sm,
  },
  dangerSection: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
});
