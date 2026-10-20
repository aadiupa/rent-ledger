// ============================================================
// RentLedger — Add / Edit Property Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, executeSQL } from '../../src/db/database';
import { createProperty } from '../../src/services/PropertyService';
import type { Property } from '../../src/models/types';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function AddEditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const router = useRouter();
  const { db, refresh } = useDatabase();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && db && id) {
      queryFirst<Property>(db, 'SELECT * FROM properties WHERE id = ?', [id]).then((prop) => {
        if (prop) {
          setName(prop.name);
          setAddress(prop.address || '');
          setNotes(prop.notes || '');
        }
      });
    }
  }, [isEditing, db, id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a property name.');
      return;
    }
    if (!db) return;

    setLoading(true);
    try {
      if (isEditing && id) {
        await executeSQL(
          db,
          `UPDATE properties SET name = ?, address = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
          [name.trim(), address.trim(), notes.trim() || null, id]
        );
      } else {
        await createProperty(db, {
          name: name.trim(),
          address: address.trim(),
          notes: notes.trim() || undefined,
        });
      }
      refresh();
      router.back();
    } catch (err) {
      Alert.alert('Save Error', String(err));
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
          title: isEditing ? 'Edit Property' : 'Add Property',
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Property Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Commercial Complex, Krishna Towers"
            placeholderTextColor={Colors.textTertiary}
            autoFocus={!isEditing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Full physical address or street details"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tax IDs, electricity meter numbers, land registration, etc."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {isEditing ? 'Save Changes' : 'Create Property'}
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
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.base,
    fontWeight: '700',
  },
});
