# RentLedger — Rental Accounting & Ledger App

[![GitHub Repository](https://img.shields.io/badge/GitHub-aadiupa%2Frent--ledger-blue?logo=github)](https://github.com/aadiupa/rent-ledger)
[![Platform](https://img.shields.io/badge/Platform-iPhone%20%7C%20iOS%20%7C%20Desktop%20Web-black?logo=apple)](https://github.com/aadiupa/rent-ledger)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/aadiupa/rent-ledger)

A production-ready, iPhone-first rental income and expense management app for individual landlords and property managers in India.

Repository: [https://github.com/aadiupa/rent-ledger](https://github.com/aadiupa/rent-ledger)

---

## 🌟 Key Features

- **100% Offline & Private**: Zero cloud backend, no account/login needed. All data remains strictly inside a local SQLite database on your device. Never transmits your financial or tenant records over the internet.
- **iPhone-First & Desktop Companion**:
  - **iPhone Mobile App**: Native iOS experience built with React Native & Expo.
  - **Desktop Web App**: High-productivity desktop application built with Vite, React, Tailwind CSS, and `better-sqlite3`, designed with the clean financial aesthetic of Maybe.
- **Cash Ledger Accounting**: Lifetime available money calculation (`opening cash + income receipts − cash expenses`) that carries forward across months without resetting.
- **Rent Liabilities & Flexible Dues Management**:
  - Configure monthly recurring rent, custom due day (1st–31st), and opening arrears at the tenant level.
  - Edit individual month's rent due amount or payment due date.
  - Grant authorized landlord waivers / concessions with audit reasons.
- **Expenses & Property Construction Capex**:
  - Separate capital expenditure (Capex) from operational maintenance (Opex).
  - Track site building and construction costs when developing new properties (e.g. building a 5th property): civil labor, contractors, raw materials (cement, steel), architectural blueprints, and municipal sanctions.
  - Track routine repairs, property taxes, utilities, and society dues.
- **Arrears Management**:
  $$\text{Arrears} = \text{Opening Arrears} + \text{Charges Due} - \text{Allocations} - \text{Waivers}$$
  Future rent charges never appear as arrears. Security deposits never offset rent unless explicitly adjusted.
- **Security Deposit Liability Register**: Separates refundable deposit liabilities from rental income while accurately recognizing initial cash inflows and refund outflows.
- **Idempotent Rent Charge Generation**: Configurable per-tenant due days with database-level uniqueness constraints preventing duplicate charges across app opens.
- **Full JSON & CSV Export / Import**:
  - 1-click export of transactions, dues, and construction expenses for Excel / Google Sheets.
  - Full JSON backup and migration with **Safe Merge** (`INSERT OR IGNORE`) and **Full Replace**.
- **Biometric Security**: Optional Face ID / Touch ID / Device Passcode app lock on iPhone.
- **Indian Financial Localization**: Indian Rupee (`₹`) with Lakh/Crore number grouping, integer-safe paise arithmetic, and IST (Asia/Kolkata) date processing.

---

## 🏗️ Architecture & Project Structure

```
rent-ledger/
├── desktop/                          # Desktop Web Application (Vite + React + Tailwind + SQLite)
│   ├── server.js                     # Local SQLite backend API (port 3002)
│   ├── src/
│   │   ├── components/               # Sidebar, Transaction Modal, Expense Modal, Edit Dues Modal
│   │   ├── views/                    # Dashboard, Properties, Tenants, Dues, Expenses, Reports, Settings
│   │   ├── utils/format.ts           # Indian currency formatting (₹ Lakhs & Crores)
│   │   └── api.ts                    # Typed API client
│   ├── index.html
│   └── vite.config.ts
├── app/                              # iPhone Expo Router file-based navigation
│   ├── _layout.tsx                   # Root Stack & Database Provider wrapper
│   ├── (tabs)/                       # Bottom Tab Navigation (Dashboard, Properties, Ledger, Reports, Settings)
│   ├── property/                     # Property details, units & add/edit
│   ├── tenant/                       # Tenant details, charge ledger, rent adjustments & payment history
│   ├── transaction/                  # Income/Expense recording with rent auto-allocations
│   ├── charges/                      # Rent charges list, status tabs, and waivers
│   ├── deposits/                     # Security deposits liability register
│   └── backup/                       # Full JSON backup, restore, and CSV sharing
├── src/
│   ├── db/
│   │   ├── schema.ts                 # SQLite DDL tables, indexes, versioning
│   │   ├── database.ts               # Connection, WAL mode, foreign keys, transactions
│   │   └── seed.ts                   # Generic synthetic test seed data
│   ├── models/types.ts               # TypeScript interfaces (Paise integers)
│   ├── services/
│   │   ├── AccountingService.ts      # Cash ledger, arrears, allocations, charge engine
│   │   ├── PropertyService.ts        # Property & Tenant CRUD
│   │   └── ExportService.ts          # CSV generation, JSON backup/restore
│   ├── hooks/useDatabase.tsx         # Database context & auto charge generator hook
│   └── utils/currency.ts             # formatCurrency (₹), paiseToRupees, Indian grouping
├── assets/                           # App icons & splash screens
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

## 🚀 How to Run Locally

### Option 1: Desktop Web App (Fastest)

```bash
# 1. Navigate to the desktop directory
cd desktop

# 2. Install dependencies (if first time)
npm install

# 3. Start both backend server and Vite frontend
node server.js & npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

### Option 2: iPhone Mobile App (React Native / Expo)

#### Prerequisites
- Node.js 18+ (tested with Node v24)
- macOS with Xcode 15+ (for iOS Simulator or physical iPhone builds)
- CocoaPods installed (`sudo gem install cocoapods` or via Homebrew)

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start Expo Metro Bundler
```bash
npx expo start
```

#### 3. Run on iOS Simulator
Press `i` in the Expo terminal window, or run directly:
```bash
npx expo run:ios
```

#### 4. Run on Physical iPhone via Expo Go
1. Install **Expo Go** from the Apple App Store.
2. Scan the terminal QR code using your iPhone Camera app.

---

## 📱 Building for Production & App Store Submission

### Option A: EAS Build (Cloud / Automated)
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in with your Apple & Expo credentials: `eas login`
3. Configure iOS project: `eas build:configure`
4. Build release IPA: `eas build --platform ios --profile production`
5. Submit to App Store Connect: `eas submit --platform ios`

### Option B: Local Xcode Archive Build
1. Prebuild native iOS project:
   ```bash
   npx expo prebuild --platform ios
   ```
2. Open the Xcode workspace:
   ```bash
   open ios/RentLedger.xcworkspace
   ```
3. In Xcode:
   - Select your Apple Developer Team under **Signing & Capabilities**.
   - Select **Any iOS Device (arm64)** as target.
   - Go to **Product → Archive**.
   - Once archived in the Organizer, click **Distribute App → App Store Connect → Upload**.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
