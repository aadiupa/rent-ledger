// ============================================================
// RentLedger — Property & Tenant Database Operations
// ============================================================

import * as SQLite from 'expo-sqlite';
import { queryAll, queryFirst, executeSQL, withTransaction } from '../db/database';
import type { Property, Unit, Tenant } from '../models/types';

// ---- Properties ------------------------------------------------

export async function getAllProperties(db: SQLite.SQLiteDatabase): Promise<Property[]> {
  return queryAll<Property>(db, 'SELECT * FROM properties ORDER BY name');
}

export async function getProperty(db: SQLite.SQLiteDatabase, id: number): Promise<Property | null> {
  return queryFirst<Property>(db, 'SELECT * FROM properties WHERE id = ?', [id]);
}

export async function createProperty(
  db: SQLite.SQLiteDatabase,
  data: { name: string; address: string; notes?: string }
): Promise<number> {
  const result = await executeSQL(
    db,
    'INSERT INTO properties (name, address, notes) VALUES (?, ?, ?)',
    [data.name, data.address, data.notes ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateProperty(
  db: SQLite.SQLiteDatabase,
  id: number,
  data: { name?: string; address?: string; notes?: string }
): Promise<void> {
  await executeSQL(
    db,
    `UPDATE properties SET name = COALESCE(?, name), address = COALESCE(?, address),
     notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [data.name ?? null, data.address ?? null, data.notes ?? null, id]
  );
}

export async function deleteProperty(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await executeSQL(db, 'DELETE FROM properties WHERE id = ?', [id]);
}

// ---- Units -----------------------------------------------------

export async function getUnitsForProperty(
  db: SQLite.SQLiteDatabase,
  propertyId: number
): Promise<Unit[]> {
  return queryAll<Unit>(db, 'SELECT * FROM units WHERE property_id = ? ORDER BY unit_name', [propertyId]);
}

export async function createUnit(
  db: SQLite.SQLiteDatabase,
  propertyId: number,
  unitName: string,
  notes?: string
): Promise<number> {
  const result = await executeSQL(
    db,
    'INSERT INTO units (property_id, unit_name, notes) VALUES (?, ?, ?)',
    [propertyId, unitName, notes ?? null]
  );
  return result.lastInsertRowId;
}

// ---- Tenants ---------------------------------------------------

export async function getAllTenants(db: SQLite.SQLiteDatabase): Promise<Tenant[]> {
  return queryAll<Tenant>(db, 'SELECT * FROM tenants ORDER BY name');
}

export async function getActiveTenants(db: SQLite.SQLiteDatabase): Promise<Tenant[]> {
  return queryAll<Tenant>(db, 'SELECT * FROM tenants WHERE is_active = 1 ORDER BY name');
}

export async function getTenantsForProperty(
  db: SQLite.SQLiteDatabase,
  propertyId: number
): Promise<Tenant[]> {
  return queryAll<Tenant>(
    db,
    'SELECT * FROM tenants WHERE property_id = ? ORDER BY name',
    [propertyId]
  );
}

export async function getTenant(db: SQLite.SQLiteDatabase, id: number): Promise<Tenant | null> {
  return queryFirst<Tenant>(db, 'SELECT * FROM tenants WHERE id = ?', [id]);
}

export async function createTenant(
  db: SQLite.SQLiteDatabase,
  data: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  let tenantId = 0;

  await withTransaction(db, async () => {
    // Create unit if needed
    let unitId = data.unit_id;
    if (!unitId) {
      const unitResult = await executeSQL(
        db,
        'INSERT INTO units (property_id, unit_name) VALUES (?, ?)',
        [data.property_id, data.name]
      );
      unitId = unitResult.lastInsertRowId;
    }

    const result = await executeSQL(
      db,
      `INSERT INTO tenants
       (unit_id, property_id, name, monthly_rent, rent_due_day, lease_start, lease_end,
        security_deposit, security_deposit_refundable, opening_arrears, opening_arrears_date,
        contact_name, contact_phone, contact_email, notes, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        unitId,
        data.property_id,
        data.name,
        data.monthly_rent,
        data.rent_due_day,
        data.lease_start,
        data.lease_end ?? null,
        data.security_deposit,
        data.security_deposit_refundable ? 1 : 0,
        data.opening_arrears,
        data.opening_arrears_date ?? null,
        data.contact_name ?? null,
        data.contact_phone ?? null,
        data.contact_email ?? null,
        data.notes ?? null,
        data.is_active ? 1 : 0,
      ]
    );
    tenantId = result.lastInsertRowId;

    // If security deposit provided, create deposit record + income transaction
    if (data.security_deposit > 0) {
      const today = new Date().toISOString().split('T')[0];
      await executeSQL(
        db,
        `INSERT INTO security_deposits
         (tenant_id, property_id, receipt_date, amount_received)
         VALUES (?, ?, ?, ?)`,
        [tenantId, data.property_id, today, data.security_deposit]
      );
      await executeSQL(
        db,
        `INSERT INTO transactions
         (date, property_id, tenant_id, type, category, amount, description)
         VALUES (?, ?, ?, 'income', 'Security Deposit', ?, ?)`,
        [today, data.property_id, tenantId, data.security_deposit,
         `Security deposit received from ${data.name}`]
      );
    }
  });

  return tenantId;
}

export async function updateTenant(
  db: SQLite.SQLiteDatabase,
  id: number,
  data: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const fields = Object.entries(data)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(data).map((v) =>
    typeof v === 'boolean' ? (v ? 1 : 0) : v ?? null
  );

  await executeSQL(
    db,
    `UPDATE tenants SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id] as (string | number | null)[]
  );
}

export async function deleteTenant(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await executeSQL(db, 'DELETE FROM tenants WHERE id = ?', [id]);
}

// ---- Property summary view ------------------------------------

export async function getPropertySummary(
  db: SQLite.SQLiteDatabase
): Promise<{ property: Property; tenantCount: number; totalMonthlyRent: number }[]> {
  const properties = await getAllProperties(db);
  return Promise.all(
    properties.map(async (p) => {
      const row = await queryFirst<{ count: number; total: number }>(
        db,
        `SELECT COUNT(*) as count, COALESCE(SUM(monthly_rent), 0) as total
         FROM tenants WHERE property_id = ? AND is_active = 1`,
        [p.id]
      );
      return {
        property: p,
        tenantCount: row?.count ?? 0,
        totalMonthlyRent: row?.total ?? 0,
      };
    })
  );
}
