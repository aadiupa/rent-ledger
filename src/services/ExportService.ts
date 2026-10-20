// ============================================================
// RentLedger — Export / Import Service
// CSV and JSON export; JSON restore with duplicate prevention
// ============================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { queryAll, queryFirst, executeSQL, withTransaction } from '../db/database';
import * as SQLite from 'expo-sqlite';
import { formatDate } from '../utils/currency';
import type { Transaction, Tenant, RentCharge, SecurityDeposit, Property } from '../models/types';

// ================================================================
// CSV Export
// ================================================================

export async function exportTransactionsCSV(db: SQLite.SQLiteDatabase): Promise<string> {
  const transactions = await queryAll<Transaction & { tenant_name?: string; property_name?: string }>(
    db,
    `SELECT t.*, tn.name as tenant_name, p.name as property_name
     FROM transactions t
     LEFT JOIN tenants tn ON t.tenant_id = tn.id
     LEFT JOIN properties p ON t.property_id = p.id
     ORDER BY t.date DESC`
  );

  const headers = [
    'Date', 'Type', 'Category', 'Amount (₹)', 'Description',
    'Tenant', 'Property', 'Payment Method', 'Reference', 'Notes',
  ];

  const rows = transactions.map((tx) => [
    formatDate(tx.date),
    tx.type,
    tx.category,
    (tx.amount / 100).toFixed(2),
    `"${tx.description.replace(/"/g, '""')}"`,
    tx.tenant_name ?? '',
    tx.property_name ?? '',
    tx.payment_method ?? '',
    tx.reference ?? '',
    `"${(tx.notes ?? '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csv;
}

export async function exportArrearsReportCSV(db: SQLite.SQLiteDatabase): Promise<string> {
  const rows = await queryAll<{
    tenant_name: string;
    opening_arrears: number;
    total_due: number;
    total_paid: number;
    total_waived: number;
  }>(
    db,
    `SELECT
       tn.name as tenant_name,
       tn.opening_arrears,
       COALESCE(SUM(rc.amount_due), 0) as total_due,
       COALESCE(SUM(rc.amount_paid), 0) as total_paid,
       COALESCE(SUM(rc.waived_amount), 0) as total_waived
     FROM tenants tn
     LEFT JOIN rent_charges rc ON rc.tenant_id = tn.id AND rc.due_date <= date('now')
     WHERE tn.is_active = 1
     GROUP BY tn.id`
  );

  const headers = ['Tenant', 'Opening Arrears (₹)', 'Total Charged (₹)', 'Total Paid (₹)', 'Total Waived (₹)', 'Current Arrears (₹)'];
  const csvRows = rows.map((r) => {
    const currentArrears = Math.max(0, r.opening_arrears + r.total_due - r.total_paid - r.total_waived);
    return [
      r.tenant_name,
      (r.opening_arrears / 100).toFixed(2),
      (r.total_due / 100).toFixed(2),
      (r.total_paid / 100).toFixed(2),
      (r.total_waived / 100).toFixed(2),
      (currentArrears / 100).toFixed(2),
    ].join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

// ================================================================
// JSON Full Backup
// ================================================================

export interface FullBackup {
  version: number;
  exported_at: string;
  properties: Property[];
  tenants: Tenant[];
  transactions: Transaction[];
  rent_charges: RentCharge[];
  security_deposits: SecurityDeposit[];
  settings: { key: string; value: string }[];
}

export async function createFullBackup(db: SQLite.SQLiteDatabase): Promise<FullBackup> {
  const [properties, tenants, transactions, rent_charges, security_deposits, settings] =
    await Promise.all([
      queryAll<Property>(db, 'SELECT * FROM properties ORDER BY id'),
      queryAll<Tenant>(db, 'SELECT * FROM tenants ORDER BY id'),
      queryAll<Transaction>(db, 'SELECT * FROM transactions ORDER BY date, id'),
      queryAll<RentCharge>(db, 'SELECT * FROM rent_charges ORDER BY period_year, period_month, tenant_id'),
      queryAll<SecurityDeposit>(db, 'SELECT * FROM security_deposits ORDER BY id'),
      queryAll<{ key: string; value: string }>(db, 'SELECT key, value FROM settings'),
    ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    properties,
    tenants,
    transactions,
    rent_charges,
    security_deposits,
    settings,
  };
}

// ================================================================
// JSON Restore (import)
// Restores from backup WITHOUT duplicating existing records.
// Uses INSERT OR IGNORE for all records to preserve existing data.
// ================================================================

export async function restoreFromBackup(
  db: SQLite.SQLiteDatabase,
  backup: FullBackup,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (mode === 'replace') {
    // Full replace: clear existing data first
    await withTransaction(db, async () => {
      await executeSQL(db, 'DELETE FROM rent_payment_allocations');
      await executeSQL(db, 'DELETE FROM rent_charges');
      await executeSQL(db, 'DELETE FROM transactions');
      await executeSQL(db, 'DELETE FROM security_deposits');
      await executeSQL(db, 'DELETE FROM tenants');
      await executeSQL(db, 'DELETE FROM units');
      await executeSQL(db, 'DELETE FROM properties');
    });
  }

  await withTransaction(db, async () => {
    // Properties
    for (const p of backup.properties) {
      const result = await executeSQL(
        db,
        'INSERT OR IGNORE INTO properties (id, name, address, notes, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        [p.id, p.name, p.address, p.notes ?? null, p.created_at, p.updated_at]
      );
      result.changes > 0 ? imported++ : skipped++;
    }

    // Tenants (need units too — create a default unit per tenant if missing)
    for (const t of backup.tenants) {
      try {
        // Ensure unit exists
        await executeSQL(
          db,
          `INSERT OR IGNORE INTO units (id, property_id, unit_name, created_at, updated_at)
           VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
          [t.unit_id, t.property_id, t.name]
        );

        const result = await executeSQL(
          db,
          `INSERT OR IGNORE INTO tenants
           (id, unit_id, property_id, name, monthly_rent, rent_due_day, lease_start, lease_end,
            security_deposit, security_deposit_refundable, opening_arrears, opening_arrears_date,
            contact_name, contact_phone, contact_email, notes, is_active, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            t.id, t.unit_id, t.property_id, t.name, t.monthly_rent, t.rent_due_day,
            t.lease_start, t.lease_end ?? null, t.security_deposit,
            t.security_deposit_refundable ? 1 : 0, t.opening_arrears,
            t.opening_arrears_date ?? null, t.contact_name ?? null,
            t.contact_phone ?? null, t.contact_email ?? null,
            t.notes ?? null, t.is_active ? 1 : 0, t.created_at, t.updated_at,
          ]
        );
        result.changes > 0 ? imported++ : skipped++;
      } catch (e) {
        errors.push(`Tenant ${t.name}: ${String(e)}`);
      }
    }

    // Transactions
    for (const tx of backup.transactions) {
      try {
        const result = await executeSQL(
          db,
          `INSERT OR IGNORE INTO transactions
           (id, date, property_id, tenant_id, type, category, amount, description,
            payment_method, reference, notes, is_opening_balance, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            tx.id, tx.date, tx.property_id ?? null, tx.tenant_id ?? null,
            tx.type, tx.category, tx.amount, tx.description,
            tx.payment_method ?? null, tx.reference ?? null, tx.notes ?? null,
            tx.is_opening_balance ? 1 : 0, tx.created_at, tx.updated_at,
          ]
        );
        result.changes > 0 ? imported++ : skipped++;
      } catch (e) {
        errors.push(`Transaction ${tx.id}: ${String(e)}`);
      }
    }

    // Rent charges
    for (const rc of backup.rent_charges) {
      try {
        const result = await executeSQL(
          db,
          `INSERT OR IGNORE INTO rent_charges
           (id, tenant_id, property_id, period_year, period_month, due_date,
            amount_due, amount_paid, status, waived_amount, waived_reason, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            rc.id, rc.tenant_id, rc.property_id, rc.period_year, rc.period_month,
            rc.due_date, rc.amount_due, rc.amount_paid, rc.status,
            rc.waived_amount, rc.waived_reason ?? null, rc.notes ?? null,
            rc.created_at, rc.updated_at,
          ]
        );
        result.changes > 0 ? imported++ : skipped++;
      } catch (e) {
        errors.push(`RentCharge ${rc.id}: ${String(e)}`);
      }
    }

    // Security deposits
    for (const sd of backup.security_deposits) {
      try {
        const result = await executeSQL(
          db,
          `INSERT OR IGNORE INTO security_deposits
           (id, tenant_id, property_id, receipt_date, amount_received,
            amount_refunded, amount_retained, retained_reason, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            sd.id, sd.tenant_id, sd.property_id, sd.receipt_date,
            sd.amount_received, sd.amount_refunded, sd.amount_retained,
            sd.retained_reason ?? null, sd.notes ?? null, sd.created_at, sd.updated_at,
          ]
        );
        result.changes > 0 ? imported++ : skipped++;
      } catch (e) {
        errors.push(`SecurityDeposit ${sd.id}: ${String(e)}`);
      }
    }

    // Settings (don't overwrite local settings on merge)
    if (mode === 'replace') {
      for (const s of backup.settings) {
        await executeSQL(
          db,
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))',
          [s.key, s.value]
        );
      }
    }
  });

  return { imported, skipped, errors };
}

// ================================================================
// File sharing helpers
// ================================================================

export async function shareCSV(csv: string, filename: string): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
}

export async function shareJSON(data: unknown, filename: string): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  const json = JSON.stringify(data, null, 2);
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'application/json', UTI: 'public.json' });
}

export async function readJSONFromFile(uri: string): Promise<unknown> {
  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return JSON.parse(content);
}
