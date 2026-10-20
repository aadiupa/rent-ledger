// ============================================================
// RentLedger — Accounting Service
// Core financial calculation engine.
// All amounts in paise (integer arithmetic only).
// ============================================================

import * as SQLite from 'expo-sqlite';
import { queryAll, queryFirst, executeSQL, withTransaction } from '../db/database';
import type {
  Tenant,
  Transaction,
  RentCharge,
  SecurityDeposit,
  TenantLedgerSummary,
  DashboardStats,
  MonthlyReport,
} from '../models/types';

// ================================================================
// 1. CASH LEDGER
// Available cash = opening balance + income receipts - expenses
// Security deposits count as cash in; refunds count as cash out.
// Unpaid rent does NOT count as cash.
// ================================================================

export async function getAvailableCash(db: SQLite.SQLiteDatabase): Promise<number> {
  // Opening cash balance from settings
  const setting = await queryFirst<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key = 'opening_cash_balance'"
  );
  const openingCash = parseInt(setting?.value ?? '0', 10);

  // Sum all income transactions
  const incomeRow = await queryFirst<{ total: number }>(
    db,
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'"
  );
  const totalIncome = incomeRow?.total ?? 0;

  // Sum all expense transactions
  const expenseRow = await queryFirst<{ total: number }>(
    db,
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'"
  );
  const totalExpenses = expenseRow?.total ?? 0;

  return openingCash + totalIncome - totalExpenses;
}

export async function getAvailableCashForDateRange(
  db: SQLite.SQLiteDatabase,
  toDate: string
): Promise<number> {
  const setting = await queryFirst<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key = 'opening_cash_balance'"
  );
  const openingCash = parseInt(setting?.value ?? '0', 10);

  const incomeRow = await queryFirst<{ total: number }>(
    db,
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date <= ?",
    [toDate]
  );
  const expenseRow = await queryFirst<{ total: number }>(
    db,
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date <= ?",
    [toDate]
  );

  return openingCash + (incomeRow?.total ?? 0) - (expenseRow?.total ?? 0);
}

// ================================================================
// 2. MONTHLY STATS
// ================================================================

export async function getMonthlyStats(
  db: SQLite.SQLiteDatabase,
  year: number,
  month: number
): Promise<{
  rent_collected: number;
  arrears_collected: number;
  security_deposits: number;
  other_income: number;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
}> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = getMonthEnd(year, month);

  const rows = await queryAll<{ category: string; type: string; total: number }>(
    db,
    `SELECT category, type, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY category, type`,
    [startDate, endDate]
  );

  let rent_collected = 0;
  let arrears_collected = 0;
  let security_deposits = 0;
  let other_income = 0;
  let total_income = 0;
  let total_expenses = 0;

  for (const row of rows) {
    if (row.type === 'income') {
      total_income += row.total;
      if (row.category === 'Monthly Rent') rent_collected += row.total;
      else if (row.category === 'Arrears Recovery') arrears_collected += row.total;
      else if (row.category === 'Security Deposit') security_deposits += row.total;
      else other_income += row.total;
    } else {
      total_expenses += row.total;
    }
  }

  return {
    rent_collected,
    arrears_collected,
    security_deposits,
    other_income,
    total_income,
    total_expenses,
    net_cash_flow: total_income - total_expenses,
  };
}

// ================================================================
// 3. RENT ARREARS per tenant
//
// Formula:
//   Arrears = opening_arrears
//           + SUM(rent_charges.amount_due for charges with due_date <= today)
//           - SUM(rent_charges.amount_paid)
//           - SUM(rent_charges.waived_amount)
//
// We do NOT count future charges. We do NOT count security deposits.
// We do NOT count generic cash receipts unless allocated to a charge.
// ================================================================

