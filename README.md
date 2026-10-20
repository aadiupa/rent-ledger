# RentLedger for Mac — Rental Accounting & Financial Ledger

[![GitHub Repository](https://img.shields.io/badge/GitHub-aadiupa%2Frent--ledger-blue?logo=github)](https://github.com/aadiupa/rent-ledger)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Apple%20Silicon%20%26%20Intel-black?logo=apple)](https://github.com/aadiupa/rent-ledger)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/aadiupa/rent-ledger)

A production-ready, macOS-first rental income, expense, and property construction management application for landlords and property managers in India.

Repository: [https://github.com/aadiupa/rent-ledger](https://github.com/aadiupa/rent-ledger)

---

## 🌟 Key Features

- **100% Offline & Private**: Zero cloud backend, no account/login needed. All data remains strictly inside a local SQLite database (`better-sqlite3`) on your Mac. Never transmits your financial or tenant records over the internet.
- **Native macOS App & Desktop Web**:
  - **Native macOS Application**: Apple Silicon & Intel macOS app (`RentLedger.app`) built with Swift and native WebKit.
  - **Desktop Web Experience**: High-productivity desktop web application built with Vite, React, Tailwind CSS, and Node/Express, styled with the clean financial aesthetic of Maybe.
- **Cash Ledger Accounting**: Lifetime available money calculation (`opening cash + income receipts − cash expenses`) that carries forward across months without resetting.
- **Rent Liabilities & Flexible Dues Management**:
  - Configure monthly recurring rent, custom due day (1st–31st), and opening arrears at the tenant level.
  - Edit individual month's rent due amount or payment due date.
  - Grant authorized landlord waivers / concessions with audit reasons.
  - Single & multi-select bulk deletion of rent charges with automatic arrears recalculation.
- **Tenant & Property Lifecycle Management**:
  - Onboard tenants with custom recurring rent, due days, security deposits, and opening arrears.
  - Remove tenants with safety confirmation dialog and automatic cascade handling.
  - Track active rental properties alongside properties under construction, with safe property removal.
- **Expenses & Property Construction Capex**:
  - Separate capital expenditure (Capex) from operational maintenance (Opex).
  - Track site building and construction costs when developing new properties (e.g. building a 5th property): civil labor, contractors, raw materials (cement, steel), architectural blueprints, and municipal sanctions.
  - Track routine repairs, property taxes, utilities, and society dues.
- **Single & Bulk Removal with Reconciliation**:
  - Remove transactions from the ledger, expenses, or rent dues individually or via multi-select checkboxes.
  - Automatic payment allocation reversal, arrears recalculation, and cashflow rebalancing.
- **Arrears Management**:
  $$\text{Arrears} = \text{Opening Arrears} + \text{Charges Due} - \text{Allocations} - \text{Waivers}$$
  Future rent charges never appear as arrears. Security deposits never offset rent unless explicitly adjusted.
- **Security Deposit Liability Register**: Separates refundable deposit liabilities from rental income while accurately recognizing initial cash inflows and refund outflows.
- **Indian Financial Localization**: Indian Rupee (`₹`) with Lakh/Crore number grouping, integer-safe paise arithmetic, and IST (Asia/Kolkata) date processing.
- **Full CSV Spreadsheet Export**: 1-click export of transactions, dues, and construction expenses for Excel / Numbers / Google Sheets.

---

## 🏗️ Architecture & Project Structure

```
rent-ledger/
├── desktop/                          # Desktop Application (Vite + React + Tailwind + SQLite)
│   ├── server.js                     # Local SQLite backend API & static server (port 3002)
│   ├── src/
│   │   ├── components/               # Modals, Sidebar, Action Banners
│   │   ├── views/                    # Dashboard, Properties, Tenants, Dues, Expenses, Reports, Settings
│   │   ├── utils/format.ts           # Indian currency & date formatting (₹ Lakhs & Crores)
│   │   └── api.ts                    # Typed API client
│   ├── index.html
│   └── vite.config.ts
├── mac-native/                       # Native macOS App wrapper (Swift + WKWebView)
│   ├── main.swift                    # Swift entry point launching local server & native window
│   ├── Info.plist                    # macOS App bundle configuration
│   └── AppIcon.icns                  # macOS application icon
├── scripts/
│   └── build-mac.sh                  # One-click native macOS build & install script
├── __tests__/                        # Financial calculation unit test suite
├── jest.config.cjs                   # Jest test configuration
├── LICENSE                           # MIT License
└── package.json
```

---

## 💰 Initial Seed Data & Accounting Verification

On first launch, RentLedger seeds the following synthetic test baseline:

| Tenant | Monthly Rent | Security Deposit | Opening Arrears | Notes |
|---|---:|---:|---:|---|
| **Tenant 1** | ₹17,500 | ₹1,00,000 | ₹0 | Deposit received 01 Aug 2026 • Sept rent paid |
| **Tenant 2** | ₹23,000 | ₹80,000 | ₹0 | Deposit received 01 Jul 2026 • Oct rent paid |
| **Tenant 3** | ₹45,000 | ₹1,50,000 | ₹0 | Move-in 01 Sep 2026 |
| **Tenant 4** | ₹1,30,000 | ₹3,00,000 | ₹4,90,000 | ₹2,00,000 arrears recovery paid 10 Sep 2026 |

### Verification Benchmarks
1. **Total Expected Monthly Rent Roll**: ₹17,500 + ₹23,000 + ₹45,000 + ₹1,30,000 = **₹2,15,500**
2. **Initial Recorded Inflows**: ₹1,00,000 (T1 deposit) + ₹80,000 (T2 deposit) + ₹17,500 (T1 rent) + ₹2,00,000 (T4 arrears) + ₹23,000 (T2 rent) = **₹4,20,500**
3. **Initial Operating & Capex Outflows**: ₹8,500 (repairs) + ₹12,000 (tax) + ₹1,50,000 (civil) + ₹78,000 (materials) + ₹45,000 (architectural) = **₹2,93,500**
4. **Net Available Cash**: ₹4,20,500 − ₹2,93,500 = **₹1,27,000**
5. **Tenant 4 Remaining Arrears**: Opening arrears (₹4,90,000) + 5 months charges (₹6,50,000) − paid arrears recovery (₹2,00,000) = **₹9,40,000**

---

## 🚀 How to Run on macOS

### Option 1: Native macOS Application (`RentLedger.app`)

Compile and install the native macOS application with a single command:

```bash
# 1. Build and install to ~/Applications/RentLedger.app
npm run build:mac

# 2. Launch RentLedger
npm run mac
# or open ~/Applications/RentLedger.app
```

---

### Option 2: Desktop Web App (Development Mode)

```bash
# 1. Install dependencies (if first time)
cd desktop && npm install && cd ..

# 2. Start Vite frontend + SQLite backend
npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 🧪 Running End-to-End (E2E) Tests

Run the complete 11-scenario full-stack E2E test suite running against an isolated SQLite test database and the local server:

```bash
npm test
```

### Covered E2E Scenarios:
1. **Initial Dashboard & Cashbook Integrity** (rent roll, available cash, refundable deposits)
2. **Property Management & Construction Capex Projects** (active vs under construction)
3. **Tenant Onboarding & Idempotent Charge Generation** (anti-duplication constraints)
4. **Smart Payment Allocation & Arrears Elimination** (automatic allocation to oldest dues)
5. **Rent Liability Adjustment & Landlord Waivers** (custom dues and festive concessions)
6. **Construction Capex & Operational Expenses Tracking** (cement/steel, labor, repairs)
7. **Single & Multi-Select Removal with Automatic Balance Restoration** (cash and arrears recovery)
8. **Single & Bulk Deletion of Rent Charges & Dues** (removing liabilities and balance recomputation)
9. **Tenant Deletion with Safe Cascade & Cash Integrity** (removing leases while preserving cash history)
10. **Safe Property Deletion & Cascade** (clean unit removal without foreign key crashes)
11. **Settings Persistence & Dynamic Cash Ledger** (instant SQLite state updates)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
