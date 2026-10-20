// ============================================================
// RentLedger Desktop — Local SQLite Backend API
// Ultra-fast, 100% offline, zero-dependency server.
// Runs locally on port 3002.
// ============================================================

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// SQLite database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, 'rentledger.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// IST Calendar Helpers (Asia/Kolkata) with date-pinning support for deterministic tests
function getTodayIST() {
  if (process.env.APP_DATE) return process.env.APP_DATE;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseDateParts(dateStr) {
  const parts = (dateStr || getTodayIST()).split('-').map(Number);
  return [parts[0], parts[1], parts[2] || 1];
}

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      rental_start_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      unit_name TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      monthly_rent INTEGER NOT NULL DEFAULT 0,
      rent_due_day INTEGER NOT NULL DEFAULT 1,
      lease_start TEXT NOT NULL,
      lease_end TEXT,
      security_deposit INTEGER DEFAULT 0,
      security_deposit_refundable INTEGER DEFAULT 1,
      opening_arrears INTEGER DEFAULT 0,
      opening_arrears_date TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rent_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period_year INTEGER NOT NULL,
      period_month INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount_due INTEGER NOT NULL DEFAULT 0,
      amount_paid INTEGER NOT NULL DEFAULT 0,
      waived_amount INTEGER NOT NULL DEFAULT 0,
      waived_reason TEXT,
      status TEXT NOT NULL DEFAULT 'due',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, period_year, period_month)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
      transaction_type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      vendor TEXT,
      expense_type TEXT DEFAULT 'opex',
      payment_method TEXT,
      reference TEXT,
      notes TEXT,
      is_opening_balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rent_payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      rent_charge_id INTEGER NOT NULL REFERENCES rent_charges(id) ON DELETE CASCADE,
      amount_allocated INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(transaction_id, rent_charge_id)
    );

    CREATE TABLE IF NOT EXISTS security_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      receipt_date TEXT NOT NULL,
      amount_received INTEGER NOT NULL DEFAULT 0,
      amount_refunded INTEGER NOT NULL DEFAULT 0,
      amount_retained INTEGER NOT NULL DEFAULT 0,
      refund_date TEXT,
      status TEXT DEFAULT 'held',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: ensure rental_start_date column exists in properties table
  try {
    const propCols = db.prepare("PRAGMA table_info(properties)").all().map(c => c.name);
    if (!propCols.includes('rental_start_date')) {
      db.prepare("ALTER TABLE properties ADD COLUMN rental_start_date TEXT").run();
    }
  } catch (e) {
    // Column might already exist
  }

  // Migration: ensure notes column exists in rent_charges table
  try {
    const chargeCols = db.prepare("PRAGMA table_info(rent_charges)").all().map(c => c.name);
    if (!chargeCols.includes('notes')) {
      db.prepare("ALTER TABLE rent_charges ADD COLUMN notes TEXT").run();
    }
  } catch (e) {
    // Column might already exist
  }

  // Ensure all waived rent charges exist in transactions (Financial Ledger)
  try {
    const waivedCharges = db.prepare(`
      SELECT c.*, t.name as tenant_name 
      FROM rent_charges c
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE c.waived_amount > 0
    `).all();

    for (const w of waivedCharges) {
      const ref = `Charge #${w.id}`;
      const existingTx = db.prepare("SELECT id FROM transactions WHERE reference = ? AND transaction_type = 'waiver'").get(ref);
      if (!existingTx) {
        db.prepare(`
          INSERT INTO transactions (
            date, property_id, tenant_id, transaction_type, category, amount, description, payment_method, reference
          ) VALUES (?, ?, ?, 'waiver', 'Rent Waiver', ?, ?, 'Waived', ?)
        `).run(
          w.due_date,
          w.property_id,
          w.tenant_id,
          w.waived_amount,
          `Rent waiver: ${w.waived_reason || 'Landlord concession'} (${w.tenant_name || 'Tenant'})`,
          ref
        );
      }
    }
  } catch (e) {
    // ignore
  }

  // Default settings
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('opening_cash_balance', '0')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_generate_charges', '1')").run();

  // Seed sample data if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM properties").get().count;
  if (count === 0) {
    seedSampleData();
  }
}

