// ============================================================
// RentLedger — Settings Screen
// Preferences, opening balance, security, categories, reset
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryFirst, executeSQL } from '../../src/db/database';
import { generateMonthlyCharges } from '../../src/services/AccountingService';
import { formatCurrency, parseCurrencyInput } from '../../src/utils/currency';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { db, isReady, refresh } = useDatabase();

  const [openingCash, setOpeningCash] = useState<number>(0);
  const [autoCharges, setAutoCharges] = useState<boolean>(true);
  const [faceIdEnabled, setFaceIdEnabled] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [cashInput, setCashInput] = useState<string>('');

  const loadSettings = useCallback(async () => {
    if (!db) return;
    try {
      const cashRow = await queryFirst<{ value: string }>(
        db,
        "SELECT value FROM settings WHERE key = 'opening_cash_balance'"
      );
      setOpeningCash(parseInt(cashRow?.value ?? '0', 10));

      const chargeRow = await queryFirst<{ value: string }>(
        db,
        "SELECT value FROM settings WHERE key = 'auto_generate_charges'"
      );
      setAutoCharges(chargeRow?.value === '1');

      const lockRow = await queryFirst<{ value: string }>(
        db,
        "SELECT value FROM settings WHERE key = 'app_lock_enabled'"
      );
      setFaceIdEnabled(lockRow?.value === '1');
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadSettings();
      }
    }, [isReady, db, loadSettings])
  );

  const handleSaveOpeningCash = async () => {
    if (!db) return;
    try {
      const paise = parseCurrencyInput(cashInput);
      await executeSQL(
        db,
        "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'opening_cash_balance'",
        [paise.toString()]
      );
      setOpeningCash(paise);
      setModalVisible(false);
      refresh();
      Alert.alert('Success', 'Opening cash balance updated.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleToggleAutoCharges = async (val: boolean) => {
    if (!db) return;
    setAutoCharges(val);
    await executeSQL(
      db,
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'auto_generate_charges'",
      [val ? '1' : '0']
    );
  };

  const handleToggleFaceId = async (val: boolean) => {
    if (!db) return;
    if (val) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometrics Unavailable', 'Face ID / Touch ID is not configured on this device.');
        return;
      }
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to enable App Lock',
      });
      if (!auth.success) return;
    }
    setFaceIdEnabled(val);
    await executeSQL(
      db,
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'app_lock_enabled'",
      [val ? '1' : '0']
    );
  };

  const handleGenerateNow = async () => {
    if (!db) return;
    try {
      const count = await generateMonthlyCharges(db);
      refresh();
      Alert.alert('Charges Processed', `${count} new rent charges generated.`);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data?',
      'This will erase all recorded transactions, tenants, and properties, and restore sample data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All financial ledger records will be wiped.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Wipe Everything',
                  style: 'destructive',
                  onPress: async () => {
                    if (!db) return;
                    await executeSQL(db, 'DELETE FROM rent_payment_allocations');
                    await executeSQL(db, 'DELETE FROM rent_charges');
                    await executeSQL(db, 'DELETE FROM transactions');
                    await executeSQL(db, 'DELETE FROM security_deposits');
                    await executeSQL(db, 'DELETE FROM tenants');
                    await executeSQL(db, 'DELETE FROM units');
                    await executeSQL(db, 'DELETE FROM properties');
                    await executeSQL(db, "UPDATE settings SET value = '0' WHERE key = 'db_seeded'");
                    refresh();
                    Alert.alert('Reset Complete', 'Database has been cleared and reseeded.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Preferences & Ledger Configuration</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Accounting & Balances */}
        <SectionHeader title="Accounting Configuration" />
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => {
              setCashInput((openingCash / 100).toString());
              setModalVisible(true);
            }}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Opening Cash Balance</Text>
              <Text style={styles.itemSubtitle}>Initial money in bank/cash</Text>
            </View>
            <Text style={styles.itemValue}>{formatCurrency(openingCash)}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => router.push('/categories')}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons name="pricetags-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Transaction Categories</Text>
              <Text style={styles.itemSubtitle}>Manage income & expense types</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => router.push('/backup')}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons name="save-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Backup & Restore</Text>
              <Text style={styles.itemSubtitle}>Full JSON backups, imports & CSV</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Automation & Charges */}
        <SectionHeader title="Rent Charges Automation" />
        <View style={styles.groupCard}>
          <View style={styles.settingItem}>
            <View style={styles.itemIconWrap}>
              <Ionicons name="repeat-outline" size={20} color={Colors.accent} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Auto-generate Monthly Charges</Text>
              <Text style={styles.itemSubtitle}>Generate when rent due day arrives</Text>
            </View>
            <Switch
              value={autoCharges}
              onValueChange={handleToggleAutoCharges}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleGenerateNow}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons name="flash-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>Check & Generate Charges Now</Text>
              <Text style={styles.itemSubtitle}>Checks all tenants up to current date</Text>
            </View>
            <Ionicons name="play" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* App Security */}
        <SectionHeader title="Security" />
        <View style={styles.groupCard}>
          <View style={styles.settingItem}>
            <View style={styles.itemIconWrap}>
              <Ionicons name="finger-print-outline" size={20} color={Colors.success} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>App Lock (Face ID / Passcode)</Text>
              <Text style={styles.itemSubtitle}>Require biometric verification</Text>
            </View>
            <Switch
              value={faceIdEnabled}
              onValueChange={handleToggleFaceId}
              trackColor={{ false: Colors.border, true: Colors.success }}
            />
          </View>
        </View>

        {/* Privacy & About */}
        <SectionHeader title="Privacy & Storage" />
        <View style={styles.groupCard}>
          <View style={styles.privacyBox}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
            <Text style={styles.privacyTitle}>100% Offline & Private</Text>
            <Text style={styles.privacyDesc}>
              RentLedger stores all data locally in a device SQLite database. No accounts,
              no tracking analytics, no advertising SDKs, and zero cloud transmission.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemTitle}>App Version</Text>
            </View>
            <Text style={styles.itemValue}>1.0.0 (Production Build)</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleResetData}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text style={[styles.itemTitle, { color: Colors.danger }]}>
                Reset All Ledger Data
              </Text>
              <Text style={styles.itemSubtitle}>Erase all records and start fresh</Text>
            </View>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Opening Cash Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Opening Cash Balance</Text>
            <Text style={styles.modalSubtitle}>
              Enter initial available money before any recorded receipts or expenses.
            </Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>₹</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="decimal-pad"
                value={cashInput}
                onChangeText={setCashInput}
                placeholder="0"
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveOpeningCash}
              >
                <Text style={styles.saveButtonText}>Save Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  groupCard: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemValue: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
    marginLeft: 56,
  },
  privacyBox: {
    padding: Spacing.base,
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  privacyTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  privacyDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginVertical: Spacing.sm,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.md,
  },
  inputPrefix: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  cancelButtonText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  saveButtonText: {
    fontSize: Typography.base,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
