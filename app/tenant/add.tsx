// ============================================================
// RentLedger — Add / Edit Tenant Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, queryAll } from '../../src/db/database';
import { createTenant, updateTenant } from '../../src/services/PropertyService';
import type { Tenant, Property } from '../../src/models/types';
import { rupeesToPaise, paiseToRupees } from '../../src/utils/currency';
import { AmountInput } from '../../src/components/common/AmountInput';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function AddEditTenantScreen() {
  const { id, propertyId } = useLocalSearchParams<{ id?: string; propertyId?: string }>();
  const isEditing = !!id;
  const router = useRouter();
  const { db, refresh } = useDatabase();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(0);
  const [name, setName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [monthlyRentRupees, setMonthlyRentRupees] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [leaseStart, setLeaseStart] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [leaseEnd, setLeaseEnd] = useState('');
  const [depositRupees, setDepositRupees] = useState('');
  const [depositRefundable, setDepositRefundable] = useState(true);
  const [openingArrearsRupees, setOpeningArrearsRupees] = useState('');
  const [openingArrearsDate, setOpeningArrearsDate] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    queryAll<Property>(db, 'SELECT * FROM properties ORDER BY name ASC').then((props) => {
      setProperties(props);
      if (propertyId) {
        setSelectedPropertyId(parseInt(propertyId, 10));
      } else if (props.length > 0 && !isEditing) {
        setSelectedPropertyId(props[0].id);
      }
    });

    if (isEditing && id) {
      queryFirst<Tenant>(db, 'SELECT * FROM tenants WHERE id = ?', [id]).then((t) => {
        if (t) {
          setName(t.name);
          setSelectedPropertyId(t.property_id);
          setMonthlyRentRupees((t.monthly_rent / 100).toString());
          setRentDueDay(t.rent_due_day.toString());
          setLeaseStart(t.lease_start);
          setLeaseEnd(t.lease_end || '');
          setDepositRupees(t.security_deposit ? (t.security_deposit / 100).toString() : '');
          setDepositRefundable(t.security_deposit_refundable);
          setOpeningArrearsRupees(
            t.opening_arrears ? (t.opening_arrears / 100).toString() : ''
          );
          setOpeningArrearsDate(t.opening_arrears_date || '');
          setContactPhone(t.contact_phone || '');
          setContactEmail(t.contact_email || '');
          setNotes(t.notes || '');
          setIsActive(t.is_active);
        }
      });
    }
  }, [db, id, isEditing, propertyId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter tenant name.');
      return;
    }
    if (!monthlyRentRupees || parseFloat(monthlyRentRupees) <= 0) {
      Alert.alert('Required Field', 'Please enter a valid monthly rent.');
      return;
    }
    if (!selectedPropertyId) {
      Alert.alert('Required Field', 'Please select a property.');
      return;
    }
    if (!db) return;

    setLoading(true);
    try {
      const rentPaise = rupeesToPaise(monthlyRentRupees);
      const depPaise = depositRupees ? rupeesToPaise(depositRupees) : 0;
      const arrearsPaise = openingArrearsRupees ? rupeesToPaise(openingArrearsRupees) : 0;
      const dueDay = parseInt(rentDueDay, 10) || 1;

      if (isEditing && id) {
        await updateTenant(db, parseInt(id, 10), {
          property_id: selectedPropertyId,
          name: name.trim(),
          monthly_rent: rentPaise,
          rent_due_day: dueDay,
          lease_start: leaseStart,
          lease_end: leaseEnd || undefined,
          security_deposit: depPaise,
          security_deposit_refundable: depositRefundable,
          opening_arrears: arrearsPaise,
          opening_arrears_date: openingArrearsDate || undefined,
          contact_phone: contactPhone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await createTenant(db, {
          property_id: selectedPropertyId,
          unit_id: 0, // auto-generated
          name: name.trim(),
          monthly_rent: rentPaise,
          rent_due_day: dueDay,
          lease_start: leaseStart,
          lease_end: leaseEnd || undefined,
          security_deposit: depPaise,
          security_deposit_refundable: depositRefundable,
          opening_arrears: arrearsPaise,
          opening_arrears_date: openingArrearsDate || undefined,
          contact_phone: contactPhone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
          is_active: isActive,
        });
      }

      refresh();
      router.back();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Tenant' : 'Add New Tenant',
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Basic Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Tenant Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tenant / Business Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ramesh Sharma or Corner Cafe"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Property *</Text>
            <View style={styles.propertyOptions}>
              {properties.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.propertyOption,
                    selectedPropertyId === p.id && styles.propertyOptionSelected,
                  ]}
                  onPress={() => setSelectedPropertyId(p.id)}
                >
                  <Text
                    style={[
                      styles.propertyOptionText,
                      selectedPropertyId === p.id && styles.propertyOptionTextSelected,
                    ]}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Rent & Lease Terms */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Rent Terms</Text>

          <AmountInput
            label="Monthly Rent * (₹)"
            value={monthlyRentRupees}
            onChange={setMonthlyRentRupees}
            placeholder="e.g. 25000"
          />

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
              <Text style={styles.label}>Rent Due Day of Month</Text>
              <TextInput
                style={styles.input}
                value={rentDueDay}
                onChangeText={setRentDueDay}
                keyboardType="number-pad"
                placeholder="1 (Day 1 - 28)"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Lease Start (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={leaseStart}
                onChangeText={setLeaseStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Security Deposit & Opening Arrears */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Security Deposit & Opening Arrears</Text>

          <AmountInput
            label="Security Deposit Received (₹)"
            value={depositRupees}
            onChange={setDepositRupees}
            placeholder="0"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Deposit is Refundable</Text>
            <Switch
              value={depositRefundable}
              onValueChange={setDepositRefundable}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <AmountInput
              label="Opening Arrears Balance (₹)"
              value={openingArrearsRupees}
              onChange={setOpeningArrearsRupees}
              placeholder="0 (Past balance carried forward)"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Opening Arrears Date</Text>
            <TextInput
              style={styles.input}
              value={openingArrearsDate}
              onChangeText={setOpeningArrearsDate}
              placeholder="e.g. 2026-10-01"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Contact & Notes (Optional)</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 90000 00000"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional remarks or agreement notes"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active Tenant Status</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Colors.border, true: Colors.success }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {isEditing ? 'Save Changes' : 'Create Tenant'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  formSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  propertyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  propertyOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  propertyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  propertyOptionText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  propertyOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  switchLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.base,
    fontWeight: '700',
  },
});