export async function getTenantArrears(
  db: SQLite.SQLiteDatabase,
  tenantId: number,
  asOfDate?: string
): Promise<number> {
  const today = asOfDate ?? getTodayISO();

  const tenant = await queryFirst<Tenant>(
    db,
    'SELECT * FROM tenants WHERE id = ?',
    [tenantId]
  );
  if (!tenant) return 0;

  const openingArrears = tenant.opening_arrears;

  // Sum of rent due (charges with due_date <= today, not waived)
  const dueRow = await queryFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount_due), 0) as total
     FROM rent_charges
     WHERE tenant_id = ? AND due_date <= ? AND status != 'waived'`,
    [tenantId, today]
  );
  const totalDue = dueRow?.total ?? 0;

  // Sum of amounts paid (from allocations)
  const paidRow = await queryFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount_paid), 0) as total
     FROM rent_charges
     WHERE tenant_id = ? AND due_date <= ?`,
    [tenantId, today]
  );
  const totalPaid = paidRow?.total ?? 0;

  // Sum of waived amounts
  const waivedRow = await queryFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(waived_amount), 0) as total
     FROM rent_charges
     WHERE tenant_id = ? AND due_date <= ?`,
    [tenantId, today]
  );
  const totalWaived = waivedRow?.total ?? 0;

  const arrears = openingArrears + totalDue - totalPaid - totalWaived;
  // Arrears cannot go below 0 unless advance credit is explicitly modelled
  return Math.max(0, arrears);
}

export async function getAllTenantsArrears(
  db: SQLite.SQLiteDatabase
): Promise<{ tenantId: number; tenantName: string; arrears: number }[]> {
  const tenants = await queryAll<Tenant>(
    db,
    "SELECT * FROM tenants WHERE is_active = 1"
  );

  const results = await Promise.all(
    tenants.map(async (t) => ({
      tenantId: t.id,
      tenantName: t.name,
      arrears: await getTenantArrears(db, t.id),
    }))
  );

  return results;
}

export async function getTotalOutstandingArrears(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const all = await getAllTenantsArrears(db);
  return all.reduce((sum, r) => sum + r.arrears, 0);
}

// ================================================================
// 4. SECURITY DEPOSITS
// ================================================================

export async function getTotalRefundableDeposits(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const row = await queryFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount_received - amount_refunded - amount_retained), 0) as total
     FROM security_deposits`
  );
  return Math.max(0, row?.total ?? 0);
}

export async function getTenantDepositBalance(
  db: SQLite.SQLiteDatabase,
  tenantId: number
): Promise<number> {
  const row = await queryFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount_received - amount_refunded - amount_retained), 0) as total
     FROM security_deposits WHERE tenant_id = ?`,
    [tenantId]
  );
  return Math.max(0, row?.total ?? 0);
}

// ================================================================
// 5. MONTHLY RENT CHARGES — Generation
// Generates one charge per active tenant per month.
// Uses UNIQUE(tenant_id, period_year, period_month) to prevent dups.
// ================================================================

export async function generateMonthlyCharges(
  db: SQLite.SQLiteDatabase,
  upToDate?: string
): Promise<number> {
  const today = upToDate ?? getTodayISO();
  const tenants = await queryAll<Tenant>(
    db,
    "SELECT * FROM tenants WHERE is_active = 1"
  );

  let generated = 0;

  await withTransaction(db, async () => {
    for (const tenant of tenants) {
      const leaseStart = new Date(tenant.lease_start);
      const leaseStartYear = leaseStart.getFullYear();
      const leaseStartMonth = leaseStart.getMonth() + 1; // 1-indexed

      const todayDate = new Date(today);
      const todayYear = todayDate.getFullYear();
      const todayMonth = todayDate.getMonth() + 1;

      // Iterate from lease start to today (inclusive)
      let y = leaseStartYear;
      let m = leaseStartMonth;

      while (y < todayYear || (y === todayYear && m <= todayMonth)) {
        const dueDay = Math.min(tenant.rent_due_day, getDaysInMonth(y, m));
        const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        // Only generate if due date has passed or is today
        if (dueDate <= today) {
          try {
            await executeSQL(
              db,
              `INSERT OR IGNORE INTO rent_charges
               (tenant_id, property_id, period_year, period_month, due_date, amount_due, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                tenant.id,
                tenant.property_id,
                y,
                m,
                dueDate,
                tenant.monthly_rent,
                dueDate < today ? 'overdue' : 'due',
              ]
            );
            generated++;
          } catch {
            // UNIQUE constraint: already exists, skip
          }
        }

        // Advance month
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
  });

  // Update statuses for existing charges
  await updateRentChargeStatuses(db, today);

  return generated;
}

export async function updateRentChargeStatuses(
  db: SQLite.SQLiteDatabase,
  asOfDate?: string
): Promise<void> {
  const today = asOfDate ?? getTodayISO();

  // Overdue: due_date < today, not fully paid, not waived
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET status = 'overdue', updated_at = datetime('now')
     WHERE due_date < ? AND amount_paid < amount_due AND status NOT IN ('paid','waived')`,
    [today]
  );

  // Due: due_date = today, not paid
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET status = 'due', updated_at = datetime('now')
     WHERE due_date = ? AND amount_paid < amount_due AND status NOT IN ('paid','waived','overdue')`,
    [today]
  );

  // Partially paid
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET status = 'partially_paid', updated_at = datetime('now')
     WHERE amount_paid > 0 AND amount_paid < amount_due AND status != 'waived'`
  );

  // Paid: amount_paid >= amount_due (accounting for waived)
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET status = 'paid', updated_at = datetime('now')
     WHERE (amount_paid + waived_amount) >= amount_due AND status != 'waived'`
  );
}

