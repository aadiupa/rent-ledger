# RentLedger — iOS Build, Signing & App Store Submission Guide

This guide walks you through compiling, signing, and submitting RentLedger to Apple App Store Connect.

---

## 📋 Prerequisites

1. **Apple Developer Account** (Enrollment at [developer.apple.com](https://developer.apple.com)).
2. **Mac running macOS Sonoma (14.0+) or macOS Sequoia (15.0+)**.
3. **Xcode 15+** installed from the Mac App Store.
4. **Command Line Tools:**
   ```bash
   xcode-select --install
   ```
5. **CocoaPods:**
   ```bash
   sudo gem install cocoapods
   ```

---

## 🛠️ Method 1: Local Native Build via Xcode (Recommended)

### Step 1: Prebuild iOS Native Workspace
From the `RentLedger` root directory, generate the native iOS project:
```bash
cd /Users/adityaupadhyay/.gemini/antigravity/scratch/RentLedger
npx expo prebuild --platform ios
```
This generates the `./ios` directory containing the Xcode workspace `RentLedger.xcworkspace` configured with:
- Bundle ID: `com.rentledger.app`
- Face ID permissions (`NSFaceIDUsageDescription`)
- SQLite native bindings

### Step 2: Open in Xcode
```bash
open ios/RentLedger.xcworkspace
```

### Step 3: Configure Signing & Team
1. In Xcode's left sidebar, select the top-level **RentLedger** project.
2. Select the **RentLedger** target under Targets.
3. Switch to the **Signing & Capabilities** tab.
4. Check **Automatically manage signing**.
5. Under **Team**, select your Apple Developer Team.
6. Xcode will automatically provision your Provisioning Profile and Signing Certificate.

### Step 4: Archive the Build
1. In the Xcode scheme/device selector (top bar), set the build target to:
   **Any iOS Device (arm64)**
2. In the top menu bar, select:
   **Product → Archive**
3. Xcode will compile all native modules, assets, and JavaScript bundles.

### Step 5: Validate & Distribute to App Store Connect
1. When archiving completes, the **Organizer** window appears automatically (or open via `Window → Organizer`).
2. Select your new archive and click **Distribute App** in the right inspector.
3. Choose **App Store Connect** → **Upload**.
4. Check **Upload your app's symbols** (for crash reports) and **Manage Version and Build Number**.
5. Click **Upload**. Xcode will securely transmit the signed binary directly to App Store Connect.

---

## ☁️ Method 2: Automated Cloud Build via EAS (Expo Application Services)

If you prefer building without local Xcode:

### Step 1: Install & Login to EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Configure EAS
```bash
eas build:configure
```

### Step 3: Run Cloud Production Build
```bash
eas build --platform ios --profile production
```
EAS will handle signing certificates automatically via your Apple Developer credentials and generate a signed `.ipa` file.

### Step 4: Submit to App Store Connect
```bash
eas submit --platform ios
```

---

## 🚀 App Store Connect Setup

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and log in.
2. Navigate to **My Apps** → click the **+** button → **New App**.
3. Fill in:
   - **Platforms:** iOS
   - **Name:** RentLedger — Rental Khata
   - **Primary Language:** English
   - **Bundle ID:** Select `com.rentledger.app`
   - **SKU:** `RENTLEDGER_IOS_001`
   - **User Access:** Full Access
4. In the app listing page:
   - Paste Description, Keywords, and Support URLs from `APP_STORE_LISTING.md`.
   - Upload 6.5" and 5.5" iPhone screenshots.
   - Under **App Privacy**, mark that the app does not collect any user data.
5. In the **Build** section:
   - Select the build uploaded from Xcode or EAS.
6. Click **Add for Review** → **Submit to App Review**.