function seedSampleData() {
  console.log("Seeding generic initial sample data into SQLite...");

  const insertProp = db.prepare("INSERT INTO properties (name, address, notes, status) VALUES (?, ?, ?, ?)");
  const p1 = insertProp.run("Metro Residency", "100 Sample Boulevard, North Zone", "Residential apartment complex", "active").lastInsertRowid;
  const p2 = insertProp.run("Central Commercial Plaza", "500 Market Square, Business District", "Commercial retail complex", "active").lastInsertRowid;
  const p3 = insertProp.run("5th Avenue Site (New Project)", "Plot 42, Sector 9, Development Corridor", "New 5th property currently under construction", "under_construction").lastInsertRowid;

  const insertUnit = db.prepare("INSERT INTO units (property_id, unit_name, notes) VALUES (?, ?, ?)");
  const u1 = insertUnit.run(p1, "Flat 4B", "2BHK residential flat").lastInsertRowid;
  const u2 = insertUnit.run(p2, "Shop 1", "Ground floor retail").lastInsertRowid;
  const u3 = insertUnit.run(p2, "Shop 2", "Corner commercial space").lastInsertRowid;
  const u4 = insertUnit.run(p1, "Penthouse A", "Top floor suite").lastInsertRowid;

  const insertTenant = db.prepare(`
    INSERT INTO tenants (
      property_id, unit_id, name, monthly_rent, rent_due_day, lease_start,
      security_deposit, security_deposit_refundable, opening_arrears, opening_arrears_date,
      contact_name, contact_phone, contact_email, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const t1 = insertTenant.run(p1, u1, "Tenant 1", 1750000, 1, "2026-08-01", 10000000, 1, 0, null, "Sample Contact 1", "+91 90000 00001", "tenant1@example.com").lastInsertRowid;
  const t2 = insertTenant.run(p2, u2, "Tenant 2", 2300000, 5, "2026-07-01", 8000000, 1, 0, null, "Sample Contact 2", "+91 90000 00002", "tenant2@example.com").lastInsertRowid;
  const t3 = insertTenant.run(p2, u3, "Tenant 3", 4500000, 1, "2026-09-01", 15000000, 1, 0, null, "Sample Contact 3", "+91 90000 00003", "tenant3@example.com").lastInsertRowid;
  const t4 = insertTenant.run(p1, u4, "Tenant 4", 13000000, 1, "2026-06-01", 30000000, 1, 49000000, "2026-06-01", "Sample Contact 4", "+91 90000 00004", "tenant4@example.com").lastInsertRowid;

  // Security deposits
  const insertDep = db.prepare("INSERT INTO security_deposits (tenant_id, property_id, receipt_date, amount_received, status) VALUES (?, ?, ?, ?, 'held')");
  insertDep.run(t1, p1, "2026-08-01", 10000000);
  insertDep.run(t2, p2, "2026-07-01", 8000000);

  // Transactions (Receipts & Expenses, including Capex for 5th Property!)
  const insertTx = db.prepare(`
    INSERT INTO transactions (date, property_id, tenant_id, transaction_type, category, amount, description, vendor, expense_type, payment_method, reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Income
  insertTx.run("2026-08-01", p1, t1, "income", "Security Deposit", 10000000, "Security deposit received from Tenant 1", null, "opex", "Bank Transfer", "NEFT-100234");
  insertTx.run("2026-07-01", p2, t2, "income", "Security Deposit", 8000000, "Security deposit received from Tenant 2", null, "opex", "UPI", "UPI-442381");
  insertTx.run("2026-09-02", p1, t1, "income", "Monthly Rent", 1750000, "September rent payment from Tenant 1", null, "opex", "Bank Transfer", "NEFT-200451");
  insertTx.run("2026-09-10", p1, t4, "income", "Arrears Recovery", 20000000, "Partial arrears recovery paid by Tenant 4", null, "opex", "Cheque", "CHQ-890123");
  insertTx.run("2026-10-02", p2, t2, "income", "Monthly Rent", 2300000, "October rent payment from Tenant 2", null, "opex", "UPI", "UPI-551982");

  // Operational Expenses
  insertTx.run("2026-09-15", p1, null, "expense", "Repairs & Maintenance", 850000, "Plumbing repair and maintenance", "QuickFix Services", "opex", "Cash", null);
  insertTx.run("2026-10-05", p2, null, "expense", "Property Tax", 1200000, "Annual municipal commercial property tax", "City Municipal Corp", "opex", "Bank Transfer", "TAX-99812");

  // Construction & Capex Expenses (Building the 5th Property!)
  insertTx.run("2026-09-20", p3, null, "expense", "Civil Construction & Labor", 15000000, "Piling, foundation excavation and structural civil labor", "Apex Civil Contractors", "capex", "Bank Transfer", "NEFT-883921");
  insertTx.run("2026-09-28", p3, null, "expense", "Raw Building Materials", 7800000, "TMT 550D steel rebars & 500 bags of Portland cement", "Metro Steel & Cement Depot", "capex", "Bank Transfer", "NEFT-891044");
  insertTx.run("2026-10-08", p3, null, "expense", "Architectural & Engineering", 4500000, "Structural blueprints, MEP drawings & municipal sanction fee", "Design Studio Associates", "capex", "Cheque", "CHQ-110293");

  // Auto-generate initial rent charges
  generateMonthlyCharges();

  // Re-allocate all seeded rent & arrears receipts onto charges FIFO
  for (const tid of [t1, t2, t3, t4]) {
    reallocateTenantPayments(tid);
  }
}

// Re-allocate all rent payments for a tenant onto charges FIFO
function reallocateTenantPayments(tenantId) {
  const tId = Number(tenantId);
  if (!tId || isNaN(tId)) return;

  const txs = db.prepare(`
    SELECT id, amount, date FROM transactions 
    WHERE tenant_id = ? AND transaction_type = 'income' AND category IN ('Monthly Rent', 'Arrears Recovery')
    ORDER BY date ASC, id ASC
  `).all(tId);

  // Clear existing allocations for this tenant's charges
  const chargeIds = db.prepare(`SELECT id FROM rent_charges WHERE tenant_id = ?`).all(tId).map(c => c.id);
  if (chargeIds.length > 0) {
    const placeholders = chargeIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM rent_payment_allocations WHERE rent_charge_id IN (${placeholders})`).run(...chargeIds);
    db.prepare(`UPDATE rent_charges SET amount_paid = 0, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(...chargeIds);
  }

  // Re-allocate FIFO to charges ordered by due_date ASC, id ASC
  for (const tx of txs) {
    const unpaid = db.prepare(`
      SELECT * FROM rent_charges 
      WHERE tenant_id = ? AND (amount_paid + waived_amount) < amount_due 
      ORDER BY due_date ASC, id ASC
    `).all(tId);

    let remaining = tx.amount;
    for (const chg of unpaid) {
      if (remaining <= 0) break;
      const needed = Math.max(0, chg.amount_due - chg.amount_paid - chg.waived_amount);
      if (needed <= 0) continue;

      const toAlloc = Math.min(remaining, needed);
      db.prepare(`
        INSERT INTO rent_payment_allocations (transaction_id, rent_charge_id, amount_allocated)
        VALUES (?, ?, ?)
        ON CONFLICT(transaction_id, rent_charge_id) DO UPDATE SET amount_allocated = amount_allocated + excluded.amount_allocated
      `).run(tx.id, chg.id, toAlloc);

      db.prepare(`
        UPDATE rent_charges
        SET amount_paid = amount_paid + ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(toAlloc, chg.id);

      remaining -= toAlloc;
    }
  }

  updateChargeStatuses();
}

// Generate monthly rent charges idempotently (with prorated rent calculation for mid-month starts e.g. 25th)
function generateMonthlyCharges(upToDate = getTodayIST()) {
  const tenants = db.prepare("SELECT * FROM tenants WHERE is_active = 1").all();
  const insertCharge = db.prepare(`
    INSERT OR IGNORE INTO rent_charges (
      tenant_id, property_id, period_year, period_month, due_date, amount_due, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let count = 0;

  for (const t of tenants) {
    if (!t.lease_start) continue;
    const [startY, startM, startD] = parseDateParts(t.lease_start);
    let y = startY;
    let m = startM;

    const [todayY, todayM] = parseDateParts(upToDate);

    while (y < todayY || (y === todayY && m <= todayM)) {
      const daysInMonth = getDaysInMonth(y, m);
      let amountDue = t.monthly_rent;
      let dueDate = '';
      let notes = null;

      // If starting month and lease starts mid-month (e.g. 25th)
      if (y === startY && m === startM && startD > 1) {
        const activeDays = daysInMonth - startD + 1;
        amountDue = Math.round((t.monthly_rent * activeDays) / daysInMonth);
        dueDate = t.lease_start; // Due on move-in date
        notes = `Prorated rent: ${startD} ${monthNames[m - 1]} – ${daysInMonth} ${monthNames[m - 1]} (${activeDays} days)`;
      } else {
        const dueDay = Math.min(t.rent_due_day || 1, daysInMonth);
        dueDate = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      }

      if (dueDate <= upToDate) {
        const res = insertCharge.run(
          t.id,
          t.property_id,
          y,
          m,
          dueDate,
          amountDue,
          dueDate < upToDate ? 'overdue' : 'due',
          notes
        );
        if (res.changes > 0) count++;
      }

      m++;
      if (m > 12) { m = 1; y++; }
    }
  }

  updateChargeStatuses(upToDate);
  return count;
}

function updateChargeStatuses(today = getTodayIST()) {
  db.prepare(`
    UPDATE rent_charges SET status = 'paid', updated_at = datetime('now')
    WHERE (amount_paid + waived_amount) >= amount_due
  `).run();

  db.prepare(`
    UPDATE rent_charges SET status = 'partially_paid', updated_at = datetime('now')
    WHERE amount_paid > 0 AND (amount_paid + waived_amount) < amount_due
  `).run();

  db.prepare(`
    UPDATE rent_charges SET status = 'overdue', updated_at = datetime('now')
    WHERE due_date < ? AND amount_paid = 0 AND (amount_paid + waived_amount) < amount_due
  `).run(today);

  db.prepare(`
    UPDATE rent_charges SET status = 'due', updated_at = datetime('now')
    WHERE due_date >= ? AND amount_paid = 0 AND (amount_paid + waived_amount) < amount_due
  `).run(today);
}

// Accounting calculations
function getAvailableCash() {
  const opening = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'opening_cash_balance'").get()?.value || '0', 10);
  const inc = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = 'income'").get().total;
  const exp = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = 'expense'").get().total;
  return opening + inc - exp;
}

function getTenantArrears(tenantId, asOfDate = getTodayIST()) {
  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId);
  if (!tenant) return 0;

  const dueRow = db.prepare(`
    SELECT COALESCE(SUM(amount_due), 0) as total FROM rent_charges
    WHERE tenant_id = ? AND due_date <= ?
  `).get(tenantId, asOfDate);

  const waivedRow = db.prepare(`
    SELECT COALESCE(SUM(waived_amount), 0) as total FROM rent_charges
    WHERE tenant_id = ? AND due_date <= ?
  `).get(tenantId, asOfDate);

  const paidRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE tenant_id = ? AND transaction_type = 'income' 
      AND category IN ('Monthly Rent', 'Arrears Recovery')
      AND date <= ?
  `).get(tenantId, asOfDate);

  const balance = tenant.opening_arrears + dueRow.total - paidRow.total - waivedRow.total;
  return Math.max(0, balance);
}

// Initialize on start
initSchema();

// Auto generate charges on startup if enabled
const autoGen = db.prepare("SELECT value FROM settings WHERE key = 'auto_generate_charges'").get()?.value;
if (autoGen === '1') {
  generateMonthlyCharges();
}

// API Routes -----------------------------------------------------------------

// 1. Dashboard API
app.get('/api/dashboard', (req, res) => {
  const [curY, curM] = parseDateParts(getTodayIST());
  const year = parseInt(req.query.year || curY, 10);
  const month = parseInt(req.query.month || curM, 10);

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInM = getDaysInMonth(year, month);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;

  const availableCash = getAvailableCash();

  const monthlyTxs = db.prepare("SELECT * FROM transactions WHERE date >= ? AND date <= ?").all(start, end);
  let rentCollected = 0, arrearsCollected = 0, securityDeposits = 0, totalIncome = 0, totalExpenses = 0, totalWaivers = 0;

  for (const tx of monthlyTxs) {
    if (tx.transaction_type === 'income') {
      totalIncome += tx.amount;
      if (tx.category === 'Monthly Rent') rentCollected += tx.amount;
      else if (tx.category === 'Arrears Recovery') arrearsCollected += tx.amount;
      else if (tx.category === 'Security Deposit') securityDeposits += tx.amount;
    } else if (tx.transaction_type === 'expense') {
      totalExpenses += tx.amount;
    } else if (tx.transaction_type === 'waiver') {
      totalWaivers += tx.amount;
    }
  }

  const expectedRent = db.prepare("SELECT COALESCE(SUM(monthly_rent), 0) as total FROM tenants WHERE is_active = 1").get().total;
  const activeTenants = db.prepare("SELECT * FROM tenants WHERE is_active = 1").all();

  const overdueTenants = [];
  let totalArrears = 0;

  for (const t of activeTenants) {
    const arr = getTenantArrears(t.id);
    totalArrears += arr;
    if (arr > 0) {
      const prop = db.prepare("SELECT name FROM properties WHERE id = ?").get(t.property_id);
      overdueTenants.push({
        id: t.id,
        name: t.name,
        property_name: prop?.name,
        monthly_rent: t.monthly_rent,
        rent_due_day: t.rent_due_day,
        arrears: arr
      });
    }
  }

  const totalDeposits = db.prepare("SELECT COALESCE(SUM(amount_received - amount_refunded - amount_retained), 0) as total FROM security_deposits").get().total;

  res.json({
    available_cash: availableCash,
    expected_rent: expectedRent,
    rent_collected: rentCollected,
    arrears_collected: arrearsCollected,
    security_deposits_received: securityDeposits,
    total_expenses: totalExpenses,
    total_waivers: totalWaivers,
    net_cash_flow: totalIncome - totalExpenses,
    total_outstanding_arrears: totalArrears,
    total_refundable_deposits: Math.max(0, totalDeposits),
    overdue_tenants: overdueTenants
  });
});

// 2. Properties
app.get('/api/properties', (req, res) => {
  const props = db.prepare(`
    SELECT p.*,
      COUNT(DISTINCT u.id) as unit_count,
      COUNT(DISTINCT t.id) as tenant_count,
      COALESCE(SUM(CASE WHEN t.is_active = 1 THEN t.monthly_rent ELSE 0 END), 0) as total_monthly_rent
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN tenants t ON t.property_id = p.id
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all();
  res.json(props);
});

app.post('/api/properties', (req, res) => {
  const { name, address, notes, status, rental_start_date } = req.body;
  if (!name || !address) return res.status(400).json({ error: "Name and address required" });
  const result = db.prepare("INSERT INTO properties (name, address, notes, status, rental_start_date) VALUES (?, ?, ?, ?, ?)").run(
    name, address, notes || null, status || 'active', rental_start_date || null
  );
  res.json({ id: result.lastInsertRowid });
});

// Update Property (including rental_start_date, name, address, notes, status)
app.patch('/api/properties/:id', (req, res) => {
  const propId = req.params.id;
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propId);
  if (!prop) {
    return res.status(404).json({ error: "Property not found" });
  }

  const { name, address, notes, status, rental_start_date } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push("name = ?"); params.push(name.trim()); }
  if (address !== undefined) { updates.push("address = ?"); params.push(address.trim()); }
  if (notes !== undefined) { updates.push("notes = ?"); params.push(notes ? notes.trim() : null); }
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (rental_start_date !== undefined) { updates.push("rental_start_date = ?"); params.push(rental_start_date || null); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(propId);
    db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ success: true });
});

app.delete('/api/properties/:id', (req, res) => {
  const propId = req.params.id;
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(propId);
  if (!prop) {
    return res.status(404).json({ error: "Property not found" });
  }

  // Deleting property cascades units and tenants
  // Transactions referencing property_id have ON DELETE SET NULL, preserving financial records
  db.prepare("DELETE FROM properties WHERE id = ?").run(propId);
  res.json({ success: true });
});

// 3. Tenants
app.get('/api/tenants', (req, res) => {
  const tenants = db.prepare(`
    SELECT t.*, p.name as property_name, u.unit_name
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    LEFT JOIN units u ON t.unit_id = u.id
    ORDER BY t.is_active DESC, t.name ASC
  `).all();

  const enriched = tenants.map(t => ({
    ...t,
    arrears: getTenantArrears(t.id),
    deposit_held: db.prepare("SELECT COALESCE(SUM(amount_received - amount_refunded - amount_retained), 0) as total FROM security_deposits WHERE tenant_id = ?").get(t.id).total
  }));

  res.json(enriched);
});

app.get('/api/tenants/:id', (req, res) => {
  const tenant = db.prepare(`
    SELECT t.*, p.name as property_name, u.unit_name
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    LEFT JOIN units u ON t.unit_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const charges = db.prepare("SELECT * FROM rent_charges WHERE tenant_id = ? ORDER BY period_year DESC, period_month DESC").all(tenant.id);
  const transactions = db.prepare("SELECT * FROM transactions WHERE tenant_id = ? ORDER BY date DESC, id DESC LIMIT 20").all(tenant.id);

  res.json({
    ...tenant,
    arrears: getTenantArrears(tenant.id),
    deposit_held: db.prepare("SELECT COALESCE(SUM(amount_received - amount_refunded - amount_retained), 0) as total FROM security_deposits WHERE tenant_id = ?").get(tenant.id).total,
    charges,
    transactions
  });
});

app.post('/api/tenants', (req, res) => {
  const { property_id, unit_id, name, monthly_rent, rent_due_day, lease_start, security_deposit, opening_arrears, contact_name, contact_phone, contact_email, notes } = req.body;
  if (!name || !property_id || !monthly_rent) return res.status(400).json({ error: "Required fields missing" });

  const result = db.prepare(`
    INSERT INTO tenants (
      property_id, unit_id, name, monthly_rent, rent_due_day, lease_start,
      security_deposit, opening_arrears, contact_name, contact_phone, contact_email, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    property_id, unit_id || null, name, monthly_rent, rent_due_day || 1, lease_start || new Date().toISOString().split('T')[0],
    security_deposit || 0, opening_arrears || 0, contact_name || null, contact_phone || null, contact_email || null, notes || null
  );

  const tenantId = result.lastInsertRowid;
  if (security_deposit > 0) {
    db.prepare("INSERT INTO security_deposits (tenant_id, property_id, receipt_date, amount_received, status) VALUES (?, ?, ?, ?, 'held')")
      .run(tenantId, property_id, lease_start || new Date().toISOString().split('T')[0], security_deposit);
    db.prepare("INSERT INTO transactions (date, property_id, tenant_id, transaction_type, category, amount, description) VALUES (?, ?, ?, 'income', 'Security Deposit', ?, ?)")
      .run(lease_start || new Date().toISOString().split('T')[0], property_id, tenantId, security_deposit, `Security deposit received from ${name}`);
  }

  generateMonthlyCharges();
  res.json({ id: tenantId });
});

// Update Tenant (recurring monthly rent, due day, moving property, security deposit, opening arrears, lease start)
app.patch('/api/tenants/:id', (req, res) => {
  const { property_id, unit_id, monthly_rent, rent_due_day, lease_start, security_deposit, opening_arrears, is_active, notes, contact_phone, contact_email } = req.body;
  const updates = [];
  const params = [];

  if (property_id !== undefined) { updates.push("property_id = ?"); params.push(property_id); }
  if (unit_id !== undefined) { updates.push("unit_id = ?"); params.push(unit_id); }
  if (monthly_rent !== undefined) { updates.push("monthly_rent = ?"); params.push(monthly_rent); }
  if (rent_due_day !== undefined) { updates.push("rent_due_day = ?"); params.push(rent_due_day); }
  if (lease_start !== undefined) { updates.push("lease_start = ?"); params.push(lease_start); }
  if (security_deposit !== undefined) { updates.push("security_deposit = ?"); params.push(security_deposit); }
  if (opening_arrears !== undefined) { updates.push("opening_arrears = ?"); params.push(opening_arrears); }
  if (is_active !== undefined) { updates.push("is_active = ?"); params.push(is_active ? 1 : 0); }
  if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
  if (contact_phone !== undefined) { updates.push("contact_phone = ?"); params.push(contact_phone); }
  if (contact_email !== undefined) { updates.push("contact_email = ?"); params.push(contact_email); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const tenantId = req.params.id;

  // If moved to another property, update security_deposits, unpaid rent charges, and deposit transactions to point to new property
  if (property_id !== undefined) {
    db.prepare(`
      UPDATE security_deposits 
      SET property_id = ?, updated_at = datetime('now')
      WHERE tenant_id = ?
    `).run(property_id, tenantId);

    db.prepare(`
      UPDATE rent_charges 
      SET property_id = ?, updated_at = datetime('now')
      WHERE tenant_id = ? AND status != 'paid'
    `).run(property_id, tenantId);

    db.prepare(`
      UPDATE transactions 
      SET property_id = ?, updated_at = datetime('now')
      WHERE tenant_id = ? AND category = 'Security Deposit' AND transaction_type = 'income'
    `).run(property_id, tenantId);
  }

  // If security_deposit was modified, synchronize security_deposits register and transactions
  if (security_deposit !== undefined) {
    const existingDep = db.prepare("SELECT * FROM security_deposits WHERE tenant_id = ? ORDER BY id DESC LIMIT 1").get(tenantId);
    const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId);
    const currentPropId = property_id !== undefined ? property_id : tenant?.property_id;

    if (existingDep) {
      db.prepare(`
        UPDATE security_deposits 
        SET amount_received = ?, property_id = ?, updated_at = datetime('now') 
        WHERE id = ?
      `).run(security_deposit, currentPropId, existingDep.id);

      // Keep matching income transaction synchronized so available cash reflects the change
      const depTx = db.prepare(`
        SELECT id FROM transactions 
        WHERE tenant_id = ? AND category = 'Security Deposit' AND transaction_type = 'income' 
        ORDER BY id DESC LIMIT 1
      `).get(tenantId);

      if (depTx) {
        db.prepare(`
          UPDATE transactions 
          SET amount = ?, property_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(security_deposit, currentPropId, depTx.id);
      } else if (security_deposit > 0) {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO transactions (date, property_id, tenant_id, transaction_type, category, amount, description)
          VALUES (?, ?, ?, 'income', 'Security Deposit', ?, ?)
        `).run(tenant?.lease_start || today, currentPropId, tenantId, security_deposit, `Security deposit adjusted for ${tenant?.name || 'tenant'}`);
      }
    } else if (security_deposit > 0 && tenant) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO security_deposits (tenant_id, property_id, receipt_date, amount_received, status)
        VALUES (?, ?, ?, ?, 'held')
      `).run(tenantId, currentPropId, tenant.lease_start || today, security_deposit);

      db.prepare(`
        INSERT INTO transactions (date, property_id, tenant_id, transaction_type, category, amount, description)
        VALUES (?, ?, ?, 'income', 'Security Deposit', ?, ?)
      `).run(tenant.lease_start || today, currentPropId, tenantId, security_deposit, `Security deposit adjusted for ${tenant.name}`);
    }
  }

  // If lease_start or monthly_rent was updated, keep unpaid charges and dues in sync
  if (lease_start !== undefined || monthly_rent !== undefined) {
    const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId);
    if (tenant && tenant.lease_start) {
      const [sY, sM, sD] = parseDateParts(tenant.lease_start);
      const daysInMonth = getDaysInMonth(sY, sM);

      // 1. If lease_start moved forward, remove any charges that precede the new lease start if unpaid
      const startPeriodNum = sY * 12 + sM;
      db.prepare(`
        DELETE FROM rent_charges
        WHERE tenant_id = ? AND (period_year * 12 + period_month) < ? AND amount_paid = 0
      `).run(tenantId, startPeriodNum);

      // 2. Update subsequent unpaid charges with the new monthly_rent
      db.prepare(`
        UPDATE rent_charges
        SET amount_due = ?, updated_at = datetime('now')
        WHERE tenant_id = ? AND (period_year * 12 + period_month) > ? AND amount_paid = 0
      `).run(tenant.monthly_rent, tenantId, startPeriodNum);

      // 3. Update the start month charge if unpaid
      let newStartAmount = tenant.monthly_rent;
      let newDueDate = `${sY}-${String(sM).padStart(2, '0')}-${String(Math.min(tenant.rent_due_day || 1, daysInMonth)).padStart(2, '0')}`;
      let newNotes = null;

      if (sD > 1) {
        const activeDays = daysInMonth - sD + 1;
        newStartAmount = Math.round((tenant.monthly_rent * activeDays) / daysInMonth);
        newDueDate = tenant.lease_start;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        newNotes = `Prorated rent: ${sD} ${monthNames[sM - 1]} – ${daysInMonth} ${monthNames[sM - 1]} (${activeDays} days)`;
      }

      db.prepare(`
        UPDATE rent_charges
        SET amount_due = ?, due_date = ?, notes = ?, updated_at = datetime('now')
        WHERE tenant_id = ? AND period_year = ? AND period_month = ? AND amount_paid = 0
      `).run(newStartAmount, newDueDate, newNotes, tenantId, sY, sM);

      generateMonthlyCharges();
      reallocateTenantPayments(tenantId);
      updateChargeStatuses();
    }
  }

  res.json({ success: true });
});

// Delete Tenant with safe cascade (preserves historical ledger transactions)
app.delete('/api/tenants/:id', (req, res) => {
  const tenantId = Number(req.params.id);
  if (!tenantId || isNaN(tenantId)) {
    return res.status(400).json({ error: "Invalid tenant ID" });
  }

  try {
    const deleteTx = db.transaction(() => {
      // 1. Delete payment allocations for tenant's charges
      db.prepare(`
        DELETE FROM rent_payment_allocations 
        WHERE rent_charge_id IN (SELECT id FROM rent_charges WHERE tenant_id = ?)
      `).run(tenantId);

      // 2. Delete rent charges
      db.prepare("DELETE FROM rent_charges WHERE tenant_id = ?").run(tenantId);

      // 3. Delete security deposit records
      db.prepare("DELETE FROM security_deposits WHERE tenant_id = ?").run(tenantId);

      // 4. Preserve transactions as general overhead
      db.prepare("UPDATE transactions SET tenant_id = NULL WHERE tenant_id = ?").run(tenantId);

      // 5. Delete tenant
      const result = db.prepare("DELETE FROM tenants WHERE id = ?").run(tenantId);
      return result.changes;
    });

    const deleted = deleteTx();
    if (deleted === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tenant:', err);
    res.status(500).json({ error: err.message || "Failed to delete tenant" });
  }
});

// 4. Rent Charges & Dues
app.get('/api/charges', (req, res) => {
  updateChargeStatuses();
  const charges = db.prepare(`
    SELECT rc.*, t.name as tenant_name, p.name as property_name
    FROM rent_charges rc
    JOIN tenants t ON rc.tenant_id = t.id
    JOIN properties p ON rc.property_id = p.id
    ORDER BY rc.due_date DESC, rc.id DESC
  `).all();
  res.json(charges);
});

app.post('/api/charges/generate', (req, res) => {
  const count = generateMonthlyCharges();
  res.json({ count });
});

// Update specific charge due amount or due date (Feature requested by user!)
app.patch('/api/charges/:id', (req, res) => {
  const { amount_due, due_date } = req.body;
  if (amount_due === undefined && due_date === undefined) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const updates = [];
  const params = [];
  if (amount_due !== undefined) { updates.push("amount_due = ?"); params.push(amount_due); }
  if (due_date !== undefined) { updates.push("due_date = ?"); params.push(due_date); }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE rent_charges SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  updateChargeStatuses();
  res.json({ success: true });
});

// Waive / Concession (Recorded in rent charges and financial ledger)
app.patch('/api/charges/:id/waive', (req, res) => {
  const { waived_amount, waived_reason, date } = req.body;
  const waiverPaise = Number(waived_amount);
  if (!waiverPaise || isNaN(waiverPaise) || waiverPaise <= 0) {
    return res.status(400).json({ error: "Positive waiver amount required" });
  }

  const charge = db.prepare(`
    SELECT rc.*, t.name as tenant_name, p.name as property_name
    FROM rent_charges rc
    JOIN tenants t ON rc.tenant_id = t.id
    JOIN properties p ON rc.property_id = p.id
    WHERE rc.id = ?
  `).get(req.params.id);

  if (!charge) {
    return res.status(404).json({ error: "Rent charge not found" });
  }

  const remaining = Math.max(0, charge.amount_due - charge.amount_paid - charge.waived_amount);
  if (waiverPaise > remaining) {
    return res.status(400).json({ error: `Cannot waive more than remaining balance (${remaining} paise)` });
  }

  db.prepare(`
    UPDATE rent_charges
    SET waived_amount = waived_amount + ?,
        waived_reason = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(waiverPaise, waived_reason || 'Landlord concession', req.params.id);

  updateChargeStatuses();

  // Insert waiver into Financial Ledger so everything is in the ledger!
  const today = date || getTodayIST();
  const periodStr = `${charge.period_month}/${charge.period_year}`;
  const desc = waived_reason
    ? `Rent waiver: ${waived_reason} (${charge.tenant_name} - ${periodStr})`
    : `Rent concession granted for ${charge.tenant_name} (${periodStr})`;

  const txRes = db.prepare(`
    INSERT INTO transactions (
      date, property_id, tenant_id, transaction_type, category, amount, description, payment_method, reference
    ) VALUES (?, ?, ?, 'waiver', 'Rent Waiver', ?, ?, 'Waived', ?)
  `).run(
    today,
    charge.property_id,
    charge.tenant_id,
    waiverPaise,
    desc,
    `Charge #${charge.id}`
  );

  res.json({ success: true, transaction_id: txRes.lastInsertRowid });
});

// Charge delete helper for single and bulk deletion
function deleteChargesInternal(rawIds) {
  const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) return { deletedCount: 0 };

  const deleteTx = db.transaction(() => {
    const placeholders = ids.map(() => '?').join(',');

    // Identify affected tenant IDs before deleting charges
    const affectedTenantIds = db.prepare(`
      SELECT DISTINCT tenant_id FROM rent_charges WHERE id IN (${placeholders})
    `).all(...ids).map(r => r.tenant_id).filter(Boolean);

    // 1. Delete payment allocations tied to these charges
    db.prepare(`
      DELETE FROM rent_payment_allocations 
      WHERE rent_charge_id IN (${placeholders})
    `).run(...ids);

    // 1b. Delete any corresponding waiver transactions in the financial ledger
    for (const chargeId of ids) {
      db.prepare(`
        DELETE FROM transactions 
        WHERE transaction_type = 'waiver' AND reference = ?
      `).run(`Charge #${chargeId}`);
    }

    // 2. Delete the rent charges
    const result = db.prepare(`
      DELETE FROM rent_charges 
      WHERE id IN (${placeholders})
    `).run(...ids);

    // 3. Re-allocate remaining tenant payments FIFO so cash rolls forward
    for (const tId of affectedTenantIds) {
      reallocateTenantPayments(tId);
    }

    // 4. Recalculate remaining charge statuses
    updateChargeStatuses();

    return result.changes;
  });

  const deletedCount = deleteTx();
  return { deletedCount };
}

// Single charge delete
app.delete('/api/charges/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "Invalid charge ID" });
    }
    const { deletedCount } = deleteChargesInternal([id]);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error deleting charge:', err);
    res.status(500).json({ error: err.message || "Failed to delete charge" });
  }
});