export async function updateRentChargeAmount(
  db: SQLite.SQLiteDatabase,
  chargeId: number,
  newAmountDue: number,
  newDueDate?: string
): Promise<void> {
  if (newDueDate) {
    await executeSQL(
      db,
      `UPDATE rent_charges
       SET amount_due = ?, due_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newAmountDue, newDueDate, chargeId]
    );
  } else {
    await executeSQL(
      db,
      `UPDATE rent_charges
       SET amount_due = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newAmountDue, chargeId]
    );
  }
  await updateRentChargeStatuses(db);
}

// ================================================================
// 6. PAYMENT ALLOCATION
// Apply a cash receipt to one or more rent charges.
// Default: oldest unpaid charge first.
// ================================================================

export async function allocatePaymentToRentCharges(
  db: SQLite.SQLiteDatabase,
  transactionId: number,
  tenantId: number,
  totalAmount: number,
  explicitAllocations?: { chargeId: number; amount: number }[]
): Promise<void> {
  await withTransaction(db, async () => {
    if (explicitAllocations && explicitAllocations.length > 0) {
      // User-specified allocation
      for (const alloc of explicitAllocations) {
        await applyAllocation(db, transactionId, alloc.chargeId, alloc.amount);
      }
    } else {
      // Auto-allocate to oldest unpaid charges first
      const unpaidCharges = await queryAll<RentCharge>(
        db,
        `SELECT * FROM rent_charges
         WHERE tenant_id = ? AND status NOT IN ('paid','waived') AND amount_due > amount_paid
         ORDER BY due_date ASC`,
        [tenantId]
      );

      let remaining = totalAmount;
      for (const charge of unpaidCharges) {
        if (remaining <= 0) break;
        const outstanding = charge.amount_due - charge.amount_paid;
        const toAllocate = Math.min(remaining, outstanding);
        await applyAllocation(db, transactionId, charge.id, toAllocate);
        remaining -= toAllocate;
      }
    }
  });

  await updateRentChargeStatuses(db);
}

async function applyAllocation(
  db: SQLite.SQLiteDatabase,
  transactionId: number,
  chargeId: number,
  amount: number
): Promise<void> {
  // Insert or update allocation (prevent double-counting)
  await executeSQL(
    db,
    `INSERT INTO rent_payment_allocations (transaction_id, rent_charge_id, amount_allocated)
     VALUES (?, ?, ?)
     ON CONFLICT(transaction_id, rent_charge_id)
     DO UPDATE SET amount_allocated = amount_allocated + excluded.amount_allocated`,
    [transactionId, chargeId, amount]
  );

  // Recompute amount_paid for charge from allocations (source of truth)
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET amount_paid = (
       SELECT COALESCE(SUM(amount_allocated), 0)
       FROM rent_payment_allocations
       WHERE rent_charge_id = ?
     ),
     updated_at = datetime('now')
     WHERE id = ?`,
    [chargeId, chargeId]
  );
}

// ================================================================
// 7. DASHBOARD STATS
// ================================================================

export async function getDashboardStats(
  db: SQLite.SQLiteDatabase,
  year: number,
  month: number
): Promise<DashboardStats> {
  const [
    availableCash,
    monthlyStats,
    totalArrears,
    totalDeposits,
    allTenants,
    expectedRent,
  ] = await Promise.all([
    getAvailableCash(db),
    getMonthlyStats(db, year, month),
    getTotalOutstandingArrears(db),
    getTotalRefundableDeposits(db),
    queryAll<Tenant>(db, "SELECT * FROM tenants WHERE is_active = 1"),
    queryFirst<{ total: number }>(
      db,
      "SELECT COALESCE(SUM(monthly_rent), 0) as total FROM tenants WHERE is_active = 1"
    ),
  ]);

  // Find overdue tenants
  const overdueSummaries: TenantLedgerSummary[] = [];
  for (const tenant of allTenants) {
    const arrears = await getTenantArrears(db, tenant.id);
    const overdueCharges = await queryAll<RentCharge>(
      db,
      "SELECT * FROM rent_charges WHERE tenant_id = ? AND status IN ('overdue','partially_paid')",
      [tenant.id]
    );
    if (arrears > 0 || overdueCharges.length > 0) {
      overdueSummaries.push({
        tenant,
        opening_arrears: tenant.opening_arrears,
        total_rent_charged: 0,
        total_paid: 0,
        total_waived: 0,
        current_arrears: arrears,
        overdue_charges: overdueCharges,
      });
    }
  }

  return {
    available_cash: availableCash,
    monthly_rent_expected: expectedRent?.total ?? 0,
    rent_collected_month: monthlyStats.rent_collected,
    arrears_collected_month: monthlyStats.arrears_collected,
    security_deposits_received_month: monthlyStats.security_deposits,
    expenses_month: monthlyStats.total_expenses,
    net_cash_flow_month: monthlyStats.net_cash_flow,
    total_outstanding_arrears: totalArrears,
    total_refundable_deposits: totalDeposits,
    overdue_tenants: overdueSummaries,
  };
}

// ================================================================
// 8. MONTHLY REPORT
// ================================================================

export async function getMonthlyReport(
  db: SQLite.SQLiteDatabase,
  year: number,
  month: number
): Promise<MonthlyReport> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = getMonthEnd(year, month);

  const transactions = await queryAll<Transaction>(
    db,
    'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [startDate, endDate]
  );

  const stats = await getMonthlyStats(db, year, month);

  // Expenses by category
  const expenseRows = await queryAll<{ category: string; total: number }>(
    db,
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category`,
    [startDate, endDate]
  );

  const expenses_by_category: Record<string, number> = {};
  for (const row of expenseRows) {
    expenses_by_category[row.category] = row.total;
  }

  return {
    year,
    month,
    income_total: stats.total_income,
    expense_total: stats.total_expenses,
    rent_collected: stats.rent_collected,
    arrears_collected: stats.arrears_collected,
    security_deposits: stats.security_deposits,
    other_income: stats.other_income,
    expenses_by_category,
    net_cash_flow: stats.net_cash_flow,
    transactions,
  };
}

