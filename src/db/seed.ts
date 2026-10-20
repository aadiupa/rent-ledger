// ============================================================
// RentLedger — Seed Data
// Generic dummy sample data for testing and initial verification.
// All amounts in paise (multiply rupees × 100).
// ============================================================

export const SEED_PROPERTIES_SQL = `
-- ---- Property --------------------------------------------------
INSERT OR IGNORE INTO properties (id, name, address, notes)
VALUES (1, 'Sample Residency', '100 Sample Avenue, Demo District', 'Sample demo property');

-- ---- Units -----------------------------------------------------
INSERT OR IGNORE INTO units (id, property_id, unit_name) VALUES
  (1, 1, 'Flat 101'),
  (2, 1, 'Retail Unit 1'),
  (3, 1, 'Retail Unit 2'),
  (4, 1, 'Office Suite 301');

-- ---- Tenants ---------------------------------------------------
-- Monthly rent stored in paise:
--   Tenant 1:  ₹17,500 = 1750000 paise
--   Tenant 2:  ₹23,000 = 2300000 paise
--   Tenant 3:  ₹45,000 = 4500000 paise
--   Tenant 4: ₹1,30,000 = 13000000 paise

INSERT OR IGNORE INTO tenants
  (id, unit_id, property_id, name, monthly_rent, rent_due_day,
   lease_start, security_deposit, security_deposit_refundable,
   opening_arrears, opening_arrears_date, is_active)
VALUES
  (1, 1, 1, 'Tenant 1',  1750000, 1, '2026-10-01', 10000000, 1, 0,        NULL,         1),
  (2, 2, 1, 'Tenant 2',  2300000, 1, '2026-10-01',  8000000, 1, 0,        NULL,         1),
  (3, 3, 1, 'Tenant 3',  4500000, 1, '2026-10-01',        0, 1, 0,        NULL,         1),
  (4, 4, 1, 'Tenant 4', 13000000, 1, '2026-10-01',        0, 1, 49000000, '2026-10-01', 1);

-- ---- Security deposits -----------------------------------------
INSERT OR IGNORE INTO security_deposits
  (id, tenant_id, property_id, receipt_date, amount_received)
VALUES
  (1, 1, 1, '2026-10-15', 10000000),
  (2, 2, 1, '2026-10-18',  8000000);

-- ---- Transactions ----------------------------------------------
-- 1. Tenant 1 security deposit received ₹1,00,000
INSERT OR IGNORE INTO transactions
  (id, date, property_id, tenant_id, type, category, amount, description, payment_method)
VALUES
  (1, '2026-10-15', 1, 1, 'income', 'Security Deposit', 10000000,
   'Security deposit received from Tenant 1', 'bank_transfer');

-- 2. Tenant 2 security deposit received ₹80,000
INSERT OR IGNORE INTO transactions
  (id, date, property_id, tenant_id, type, category, amount, description, payment_method)
VALUES
  (2, '2026-10-18', 1, 2, 'income', 'Security Deposit', 8000000,
   'Security deposit received from Tenant 2', 'bank_transfer');

-- 3. Tenant 3 rent received ₹44,000 (partial)
INSERT OR IGNORE INTO transactions
  (id, date, property_id, tenant_id, type, category, amount, description, payment_method)
VALUES
  (3, '2026-10-05', 1, 3, 'income', 'Monthly Rent', 4400000,
   'October rent received from Tenant 3', 'upi');

-- 4. Tenant 4 arrears payment received ₹2,00,000
INSERT OR IGNORE INTO transactions
  (id, date, property_id, tenant_id, type, category, amount, description, payment_method)
VALUES
  (4, '2026-10-10', 1, 4, 'income', 'Arrears Recovery', 20000000,
   'Arrears payment received from Tenant 4', 'bank_transfer');

-- ---- Rent charges for October 2026 ----------------------------
INSERT OR IGNORE INTO rent_charges
  (id, tenant_id, property_id, period_year, period_month, due_date,
   amount_due, amount_paid, status)
VALUES
  (1, 3, 1, 2026, 10, '2026-10-01', 4500000, 4400000, 'partially_paid');

-- ---- Allocate payment to charge --------------------------------
INSERT OR IGNORE INTO rent_payment_allocations
  (id, transaction_id, rent_charge_id, amount_allocated)
VALUES
  (1, 3, 1, 4400000);

-- Tenant 4 October charge
INSERT OR IGNORE INTO rent_charges
  (id, tenant_id, property_id, period_year, period_month, due_date,
   amount_due, amount_paid, status)
VALUES
  (2, 4, 1, 2026, 10, '2026-10-01', 13000000, 0, 'due');
`;
