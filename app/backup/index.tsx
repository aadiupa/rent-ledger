// ============================================================
// RentLedger — Backup & Restore Screen
// JSON backups, restore with merge/replace, CSV reports
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useDatabase } from '../../src/hooks/useDatabase';
import {
  createFullBackup,
  exportTransactionsCSV,
  exportArrearsReportCSV,
  shareCSV,
  shareJSON,
  readJSONFromFile,
  restoreFromBackup,
  type FullBackup,
} from '../../src/services/ExportService';
import { SectionHeader } from '../../src/components/common/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function BackupScreen() {
  const { db, refresh } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleExportJSON = async () => {
    if (!db) return;
    setLoading(true);
    setStatusMsg('Creating JSON backup...');
    try {
      const backup = await createFullBackup(db);
      const today = new Date().toISOString().split('T')[0];
      await shareJSON(backup, `rentledger-backup-${today}.json`);
    } catch (err) {
      Alert.alert('Backup Error', String(err));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleExportTransactionsCSV = async () => {
    if (!db) return;
    setLoading(true);
    setStatusMsg('Generating Transactions CSV...');
    try {
      const csv = await exportTransactionsCSV(db);
      await shareCSV(csv, `rentledger-transactions-${Date.now()}.csv`);
    } catch (err) {
      Alert.alert('Export Error', String(err));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleExportArrearsCSV = async () => {
    if (!db) return;
    setLoading(true);
    setStatusMsg('Generating Arrears CSV...');
    try {
      const csv = await exportArrearsReportCSV(db);
      await shareCSV(csv, `rentledger-arrears-${Date.now()}.csv`);
    } catch (err) {
      Alert.alert('Export Error', String(err));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleImportJSON = async () => {
    if (!db) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const fileUri = res.assets[0].uri;
      setLoading(true);
      setStatusMsg('Reading backup file...');

      const parsed = (await readJSONFromFile(fileUri)) as FullBackup;

      if (!parsed || !parsed.properties || !parsed.tenants || !parsed.transactions) {
        Alert.alert('Invalid Format', 'The selected file is not a valid RentLedger backup JSON.');
        setLoading(false);
        setStatusMsg('');
        return;
      }

      setLoading(false);
      setStatusMsg('');

      const countInfo =
        `${parsed.properties.length} properties, ` +
        `${parsed.tenants.length} tenants, ` +
        `${parsed.transactions.length} transactions, ` +
        `${parsed.rent_charges?.length ?? 0} rent charges.`;

      Alert.alert(
        'Restore Backup',
        `Found backup from ${parsed.exported_at ? new Date(parsed.exported_at).toLocaleDateString() : 'unknown date'} with ${countInfo}\n\nChoose restore mode:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge (Safe)',
            onPress: async () => {
              setLoading(true);
              setStatusMsg('Merging records...');
              try {
                const result = await restoreFromBackup(db, parsed, 'merge');
                refresh();
                Alert.alert(
                  'Merge Complete',
                  `Successfully imported ${result.imported} records. Skipped ${result.skipped} existing duplicates.`
                );
              } catch (e) {
                Alert.alert('Restore Failed', String(e));
              } finally {
                setLoading(false);
                setStatusMsg('');
              }
            },
          },
          {
            text: 'Replace All',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirm Replace',
                'This will erase all existing records in this app and replace them completely with the backup file.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm & Replace',
                    style: 'destructive',
                    onPress: async () => {
                      setLoading(true);
                      setStatusMsg('Replacing database...');
                      try {
                        const result = await restoreFromBackup(db, parsed, 'replace');
                        refresh();
                        Alert.alert(
                          'Restore Complete',
                          `All data replaced. Imported ${result.imported} records.`
                        );
                      } catch (e) {
                        Alert.alert('Restore Failed', String(e));
                      } finally {
                        setLoading(false);
                        setStatusMsg('');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Import Error', String(err));
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Backup & Restore' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Export Card */}
        <SectionHeader title="Export Data" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportJSON}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Export Full JSON Backup</Text>
              <Text style={styles.rowSubtitle}>
                Includes all properties, tenants, charges, deposits & settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportTransactionsCSV}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="document-text-outline" size={22} color={Colors.income} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Export Transactions CSV</Text>
              <Text style={styles.rowSubtitle}>
                Excel & Google Sheets compatible ledger export
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportArrearsCSV}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="receipt-outline" size={22} color={Colors.warning} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Export Arrears Summary CSV</Text>
              <Text style={styles.rowSubtitle}>
                Tenant-wise rent dues and payment summary
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Restore Card */}
        <SectionHeader title="Import & Migration" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleImportJSON}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors.deposit} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Import from JSON Backup</Text>
              <Text style={styles.rowSubtitle}>
                Restore previous backups with Safe Merge or Full Replace
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
          <Text style={styles.infoText}>
            Safe Merge automatically prevents duplicates by checking record IDs. Re-importing
            the same backup file multiple times will never duplicate transactions or charges.
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{statusMsg}</Text>
          </View>
        )}
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
  card: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
    marginLeft: 68,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: Spacing.base,
    padding: Spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.xs,
    color: Colors.success,
    lineHeight: 18,
    fontWeight: '500',
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
