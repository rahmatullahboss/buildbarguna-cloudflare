# R2 App Upload Guide

## সমস্যা ও সমাধান

### ❌ সমস্যা
আপনি যখন app build করে R2 bucket এ upload করেন, তখন **package conflict** দেখায় এবং update হয় না।

**কারণ:**
1. `frontend/dist` folder এ পুরনো files থেকে যায়
2. `node_modules` এর কিছু অংশ `dist` এ চলে যেতে পারে
3. R2 এ একই নামের file থাকলে conflict হয়

### ✅ সমাধান

#### 1. Build করার আগে clean করুন
```bash
cd frontend
rm -rf dist dist-app
npm run build
```

#### 2. R2 এ upload করুন (নতুন script ব্যবহার করে)
```bash
# Debug APK upload
./scripts/upload-to-r2.sh frontend/dist-app/app-debug.apk buildbarguna-latest-debug.apk

# Release APK upload
./scripts/upload-to-r2.sh frontend/dist-app/app-release.apk buildbarguna-latest-release.apk
```

#### 3. অথবা সম্পূর্ণ deploy করুন
```bash
# Clean build + deploy
./scripts/deploy.sh production
```

## Scripts

### `upload-to-r2.sh`
- R2 এ upload করার আগে পুরনো file delete করে
- Conflict ছাড়া নতুন file upload করে
- Automatic file size verification

**Usage:**
```bash
./scripts/upload-to-r2.sh <apk-path> [output-name]
```

**Examples:**
```bash
# Debug build
npm run build:app
./scripts/upload-to-r2.sh frontend/dist-app/app-debug.apk buildbarguna-latest-debug.apk

# Release build
npm run build:app -- --mode production
./scripts/upload-to-r2.sh frontend/dist-app/app-release.apk buildbarguna-latest-release.apk
```

### `deploy.sh`
- Frontend clean build করে
- Database migration চালায়
- Worker deploy করে
- R2 এ assets upload করে

**Usage:**
```bash
# Production deploy
./scripts/deploy.sh production

# Staging deploy
./scripts/deploy.sh staging

# Dry run (no changes)
./scripts/deploy.sh production true
```

## Manual R2 Upload (Wrangler CLI)

```bash
# Delete old file
npx wrangler r2 object delete buildbarguna/builds/android/buildbarguna-latest-debug.apk

# Upload new file
npx wrangler r2 object put buildbarguna/builds/android/buildbarguna-latest-debug.apk --file=frontend/dist-app/app-debug.apk
```

## Download URL

After upload, app can be downloaded from:
- **Worker URL:** `https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/download/app`
- **Direct R2:** `https://buildbarguna.r2.cloudflarestorage.com/builds/android/buildbarguna-latest-debug.apk`

## Troubleshooting

### "File already exists" error
```bash
# Delete old file first
npx wrangler r2 object delete buildbarguna/builds/android/<filename>
# Then upload
npx wrangler r2 object put buildbarguna/builds/android/<filename> --file=<path>
```

### "File not found" error
```bash
# Check if dist folder exists
ls -la frontend/dist-app/

# Rebuild if needed
cd frontend && npm run build:app
```

### Large file upload timeout
```bash
# Increase timeout (if using custom script)
export WRANGLER_TIMEOUT=300000
```

## Best Practices

1. ✅ Always clean `dist` folder before build
2. ✅ Delete old R2 object before uploading new one
3. ✅ Use versioned filenames for releases (e.g., `app-v1.2.3.apk`)
4. ✅ Keep `buildbarguna-latest.apk` as symlink to current version
5. ✅ Test download URL after upload
