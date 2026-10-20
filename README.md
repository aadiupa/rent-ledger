# RentLedger — iPhone Rental Accounting & Ledger App

[![GitHub Repository](https://img.shields.io/badge/GitHub-aadiupa%2Frentledger-blue?logo=github)](https://github.com/aadiupa/rentledger)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20iPhone-black?logo=apple)](https://github.com/aadiupa/rentledger)
[![License](https://img.shields.io/badge/License-MIT-green)](https://github.com/aadiupa/rentledger)

A production-ready, iPhone-first rental income and expense management app for individual landlords and property managers in India.

Built with **React Native**, **Expo (SDK 51)**, **TypeScript**, and local **SQLite**.
Repository: [https://github.com/aadiupa/rentledger](https://github.com/aadiupa/rentledger)

---

## 🌟 Key Features

- **100% Offline & Private**: Zero cloud backend, no account/login needed. All data remains inside a local SQLite database on device. Never transmits financial records over the internet.
- **Cash Ledger Accounting**: Lifetime available money calculation (`opening cash + income receipts − cash expenses`) that carries forward across months without resetting.
- **Arrears Management**:
  $$\text{Arrears} = \text{Opening Arrears} + \text{Charges Due} - \text{Allocations} - \text{Waivers}$$
  Future rent charges never appear as arrears. Security deposits never offset rent unless explicitly adjusted.
- **Security Deposit Liability Register**: Separates refundable deposit liabilities from rental income while accurately recognizing initial cash inflows and refund outflows.
- **Idempotent Rent Charge Generation**: Configurable per-tenant due days with database-level uniqueness constraints preventing duplicate charges across app opens.
- **Full JSON & CSV Export / Import**:
  - Export CSVs for Excel / Google Sheets (transactions register & arrears summary).
  - Full JSON backup and migration with **Safe Merge** (`INSERT OR IGNORE`) and **Full Replace**.
- **Biometric Security**: Optional Face ID / Touch ID / Device Passcode app lock using `expo-local-authentication`.
- **Indian Financial Localization**: Indian Rupee (`₹`) with Lakh/Crore number grouping, IST (Asia/Kolkata) date processing.

---

## 🏗️ Architecture & Project Structure

```
RentLedger/
├── app/                              # Expo Router file-based navigation
│   ├── _layout.tsx                   # Root Stack & Database Provider wrapper
│   ├── (tabs)/                       # Bottom Tab Navigation
│   │   ├── _layout.tsx               # Tab bar configuration (5 tabs)
│   │   ├── index.tsx                 # 1. Dashboard (Hero cash, month filter, stats, dues)
│   │   ├── properties.tsx            # 2. Properties List
│   │   ├── transactions.tsx          # 3. Transaction Ledger & Search
│   │   ├── reports.tsx               # 4. Reports (Monthly P&L, tenant collection, arrears)
│   │   └── settings.tsx              # 5. Settings, biometrics, opening cash balance
│   ├── property/
│   │   ├── [id].tsx                  # Property details & unit roster
│   │   └── add.tsx                   # Add / Edit property
│   ├── tenant/
│   │   ├── [id].tsx                  # Tenant details, charge ledger & payment history
│   │   └── add.tsx                   # Add / Edit tenant & opening balances
│   ├── transaction/
│   │   ├── [id].tsx                  # Transaction audit & delete
│   │   └── add.tsx                   # Add Income/Expense with rent allocations
│   ├── charges/
│   │   └── index.tsx                 # Rent charges list, status tabs, and waivers
│   ├── deposits/
│   │   └── index.tsx                 # Security deposits liability register
│   ├── categories/
│   │   └── index.tsx                 # System and custom category manager
│   └── backup/
│       └── index.tsx                 # Full JSON backup, restore, and CSV sharing
├── src/
│   ├── db/
│   │   ├── schema.ts                 # SQLite DDL tables, indexes, versioning
│   │   ├── database.ts               # Connection, WAL mode, foreign keys, transactions
│   │   └── seed.ts                   # Seed data (Generic synthetic test tenants)
│   ├── models/
│   │   └── types.ts                  # TypeScript interfaces (Paise integers)
│   ├── services/
│   │   ├── AccountingService.ts      # Cash ledger, arrears, allocations, charge engine
│   │   ├── PropertyService.ts        # Property & Tenant CRUD
│   │   └── ExportService.ts          # CSV generation, JSON backup/restore
│   ├── hooks/
│   │   └── useDatabase.tsx           # Database context & auto charge generator hook
│   ├── utils/
│   │   └── currency.ts               # formatCurrency (₹), paiseToRupees, IST dates
│   └── constants/
│       └── theme.ts                  # iOS design tokens (Colors, Typography, Spacing)
├── assets/
│   └── images/                       # App icon (1024x1024), splash screen, adaptive icon
├── app.json                          # Expo configuration & iOS bundle metadata
└── package.json                      # Project dependencies & scripts
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

## 🚀 How to Run the App Locally

### Prerequisites
- Node.js 18+ (tested with Node v24)
- macOS with Xcode 15+ (for iOS Simulator or physical iPhone builds)
- CocoaPods installed (`sudo gem install cocoapods` or via Homebrew)

### 1. Install Dependencies
```bash
cd RentLedger
npm install
```

### 2. Start Expo Metro Bundler
```bash
npx expo start
```

### 3. Run on iOS Simulator
Press `i` in the Expo terminal window, or run directly:
```bash
npx expo run:ios
```

### 4. Run on Physical iPhone via Expo Go
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