// ================================================================
// 9. TRANSACTION CRUD with balance recalculation
// ================================================================

export async function addTransaction(
  db: SQLite.SQLiteDatabase,
  tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
  allocations?: { chargeId: number; amount: number }[]
): Promise<number> {
  let newId = 0;

  await withTransaction(db, async () => {
    const result = await executeSQL(
      db,
      `INSERT INTO transactions
       (date, property_id, tenant_id, type, category, amount, description,
        payment_method, reference, notes, is_opening_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.date,
        tx.property_id ?? null,
        tx.tenant_id ?? null,
        tx.type,
        tx.category,
        tx.amount,
        tx.description,
        tx.payment_method ?? null,
        tx.reference ?? null,
        tx.notes ?? null,
        tx.is_opening_balance ? 1 : 0,
      ]
    );
    newId = result.lastInsertRowId;

    // If this is a rent or arrears payment, auto-allocate
    if (
      tx.type === 'income' &&
      tx.tenant_id &&
      (tx.category === 'Monthly Rent' || tx.category === 'Arrears Recovery')
    ) {
      await allocatePaymentToRentCharges(db, newId, tx.tenant_id, tx.amount, allocations);
    }
  });

  return newId;
}

export async function updateTransaction(
  db: SQLite.SQLiteDatabase,
  id: number,
  updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  await withTransaction(db, async () => {
    // Remove existing allocations before updating
    await executeSQL(
      db,
      'DELETE FROM rent_payment_allocations WHERE transaction_id = ?',
      [id]
    );

    // Recompute charge paid amounts that referenced this transaction
    await recomputeAffectedCharges(db);

    const fields = Object.entries(updates)
      .map(([k]) => `${k} = ?`)
      .join(', ');
    const values = Object.values(updates).map((v) =>
      typeof v === 'boolean' ? (v ? 1 : 0) : v ?? null
    );

    await executeSQL(
      db,
      `UPDATE transactions SET ${fields}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id] as (string | number | null)[]
    );

    const tx = await queryFirst<Transaction>(db, 'SELECT * FROM transactions WHERE id = ?', [id]);
    if (
      tx &&
      tx.type === 'income' &&
      tx.tenant_id &&
      (tx.category === 'Monthly Rent' || tx.category === 'Arrears Recovery')
    ) {
      await allocatePaymentToRentCharges(db, id, tx.tenant_id, tx.amount);
    }
  });
}

export async function deleteTransaction(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  await withTransaction(db, async () => {
    // Remove allocations first (CASCADE should handle, but explicit is safer)
    await executeSQL(db, 'DELETE FROM rent_payment_allocations WHERE transaction_id = ?', [id]);
    await executeSQL(db, 'DELETE FROM transactions WHERE id = ?', [id]);
    await recomputeAffectedCharges(db);
  });
}

async function recomputeAffectedCharges(db: SQLite.SQLiteDatabase): Promise<void> {
  // Recompute all charges' amount_paid from allocations (source of truth)
  await executeSQL(
    db,
    `UPDATE rent_charges
     SET amount_paid = (
       SELECT COALESCE(SUM(amount_allocated), 0)
       FROM rent_payment_allocations
       WHERE rent_charge_id = rent_charges.id
     ),
     updated_at = datetime('now')`
  );
  await updateRentChargeStatuses(db);
}

// ================================================================
// 10. HELPER UTILITIES
// ================================================================

export function getTodayISO(): string {
  // Always use Asia/Kolkata timezone
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthEnd(year: number, month: number): string {
  const lastDay = getDaysInMonth(year, month);
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // month is 1-indexed here
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return { year: ist.getFullYear(), month: ist.getMonth() + 1 };
}
