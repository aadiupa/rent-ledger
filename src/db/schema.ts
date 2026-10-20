// ============================================================
// RentLedger — SQLite Database Schema & Migrations
// Schema version 1 — Initial release
// ============================================================

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Properties ------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Units (shops / flats within a property) -------------------
CREATE TABLE IF NOT EXISTS units (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_name   TEXT NOT NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Tenants ---------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id                      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  property_id                  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name                         TEXT NOT NULL,
  monthly_rent                 INTEGER NOT NULL DEFAULT 0,   -- paise
  rent_due_day                 INTEGER NOT NULL DEFAULT 1,   -- 1-28
  lease_start                  TEXT NOT NULL,
  lease_end                    TEXT,
  security_deposit             INTEGER NOT NULL DEFAULT 0,   -- paise received
  security_deposit_refundable  INTEGER NOT NULL DEFAULT 1,   -- 0/1 boolean
  opening_arrears              INTEGER NOT NULL DEFAULT 0,   -- paise
  opening_arrears_date         TEXT,
  contact_name                 TEXT,
  contact_phone                TEXT,
  contact_email                TEXT,
  notes                        TEXT,
  is_active                    INTEGER NOT NULL DEFAULT 1,
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Transactions (income + expense cash ledger) ---------------
CREATE TABLE IF NOT EXISTS transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  date              TEXT NOT NULL,           -- YYYY-MM-DD
  property_id       INTEGER REFERENCES properties(id),
  tenant_id         INTEGER REFERENCES tenants(id),
  type              TEXT NOT NULL CHECK(type IN ('income','expense')),
  category          TEXT NOT NULL,
  amount            INTEGER NOT NULL DEFAULT 0,  -- paise, always positive
  description       TEXT NOT NULL DEFAULT '',
  payment_method    TEXT,
  reference         TEXT,
  notes             TEXT,
  is_opening_balance INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant    ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(category);

-- ---- Rent charges (one row per tenant per month) ---------------
CREATE TABLE IF NOT EXISTS rent_charges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id  INTEGER NOT NULL REFERENCES properties(id),
  period_year  INTEGER NOT NULL,
  period_month INTEGER NOT NULL,    -- 1-12
  due_date     TEXT NOT NULL,       -- YYYY-MM-DD
  amount_due   INTEGER NOT NULL,    -- paise
  amount_paid  INTEGER NOT NULL DEFAULT 0,  -- paise (sum of allocations)
  status       TEXT NOT NULL DEFAULT 'upcoming'
               CHECK(status IN ('upcoming','due','partially_paid','paid','overdue','waived')),
  waived_amount  INTEGER NOT NULL DEFAULT 0,
  waived_reason  TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, period_year, period_month)    -- prevents duplicates
);

CREATE INDEX IF NOT EXISTS idx_rent_charges_tenant ON rent_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_status ON rent_charges(status);

-- ---- Rent payment allocations ----------------------------------
-- Links a cash transaction to a rent charge (many:many)
CREATE TABLE IF NOT EXISTS rent_payment_allocations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id   INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  rent_charge_id   INTEGER NOT NULL REFERENCES rent_charges(id) ON DELETE CASCADE,
  amount_allocated INTEGER NOT NULL,   -- paise
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(transaction_id, rent_charge_id)
);

-- ---- Security deposit register ---------------------------------
CREATE TABLE IF NOT EXISTS security_deposits (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id        INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id      INTEGER NOT NULL REFERENCES properties(id),
  receipt_date     TEXT NOT NULL,
  amount_received  INTEGER NOT NULL DEFAULT 0,  -- paise
  amount_refunded  INTEGER NOT NULL DEFAULT 0,  -- paise
  amount_retained  INTEGER NOT NULL DEFAULT 0,  -- paise
  retained_reason  TEXT,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Categories ------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK(type IN ('income','expense')),
  name       TEXT NOT NULL,
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(type, name)
);

-- ---- Settings key-value store ----------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SEED_CATEGORIES_SQL = `
INSERT OR IGNORE INTO categories (type, name, is_system) VALUES
  ('income',  'Monthly Rent',             1),
  ('income',  'Arrears Recovery',         1),
  ('income',  'Security Deposit',         1),
  ('income',  'Other Income',             1),
  ('expense', 'Repairs & Maintenance',    1),
  ('expense', 'Property Tax',             1),
  ('expense', 'Utilities',               1),
  ('expense', 'Insurance',               1),
  ('expense', 'Brokerage',               1),
  ('expense', 'Legal & Registration',    1),
  ('expense', 'Loan Interest',           1),
  ('expense', 'Other Expense',           1);
`;

export const SEED_SETTINGS_SQL = `
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('opening_cash_balance', '0'),
  ('opening_cash_date',    '2026-01-01'),
  ('currency',             'INR'),
  ('timezone',             'Asia/Kolkata'),
  ('app_lock_enabled',     '0'),
  ('theme',                'system'),
  ('auto_generate_charges','1'),
  ('charge_advance_days',  '5'),
  ('first_run_complete',   '0'),
  ('db_seeded',            '0');
`;

// Schema version tracking
export const RECORD_SCHEMA_VERSION_SQL = `
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
`;