// Bulk charge delete
app.post('/api/charges/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    const { deletedCount } = deleteChargesInternal(ids);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error bulk deleting charges:', err);
    res.status(500).json({ error: err.message || "Failed to bulk delete charges" });
  }
});

app.delete('/api/charges', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    const { deletedCount } = deleteChargesInternal(ids);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error bulk deleting charges:', err);
    res.status(500).json({ error: err.message || "Failed to bulk delete charges" });
  }
});

// 5. Transactions Ledger
app.get('/api/transactions', (req, res) => {
  const txs = db.prepare(`
    SELECT t.*, ten.name as tenant_name, p.name as property_name
    FROM transactions t
    LEFT JOIN tenants ten ON t.tenant_id = ten.id
    LEFT JOIN properties p ON t.property_id = p.id
    ORDER BY t.date DESC, t.id DESC
  `).all();
  res.json(txs);
});

app.post('/api/transactions', (req, res) => {
  const { date, property_id, tenant_id, transaction_type, category, amount, description, vendor, expense_type, payment_method, reference } = req.body;
  if (!date || !transaction_type || !category || !amount) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const tx = db.prepare(`
    INSERT INTO transactions (date, property_id, tenant_id, transaction_type, category, amount, description, vendor, expense_type, payment_method, reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    date,
    property_id || null,
    tenant_id || null,
    transaction_type,
    category,
    amount,
    description || `${category} ${transaction_type === 'expense' ? 'expense' : 'payment'}`,
    vendor || null,
    expense_type || (transaction_type === 'expense' && (category.includes('Construction') || category.includes('Material') || category.includes('Labor') || category.includes('Architect') || category.includes('Capex')) ? 'capex' : 'opex'),
    payment_method || null,
    reference || null
  );

  const txId = tx.lastInsertRowid;

  // If this is a rent or arrears receipt, auto-allocate to oldest unpaid charges
  if (transaction_type === 'income' && tenant_id && (category === 'Monthly Rent' || category === 'Arrears Recovery')) {
    reallocateTenantPayments(tenant_id);
  }

  res.json({ id: txId });
});

// Update Transaction (modify payment method, mode, reference, category, amount, property, date, description)
app.patch('/api/transactions/:id', (req, res) => {
  const txId = Number(req.params.id);
  const existingTx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(txId);
  if (!existingTx) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  const {
    date,
    property_id,
    tenant_id,
    category,
    amount,
    description,
    vendor,
    expense_type,
    payment_method,
    reference
  } = req.body;

  const updates = [];
  const params = [];

  if (date !== undefined) { updates.push("date = ?"); params.push(date); }
  if (property_id !== undefined) { updates.push("property_id = ?"); params.push(property_id ? Number(property_id) : null); }
  if (tenant_id !== undefined) { updates.push("tenant_id = ?"); params.push(tenant_id ? Number(tenant_id) : null); }
  if (category !== undefined) { updates.push("category = ?"); params.push(category); }
  if (amount !== undefined) { updates.push("amount = ?"); params.push(Number(amount)); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (vendor !== undefined) { updates.push("vendor = ?"); params.push(vendor || null); }
  if (expense_type !== undefined) { updates.push("expense_type = ?"); params.push(expense_type || null); }
  if (payment_method !== undefined) { updates.push("payment_method = ?"); params.push(payment_method || null); }
  if (reference !== undefined) { updates.push("reference = ?"); params.push(reference || null); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(txId);
    db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedTx = db.prepare(`
    SELECT t.*, ten.name as tenant_name, p.name as property_name
    FROM transactions t
    LEFT JOIN tenants ten ON t.tenant_id = ten.id
    LEFT JOIN properties p ON t.property_id = p.id
    WHERE t.id = ?
  `).get(txId);

  // If amount, tenant_id, or category changed on an income payment, reconcile rent allocations
  const rentCatChanged = (category !== undefined && category !== existingTx.category);
  const amountChanged = (amount !== undefined && Number(amount) !== existingTx.amount);
  const tenantChanged = (tenant_id !== undefined && (tenant_id ? Number(tenant_id) : null) !== existingTx.tenant_id);

  if (existingTx.transaction_type === 'income' && (rentCatChanged || amountChanged || tenantChanged)) {
    if (existingTx.tenant_id) reallocateTenantPayments(existingTx.tenant_id);
    if (updatedTx.tenant_id && updatedTx.tenant_id !== existingTx.tenant_id) {
      reallocateTenantPayments(updatedTx.tenant_id);
    }
  }

  // If this was a security deposit and amount/property changed, keep security_deposits in sync
  if (updatedTx.transaction_type === 'income' && updatedTx.category === 'Security Deposit' && updatedTx.tenant_id) {
    if (amountChanged || property_id !== undefined) {
      db.prepare(`
        UPDATE security_deposits 
        SET amount_received = ?, property_id = ?, updated_at = datetime('now')
        WHERE tenant_id = ?
      `).run(updatedTx.amount, updatedTx.property_id, updatedTx.tenant_id);
    }
  }

  // If this was a waiver and amount changed, keep rent_charges in sync
  if (existingTx.transaction_type === 'waiver' && amountChanged && existingTx.reference) {
    const match = existingTx.reference.match(/Charge #(\d+)/);
    if (match) {
      const chargeId = parseInt(match[1], 10);
      if (!isNaN(chargeId)) {
        const diff = Number(amount) - existingTx.amount;
        db.prepare(`
          UPDATE rent_charges 
          SET waived_amount = MAX(0, waived_amount + ?),
              waived_reason = CASE WHEN (waived_amount + ?) <= 0 THEN NULL ELSE waived_reason END,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(diff, diff, chargeId);
        updateChargeStatuses();
      }
    }
  }

  res.json({ success: true, transaction: updatedTx });
});

