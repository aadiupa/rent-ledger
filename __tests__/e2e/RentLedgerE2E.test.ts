import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const TEST_PORT = 3099;
const TEST_BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;
const TEST_DB_PATH = path.join('/tmp', `rentledger_e2e_${Date.now()}.db`);

let serverProcess: ChildProcess | null = null;

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${TEST_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${typeof json === 'object' ? JSON.stringify(json) : json}`);
  }

  return json;
}

beforeAll(async () => {
  // Clean up any stale test database
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${TEST_DB_PATH}${ext}`;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  // Spawn test instance of desktop server
  const serverPath = path.join(__dirname, '../../desktop/server.js');
  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DB_PATH: TEST_DB_PATH,
    },
    stdio: 'ignore',
  });

  // Wait for server to start responding
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${TEST_BASE_URL}/dashboard`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!ready) {
    throw new Error('Test server failed to start within timeout');
  }
});

afterAll(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${TEST_DB_PATH}${ext}`;
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore
      }
    }
  }
});

describe('RentLedger Desktop — End-to-End (E2E) Test Suite', () => {
  let createdPropertyId: number;
  let constructionPropertyId: number;
  let testTenantId: number;
  let rentPaymentTxId: number;
  let capexTx1Id: number;
  let capexTx2Id: number;

  test('E2E Scenario 1: Initial Dashboard & Cashbook Integrity', async () => {
    const dashboard = await request('/dashboard');
    expect(dashboard).toBeDefined();

    // Baseline assertions on synthetic seed entities
    expect(dashboard.expected_rent).toBe(21550000); // ₹2,15,500 total monthly rent roll
    expect(dashboard.total_refundable_deposits).toBe(18000000); // ₹1,80,000 deposits held
    expect(dashboard.rent_collected).toBe(2300000); // ₹23,000 rent collected in current month (October)
    expect(dashboard.available_cash).toBe(12700000); // ₹1,27,000 net available cash (inflows ₹4,20,500 - outflows ₹2,93,500)

    // Check previous month breakdown
    const septDashboard = await request('/dashboard?year=2026&month=9');
    expect(septDashboard.rent_collected).toBe(1750000); // Tenant 1 rent
    expect(septDashboard.arrears_collected).toBe(20000000); // Tenant 4 arrears recovery

    const properties = await request('/properties');
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThanOrEqual(2);

    const tenants = await request('/tenants');
    expect(Array.isArray(tenants)).toBe(true);
    expect(tenants.length).toBe(4);

    const tenant4 = tenants.find((t: any) => t.name === 'Tenant 4');
    expect(tenant4).toBeDefined();
    expect(tenant4.arrears).toBe(114000000); // Opening arrears ₹4,90,000 + monthly charges ₹6,50,000
  });

  test('E2E Scenario 2: Property Management & Construction Capex Project Setup', async () => {
    // 1. Create an active residential property
    const propRes = await request('/properties', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Horizon Heights',
        address: '12 MG Road, Bengaluru',
        notes: '6 Units Residential Complex',
        status: 'active',
      }),
    });
    expect(propRes.id).toBeDefined();
    createdPropertyId = propRes.id;

    // 2. Create a property under development/construction (e.g. 5th Property)
    const constrRes = await request('/properties', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Emerald Commercial Plaza (Phase 2)',
        address: 'Plot 45, Tech Zone IV',
        notes: 'Under Construction commercial shop complex',
        status: 'under_construction',
      }),
    });
    expect(constrRes.id).toBeDefined();
    constructionPropertyId = constrRes.id;

    const allProps = await request('/properties');
    const horizon = allProps.find((p: any) => p.id === createdPropertyId);
    const emerald = allProps.find((p: any) => p.id === constructionPropertyId);

    expect(horizon).toBeDefined();
    expect(horizon.status).toBe('active');
    expect(emerald).toBeDefined();
    expect(emerald.status).toBe('under_construction');
  });

  test('E2E Scenario 3: Tenant Onboarding & Idempotent Charge Generation', async () => {
    // Onboard a new tenant with monthly rent, security deposit, and opening arrears
    const tenantRes = await request('/tenants', {
      method: 'POST',
      body: JSON.stringify({
        property_id: createdPropertyId,
        name: 'Aditya Commercial Tenant',
        monthly_rent: 3000000, // ₹30,000
        rent_due_day: 5,
        lease_start: '2026-08-01',
        security_deposit: 6000000, // ₹60,000
        opening_arrears: 1500000, // ₹15,000
        contact_name: 'Aditya Upadhyay',
        contact_phone: '+91 98888 77777',
        contact_email: 'aditya@example.com',
      }),
    });
    expect(tenantRes.id).toBeDefined();
    testTenantId = tenantRes.id;

    // Verify tenant details
    const tenant = await request(`/tenants/${testTenantId}`);
    expect(tenant.name).toBe('Aditya Commercial Tenant');
    expect(tenant.monthly_rent).toBe(3000000);
    expect(tenant.deposit_held).toBe(6000000);

    // Verify idempotent charge generation engine
    const genRes1 = await request('/charges/generate', { method: 'POST' });
    expect(genRes1).toHaveProperty('count');

    // Run charge generator a second time — must produce 0 duplicate charges
    const genRes2 = await request('/charges/generate', { method: 'POST' });
    expect(genRes2.count).toBe(0);
  });

  test('E2E Scenario 4: Smart Payment Allocation & Arrears Elimination', async () => {
    const tenantBefore = await request(`/tenants/${testTenantId}`);
    const initialArrears = tenantBefore.arrears;
    expect(initialArrears).toBeGreaterThan(0);

    // Record an income rent payment of ₹35,000
    const paymentAmount = 3500000;
    const txRes = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-10-21',
        property_id: createdPropertyId,
        tenant_id: testTenantId,
        transaction_type: 'income',
        category: 'Monthly Rent',
        amount: paymentAmount,
        description: 'Rent payment via NEFT',
        payment_method: 'Bank Transfer',
        reference: 'NEFT-889922',
      }),
    });
    expect(txRes.id).toBeDefined();
    rentPaymentTxId = txRes.id;

    // Verify tenant arrears decreased by exactly the payment amount
    const tenantAfter = await request(`/tenants/${testTenantId}`);
    expect(tenantAfter.arrears).toBe(initialArrears - paymentAmount);

    // Verify charge statuses updated automatically
    const charges = await request('/charges');
    const tenantCharges = charges.filter((c: any) => c.tenant_id === testTenantId);
    expect(tenantCharges.some((c: any) => c.amount_paid > 0)).toBe(true);
  });

  test('E2E Scenario 5: Rent Liability Adjustment & Landlord Concessions/Waivers', async () => {
    const charges = await request('/charges');
    const unpaidCharge = charges.find(
      (c: any) => c.tenant_id === testTenantId && c.status !== 'paid' && c.status !== 'waived'
    );
    expect(unpaidCharge).toBeDefined();

    // 1. Adjust charge due amount and due date
    const patchRes = await request(`/charges/${unpaidCharge.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        amount_due: 2800000, // Adjusted from ₹30,000 to ₹28,000
        due_date: '2026-10-10',
      }),
    });
    expect(patchRes.success).toBe(true);

    // 2. Grant authorized landlord concession/waiver
    const waiverAmount = 500000; // ₹5,000
    const waiveRes = await request(`/charges/${unpaidCharge.id}/waive`, {
      method: 'PATCH',
      body: JSON.stringify({
        waived_amount: waiverAmount,
        waived_reason: 'Diwali landlord festive waiver',
      }),
    });
    expect(waiveRes.success).toBe(true);

    const updatedCharges = await request('/charges');
    const updated = updatedCharges.find((c: any) => c.id === unpaidCharge.id);
    expect(updated.amount_due).toBe(2800000);
    expect(updated.waived_amount).toBe(waiverAmount);
    expect(updated.waived_reason).toBe('Diwali landlord festive waiver');
  });

  test('E2E Scenario 6: Security Deposit Modification & Inter-Property Tenant Relocation', async () => {
    // 1. Change security deposit from ₹60,000 (6000000) to ₹85,000 (8500000)
    const patchDepositRes = await request(`/tenants/${testTenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        security_deposit: 8500000,
      }),
    });
    expect(patchDepositRes.success).toBe(true);

    // Verify tenant deposit_held is updated
    const tenantAfterDeposit = await request(`/tenants/${testTenantId}`);
    expect(tenantAfterDeposit.deposit_held).toBe(8500000);

    // Verify security deposit register entry updated
    const deposits = await request('/deposits');
    const tenantDeposit = deposits.find((d: any) => d.tenant_id === testTenantId);
    expect(tenantDeposit).toBeDefined();
    expect(tenantDeposit.amount_received).toBe(8500000);

    // Verify transaction ledger updated to maintain cash balance integrity
    const txs = await request('/transactions');
    const depTx = txs.find((t: any) => t.tenant_id === testTenantId && t.category === 'Security Deposit');
    expect(depTx).toBeDefined();
    expect(depTx.amount).toBe(8500000);

    // 2. Move tenant to another property (inter-property relocation)
    const moveRes = await request(`/tenants/${testTenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        property_id: constructionPropertyId,
      }),
    });
    expect(moveRes.success).toBe(true);

    // Verify tenant assigned property changed
    const tenantAfterMove = await request(`/tenants/${testTenantId}`);
    expect(tenantAfterMove.property_id).toBe(constructionPropertyId);

    // Verify deposit record moved to new property
    const depositsAfterMove = await request('/deposits');
    const tenantDepositAfterMove = depositsAfterMove.find((d: any) => d.tenant_id === testTenantId);
    expect(tenantDepositAfterMove.property_id).toBe(constructionPropertyId);

    // Verify unpaid rent charges moved to new property
    const chargesAfterMove = await request('/charges');
    const unpaidTenantCharges = chargesAfterMove.filter(
      (c: any) => c.tenant_id === testTenantId && c.status !== 'paid'
    );
    expect(unpaidTenantCharges.length).toBeGreaterThan(0);
    for (const c of unpaidTenantCharges) {
      expect(c.property_id).toBe(constructionPropertyId);
    }

    // Move back to createdPropertyId to maintain test state consistency
    await request(`/tenants/${testTenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        property_id: createdPropertyId,
      }),
    });
    const tenantFinal = await request(`/tenants/${testTenantId}`);
    expect(tenantFinal.property_id).toBe(createdPropertyId);
  });

  test('E2E Scenario 7: Construction Capex & Operational Expenses Tracking', async () => {
    // 1. Record Construction Capex 1: Raw Materials
    const txCapex1 = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-10-21',
        property_id: constructionPropertyId,
        transaction_type: 'expense',
        category: 'Construction - Raw Materials (Cement & Steel)',
        amount: 15000000, // ₹1,50,000
        description: '300 bags cement and 2 tonnes steel rods',
        vendor: 'Ultratech & Jindal Steel',
        expense_type: 'capex',
        payment_method: 'RTGS',
      }),
    });
    capexTx1Id = txCapex1.id;

    // 2. Record Construction Capex 2: Civil Labor
    const txCapex2 = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-10-21',
        property_id: constructionPropertyId,
        transaction_type: 'expense',
        category: 'Construction - Civil Labor & Contractor',
        amount: 6000000, // ₹60,000
        description: 'Slab shuttering labor contractor payout',
        vendor: 'Patel Civil Contractors',
        expense_type: 'capex',
        payment_method: 'Cheque',
      }),
    });
    capexTx2Id = txCapex2.id;

    // 3. Record Routine Opex Maintenance
    const txOpex = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-10-21',
        property_id: createdPropertyId,
        transaction_type: 'expense',
        category: 'Repairs & Maintenance',
        amount: 450000, // ₹4,500
        description: 'Overhead water tank float valve replacement',
        vendor: 'Sharma Plumbing Works',
        expense_type: 'opex',
        payment_method: 'UPI',
      }),
    });
    expect(txOpex.id).toBeDefined();

    // Verify Expenses endpoint aggregates
    const expData = await request('/expenses');
    expect(expData.total_capex).toBeGreaterThanOrEqual(21000000); // ₹2,10,000
    expect(expData.total_opex).toBeGreaterThanOrEqual(450000);

    // Verify property under construction breakdown
    const constrSpend = expData.by_property.find((p: any) => p.property_id === constructionPropertyId);
    expect(constrSpend).toBeDefined();
    expect(constrSpend.status).toBe('under_construction');
    expect(constrSpend.total_spent).toBe(21000000);
  });

  test('E2E Scenario 8: Single & Multi-Select Removal with Automatic Balance Restoration', async () => {
    const dashBefore = await request('/dashboard');
    const cashBefore = dashBefore.available_cash;

    // 1. Bulk delete the two Capex transactions (₹1,50,000 + ₹60,000 = ₹2,10,000)
    const bulkDel = await request('/transactions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({
        ids: [capexTx1Id, capexTx2Id],
      }),
    });
    expect(bulkDel.success).toBe(true);
    expect(bulkDel.count).toBe(2);

    // Verify available cash was restored by exactly ₹2,10,000
    const dashAfterCapexDel = await request('/dashboard');
    expect(dashAfterCapexDel.available_cash).toBe(cashBefore + 21000000);

    // 2. Single delete of the rent payment transaction (₹35,000)
    const tenantBeforeTxDel = await request(`/tenants/${testTenantId}`);
    const arrearsBeforeTxDel = tenantBeforeTxDel.arrears;

    const singleDel = await request(`/transactions/${rentPaymentTxId}`, {
      method: 'DELETE',
    });
    expect(singleDel.success).toBe(true);
    expect(singleDel.count).toBe(1);

    // Deleting the payment must cleanly reverse payment allocations and restore tenant arrears
    const tenantAfterTxDel = await request(`/tenants/${testTenantId}`);
    expect(tenantAfterTxDel.arrears).toBe(arrearsBeforeTxDel + 3500000);
  });

  test('E2E Scenario 9: Single & Bulk Deletion of Rent Charges & Dues', async () => {
    // 1. Fetch current charges for tenant
    const charges = await request('/charges');
    const tenantCharges = charges.filter((c: any) => c.tenant_id === testTenantId);
    expect(tenantCharges.length).toBeGreaterThanOrEqual(2);

    const charge1 = tenantCharges[0];
    const remainingCharges = tenantCharges.slice(1);

    // 2. Single delete of charge1
    const delSingle = await request(`/charges/${charge1.id}`, {
      method: 'DELETE',
    });
    expect(delSingle.success).toBe(true);
    expect(delSingle.count).toBe(1);

    // Verify charge1 is gone
    const afterSingle = await request('/charges');
    expect(afterSingle.find((c: any) => c.id === charge1.id)).toBeUndefined();

    // 3. Multi-select bulk delete of remaining charges
    const bulkIds = remainingCharges.map((c: any) => c.id);
    const delBulk = await request('/charges/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: bulkIds }),
    });
    expect(delBulk.success).toBe(true);
    expect(delBulk.count).toBe(bulkIds.length);

    // Verify all deleted charges are removed
    const afterBulk = await request('/charges');
    for (const id of bulkIds) {
      expect(afterBulk.find((c: any) => c.id === id)).toBeUndefined();
    }
  });

  test('E2E Scenario 10: Tenant Deletion with Safe Cascade & Cash Integrity', async () => {
    // Verify tenant exists before deletion
    const tenantBefore = await request(`/tenants/${testTenantId}`);
    expect(tenantBefore).toBeDefined();

    // Delete the tenant
    const delRes = await request(`/tenants/${testTenantId}`, {
      method: 'DELETE',
    });
    expect(delRes.success).toBe(true);

    // Verify tenant is deleted
    const allTenants = await request('/tenants');
    expect(allTenants.find((t: any) => t.id === testTenantId)).toBeUndefined();

    // Verify 404 on direct fetch
    await expect(request(`/tenants/${testTenantId}`)).rejects.toThrow();

    // Verify all associated rent charges are removed
    const charges = await request('/charges');
    expect(charges.find((c: any) => c.tenant_id === testTenantId)).toBeUndefined();

    // Verify historical transactions remain in ledger without throwing foreign key errors
    const txs = await request('/transactions');
    expect(Array.isArray(txs)).toBe(true);
  });

  test('E2E Scenario 11: Safe Property Deletion & Cascade', async () => {
    // Delete the active property
    const delRes = await request(`/properties/${createdPropertyId}`, {
      method: 'DELETE',
    });
    expect(delRes.success).toBe(true);

    const properties = await request('/properties');
    const found = properties.find((p: any) => p.id === createdPropertyId);
    expect(found).toBeUndefined();

    // Verify historical transactions are preserved as general overhead without foreign key crashes
    const txs = await request('/transactions');
    expect(Array.isArray(txs)).toBe(true);
  });

  test('E2E Scenario 12: Settings Persistence & Dynamic Cash Ledger', async () => {
    // Update opening cash balance and auto-generate setting
    const patchSettings = await request('/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        opening_cash_balance: 5000000, // ₹50,000
        auto_generate_charges: false,
      }),
    });
    expect(patchSettings.success).toBe(true);

    const settings = await request('/settings');
    expect(settings.opening_cash_balance).toBe('5000000');
    expect(settings.auto_generate_charges).toBe('0');
  });
});
