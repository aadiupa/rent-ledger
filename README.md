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
- **Expenses & Property Construction Capex**:
  - Separate capital expenditure (Capex) from operational maintenance (Opex).
  - Track site building and construction costs when developing new properties (e.g. building a 5th property): civil labor, contractors, raw materials (cement, steel), architectural blueprints, and municipal sanctions.
  - Track routine repairs, property taxes, utilities, and society dues.
- **Single & Bulk Removal with Reconciliation**:
  - Remove transactions from the ledger or expense records individually or via multi-select checkboxes.
  - Automatic payment allocation reversal, arrears recalculation, and cashflow rebalancing.
- **Property & Portfolio Lifecycle Management**:
  - Track active rental properties and units alongside properties under construction.
  - Safe property deletion with confirmation modal.
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
| **Tenant 1** | ₹17,500 | ₹1,00,000 | ₹0 | Deposit received 15 Oct 2026 |
| **Tenant 2** | ₹23,000 | ₹80,000 | ₹0 | Deposit received 18 Oct 2026 |
| **Tenant 3** | ₹45,000 | ₹0 | ₹0 | ₹44,000 partial rent paid Oct 2026 |
| **Tenant 4** | ₹1,30,000 | ₹0 | ₹4,90,000 | ₹2,00,000 arrears paid Oct 2026 |

### Verification Benchmarks
1. **Total Expected Monthly Rent**: ₹17,500 + ₹23,000 + ₹45,000 + ₹1,30,000 = **₹2,15,500**
2. **Initial Recorded Receipts**: ₹1,00,000 (deposit) + ₹80,000 (deposit) + ₹44,000 (rent) + ₹2,00,000 (arrears) = **₹4,24,000**
3. **Available Money**: ₹0 (opening cash) + ₹4,24,000 = **₹4,24,000**
4. **Tenant 4 Remaining Arrears**: ₹4,90,000 − ₹2,00,000 = **₹2,90,000**

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

## 🧪 Running Unit Tests

Run the complete 17-scenario financial calculation test suite:

```bash
npm test
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