// Delete helper for single or bulk deletion with complete ledger & charge reconciliation
function deleteTransactionsInternal(rawIds) {
  const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) return { deletedCount: 0 };

  const deleteTx = db.transaction(() => {
    const placeholders = ids.map(() => '?').join(',');

    // Identify affected tenants before deletion
    const affectedTenantIds = db.prepare(`
      SELECT DISTINCT tenant_id FROM transactions WHERE id IN (${placeholders}) AND tenant_id IS NOT NULL
    `).all(...ids).map(r => r.tenant_id);

    // 0. Identify waiver transactions being deleted and revert their waived_amount on rent_charges
    const waiverTxs = db.prepare(`
      SELECT id, reference, amount 
      FROM transactions 
      WHERE id IN (${placeholders}) AND transaction_type = 'waiver'
    `).all(...ids);

    for (const w of waiverTxs) {
      if (w.reference) {
        const match = w.reference.match(/Charge #(\d+)/);
        if (match) {
          const chargeId = parseInt(match[1], 10);
          if (!isNaN(chargeId)) {
            db.prepare(`
              UPDATE rent_charges 
              SET waived_amount = MAX(0, waived_amount - ?),
                  waived_reason = CASE WHEN (waived_amount - ?) <= 0 THEN NULL ELSE waived_reason END,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(w.amount, w.amount, chargeId);
          }
        }
      }
    }

    // 1. Delete the payment allocations
    db.prepare(`
      DELETE FROM rent_payment_allocations 
      WHERE transaction_id IN (${placeholders})
    `).run(...ids);

    // 2. For any income transaction that was a Security Deposit, also remove corresponding security_deposits entry
    const secDepTxs = db.prepare(`
      SELECT tenant_id, amount 
      FROM transactions 
      WHERE id IN (${placeholders}) AND transaction_type = 'income' AND category = 'Security Deposit'
    `).all(...ids);

    for (const dep of secDepTxs) {
      if (dep.tenant_id) {
        const match = db.prepare(`
          SELECT id FROM security_deposits 
          WHERE tenant_id = ? AND amount_received = ?
          ORDER BY id DESC LIMIT 1
        `).get(dep.tenant_id, dep.amount);
        if (match) {
          db.prepare("DELETE FROM security_deposits WHERE id = ?").run(match.id);
        }
      }
    }

    // 3. Delete the transactions themselves
    const result = db.prepare(`
      DELETE FROM transactions 
      WHERE id IN (${placeholders})
    `).run(...ids);

    // 4. Re-allocate remaining tenant payments FIFO
    for (const tId of affectedTenantIds) {
      reallocateTenantPayments(tId);
    }

    // 5. Recalculate status of all rent charges
    updateChargeStatuses();

    return result.changes;
  });

  const deletedCount = deleteTx();
  return { deletedCount };
}

// Single transaction delete
app.delete('/api/transactions/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }
    const { deletedCount } = deleteTransactionsInternal([id]);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: err.message || "Failed to delete transaction" });
  }
});

// Bulk transaction delete (supports both POST /bulk-delete and DELETE /transactions)
app.post('/api/transactions/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    const { deletedCount } = deleteTransactionsInternal(ids);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error bulk deleting transactions:', err);
    res.status(500).json({ error: err.message || "Failed to bulk delete transactions" });
  }
});

app.delete('/api/transactions', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    const { deletedCount } = deleteTransactionsInternal(ids);
    res.json({ success: true, count: deletedCount });
  } catch (err) {
    console.error('Error bulk deleting transactions:', err);
    res.status(500).json({ error: err.message || "Failed to bulk delete transactions" });
  }
});

// Dedicated Expenses & Construction Capex API
app.get('/api/expenses', (req, res) => {
  const { property_id, expense_type } = req.query;
  let query = `
    SELECT t.*, p.name as property_name, p.status as property_status
    FROM transactions t
    LEFT JOIN properties p ON t.property_id = p.id
    WHERE t.transaction_type = 'expense'
  `;
  const params = [];
  if (property_id) {
    query += ` AND t.property_id = ?`;
    params.push(property_id);
  }
  if (expense_type) {
    query += ` AND t.expense_type = ?`;
    params.push(expense_type);
  }
  query += ` ORDER BY t.date DESC, t.id DESC`;

  const expenses = db.prepare(query).all(...params);

  // Aggregates
  const total = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE transaction_type = 'expense'").get().s;
  const capex = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE transaction_type = 'expense' AND (expense_type = 'capex' OR category LIKE '%Construction%' OR category LIKE '%Capex%' OR category LIKE '%Material%' OR category LIKE '%Labor%' OR category LIKE '%Architect%')").get().s;
  const opex = Math.max(0, total - capex);

  const byProperty = db.prepare(`
    SELECT COALESCE(p.name, 'General / Overhead') as name,
           COALESCE(p.name, 'General / Overhead') as property_name,
           p.id as property_id,
           p.status as property_status,
           p.status as status,
           COALESCE(SUM(t.amount), 0) as total,
           COALESCE(SUM(t.amount), 0) as total_spent
    FROM transactions t
    LEFT JOIN properties p ON t.property_id = p.id
    WHERE t.transaction_type = 'expense'
    GROUP BY t.property_id
    ORDER BY total DESC
  `).all();

  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions
    WHERE transaction_type = 'expense'
    GROUP BY category
    ORDER BY total DESC
  `).all();

  res.json({
    expenses,
    total_expenses: total,
    total_capex: capex,
    total_opex: opex,
    by_property: byProperty,
    by_category: byCategory
  });
});

// 6. Security Deposits
app.get('/api/deposits', (req, res) => {
  const deps = db.prepare(`
    SELECT sd.*, t.name as tenant_name, p.name as property_name,
           (sd.amount_received - sd.amount_refunded - sd.amount_retained) as balance
    FROM security_deposits sd
    JOIN tenants t ON sd.tenant_id = t.id
    JOIN properties p ON sd.property_id = p.id
    ORDER BY sd.receipt_date DESC
  `).all();
  res.json(deps);
});

// 7. Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare("SELECT key, value FROM settings").all();
  const obj = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json(obj);
});

app.patch('/api/settings', (req, res) => {
  const { opening_cash_balance, auto_generate_charges } = req.body;
  if (opening_cash_balance !== undefined) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('opening_cash_balance', ?, datetime('now'))").run(String(opening_cash_balance));
  }
  if (auto_generate_charges !== undefined) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_generate_charges', ?, datetime('now'))").run(auto_generate_charges ? '1' : '0');
  }
  res.json({ success: true });
});

// Serve static desktop client assets
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for desktop client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`⚡️ RentLedger Backend running at http://127.0.0.1:${PORT}`);
});
