#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "📦 Building Desktop Web Assets (Vite + React + Tailwind)..."
cd desktop
npm run build
cd "$REPO_ROOT"

echo "🔨 Compiling native macOS Swift binary..."
mkdir -p mac-native
swiftc -O mac-native/main.swift -o mac-native/RentLedger

echo "🚀 Assembling RentLedger.app..."
APP_DIR="RentLedger.app"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cp mac-native/RentLedger "$APP_DIR/Contents/MacOS/"
chmod +x "$APP_DIR/Contents/MacOS/RentLedger"
cp mac-native/Info.plist "$APP_DIR/Contents/"

if [ -f "mac-native/AppIcon.icns" ]; then
  cp mac-native/AppIcon.icns "$APP_DIR/Contents/Resources/"
fi

# Bundle backend & frontend runtime into Resources for true standalone operation
echo "📦 Bundling desktop runtime into RentLedger.app/Contents/Resources/desktop..."
mkdir -p "$APP_DIR/Contents/Resources/desktop"
cp desktop/server.js "$APP_DIR/Contents/Resources/desktop/"
cp desktop/package.json "$APP_DIR/Contents/Resources/desktop/"
cp -R desktop/dist "$APP_DIR/Contents/Resources/desktop/"
if [ -d "desktop/node_modules" ]; then
  cp -R desktop/node_modules "$APP_DIR/Contents/Resources/desktop/"
fi

xattr -cr "$APP_DIR"

echo "📥 Installing to ~/Applications/RentLedger.app..."
mkdir -p ~/Applications
rm -rf ~/Applications/RentLedger.app
cp -R "$APP_DIR" ~/Applications/

echo "✅ RentLedger.app is successfully built and installed in ~/Applications/RentLedger.app!"
