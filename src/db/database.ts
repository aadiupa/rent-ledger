// ============================================================
// RentLedger — Database Connection & Operations
// Uses expo-sqlite v14 (synchronous API via useSQLiteContext)
// ============================================================

import * as SQLite from 'expo-sqlite';
import {
  CREATE_TABLES_SQL,
  SEED_CATEGORIES_SQL,
  SEED_SETTINGS_SQL,
  RECORD_SCHEMA_VERSION_SQL,
  SCHEMA_VERSION,
} from './schema';
import { SEED_PROPERTIES_SQL } from './seed';

export const DB_NAME = 'rentledger.db';

// ---- Open database and run migrations --------------------------

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL and foreign keys
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables (idempotent)
  await db.execAsync(CREATE_TABLES_SQL);

  // Record schema version
  await db.execAsync(RECORD_SCHEMA_VERSION_SQL);

  // Seed system categories
  await db.execAsync(SEED_CATEGORIES_SQL);

  // Seed settings
  await db.execAsync(SEED_SETTINGS_SQL);

  // Seed example data on first run
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'db_seeded'"
  );
  if (setting?.value === '0') {
    await seedExampleData(db);
    await db.runAsync(
      "UPDATE settings SET value = '1', updated_at = datetime('now') WHERE key = 'db_seeded'"
    );
    await db.runAsync(
      "UPDATE settings SET value = '1', updated_at = datetime('now') WHERE key = 'first_run_complete'"
    );
  }
}

async function seedExampleData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SEED_PROPERTIES_SQL);
}

// ---- Generic query helpers -------------------------------------

export async function queryAll<T>(
  db: SQLite.SQLiteDatabase,
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  return db.getAllAsync<T>(sql, params);
}

export async function queryFirst<T>(
  db: SQLite.SQLiteDatabase,
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  return db.getFirstAsync<T>(sql, params);
}

export async function executeSQL(
  db: SQLite.SQLiteDatabase,
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  return db.runAsync(sql, params);
}

// ---- Transaction wrapper ---------------------------------------

export async function withTransaction<T>(
  db: SQLite.SQLiteDatabase,
  fn: () => Promise<T>
): Promise<T> {
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await fn();
  });
  return result!;
}
