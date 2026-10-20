#!/usr/bin/env bash
set -e

echo "📦 Exporting Expo Web bundle..."
npx expo export -p web

echo "🔨 Compiling native Apple Silicon Swift binary..."
mkdir -p mac-native
swiftc -O mac-native/main.swift -o mac-native/RentLedger

echo "🎨 Creating AppIcon..."
if [ ! -f "mac-native/AppIcon.icns" ]; then
  mkdir -p /tmp/RentLedger.iconset
  sips -z 16 16     assets/images/icon.png --out /tmp/RentLedger.iconset/icon_16x16.png
  sips -z 32 32     assets/images/icon.png --out /tmp/RentLedger.iconset/icon_16x16@2x.png
  sips -z 32 32     assets/images/icon.png --out /tmp/RentLedger.iconset/icon_32x32.png
  sips -z 64 64     assets/images/icon.png --out /tmp/RentLedger.iconset/icon_32x32@2x.png
  sips -z 128 128   assets/images/icon.png --out /tmp/RentLedger.iconset/icon_128x128.png
  sips -z 256 256   assets/images/icon.png --out /tmp/RentLedger.iconset/icon_128x128@2x.png
  sips -z 256 256   assets/images/icon.png --out /tmp/RentLedger.iconset/icon_256x256.png
  sips -z 512 512   assets/images/icon.png --out /tmp/RentLedger.iconset/icon_256x256@2x.png
  sips -z 512 512   assets/images/icon.png --out /tmp/RentLedger.iconset/icon_512x512.png
  iconutil -c icns /tmp/RentLedger.iconset -o mac-native/AppIcon.icns
  rm -rf /tmp/RentLedger.iconset
fi

echo "🚀 Assembling RentLedger.app..."
APP_DIR="RentLedger.app"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cp mac-native/RentLedger "$APP_DIR/Contents/MacOS/"
chmod +x "$APP_DIR/Contents/MacOS/RentLedger"
cp mac-native/Info.plist "$APP_DIR/Contents/"
cp mac-native/AppIcon.icns "$APP_DIR/Contents/Resources/"
cp serve.js "$APP_DIR/Contents/Resources/"
cp -R dist "$APP_DIR/Contents/Resources/"

xattr -cr "$APP_DIR"

echo "📥 Installing to ~/Applications/RentLedger.app..."
mkdir -p ~/Applications
rm -rf ~/Applications/RentLedger.app
cp -R "$APP_DIR" ~/Applications/

echo "✅ RentLedger.app is successfully built and installed in ~/Applications/RentLedger.app!"
