# 📱 Build Barguna — Android App Setup (Capacitor)

## Overview

This project uses [Capacitor](https://capacitorjs.com/) to wrap the React frontend into a native Android app. The same React code powers both the web (Cloudflare Workers) and the Android APK.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Android Studio](https://developer.android.com/studio) (latest)
- Java 17+ (comes with Android Studio)
- Android SDK (installed via Android Studio)

---

## 🚀 Quick Start

### 1. Install dependencies (already done)
```bash
cd frontend
npm install
```

### 2. Build the app bundle
```bash
npm run build:app
```
This builds to `frontend/dist-app/` (separate from Cloudflare `../dist/`).

### 3. Sync with Android
```bash
npm run cap:sync
```
This builds + copies web assets into the Android project.

### 4. Open in Android Studio
```bash
npm run cap:open
```
Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build for Cloudflare deployment |
| `npm run build:app` | Build for Capacitor (outputs to `dist-app/`) |
| `npm run cap:sync` | Build + sync web assets to Android |
| `npm run cap:open` | Open Android Studio |
| `npm run cap:run` | Build + sync + run on connected device |
| `npm run cap:copy` | Copy web assets only (no plugin update) |

---

## 🔧 App Configuration

Edit `frontend/capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
  appId: 'com.buildbarguna.app',       // Package name for Play Store
  appName: 'বিল্ড বরগুনা',              // App display name
  webDir: 'dist-app',                   // Build output dir
  ...
}
```

---

## 🌐 API Configuration

The app talks to the **same Cloudflare Worker API** as the web version.

The API base URL is set in `frontend/src/lib/api.ts`. For production APK, make sure it points to your live Cloudflare Worker URL.

For **development with live reload** (optional), uncomment in `capacitor.config.ts`:
```ts
server: {
  url: 'https://your-worker.workers.dev',
}
```

---

## 🔔 Adding Push Notifications (Future)

```bash
npm install @capacitor/push-notifications
npx cap sync android
```

Then configure Firebase in Android Studio.

---

## 🔒 Adding Biometric Login (Future)

```bash
npm install @capacitor-community/biometric-auth
npx cap sync android
```

---

## 📦 Building Release APK

1. Generate a keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias buildbarguna -keyalg RSA -keysize 2048 -validity 10000
```

2. In Android Studio: **Build → Generate Signed Bundle/APK → APK → Release**

3. Upload to Google Play Store!

---

## 🔄 Workflow (after each code change)

```bash
# Make changes to React code
# Then:
npm run cap:sync   # build + sync to Android
npm run cap:open   # open Android Studio to test
```

---

## 📁 Project Structure

```
frontend/
├── src/                    # React source code (shared web + app)
├── dist-app/               # Capacitor build output (gitignored)
├── android/                # Native Android project
│   └── app/src/main/
│       └── assets/public/  # Web assets copied here by cap sync
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.ts          # BUILD_TARGET=app → dist-app
└── package.json            # cap:sync, cap:open, cap:run scripts
```
