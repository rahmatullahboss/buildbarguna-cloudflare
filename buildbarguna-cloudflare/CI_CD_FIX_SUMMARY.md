# CI/CD Build Conflict Fix

## Problem
When building and uploading to R2, there were **package conflicts** preventing updates.

### Root Causes:
1. **`dist` folder not cleaned** before builds
2. **Wrong output path** in `vite.config.ts` (was `dist`, should be `../dist`)
3. **R2 old files not deleted** before uploading new ones
4. **CI workflows** missing clean step

---

## Changes Made

### 1. **`frontend/vite.config.ts`** ✅
**Before:**
```ts
outDir: isApp ? 'dist-app' : 'dist',
```

**After:**
```ts
outDir: isApp ? 'dist-app' : '../dist',
```

**Why:** Build output should go to `buildbarguna-cloudflare/dist/` for Worker deployment, not `frontend/dist/`.

---

### 2. **`.github/workflows/deploy.yml`** (root level) ✅
**Added clean step before Android build:**
```yaml
- name: Clean dist folders
  run: rm -rf dist dist-app
  working-directory: buildbarguna-cloudflare/frontend
```

**Why:** Ensures clean build without stale files.

---

### 3. **`buildbarguna-cloudflare/.github/workflows/deploy.yml`** ✅
**Updated build step:**
```yaml
- name: Build frontend
  run: |
    cd buildbarguna-cloudflare/frontend
    # Clean dist folders to avoid conflicts
    rm -rf dist dist-app
    npm run build
```

**Why:** Clean before build + correct working directory.

---

### 4. **`scripts/deploy.sh`** ✅
**Added clean step:**
```bash
# Clean dist folder before build to avoid conflicts
rm -rf dist dist-app
npm run build
```

**Why:** Local deployments also need clean builds.

---

### 5. **`scripts/upload-to-r2.sh`** (NEW) ✅
**Deletes old file before upload:**
```bash
# Delete old file first to avoid conflicts
npx wrangler r2 object delete "$BUCKET_NAME/builds/android/$APK_NAME"

# Upload new file
npx wrangler r2 object put "$BUCKET_NAME/builds/android/$APK_NAME" --file="$APK_PATH"
```

**Why:** Prevents R2 object conflicts.

---

### 6. **`frontend/.gitignore`** (NEW) ✅
```
dist/
dist-app/
*.apk
node_modules/
```

**Why:** Prevents accidental commits of build artifacts.

---

## How It Works Now

### CI/CD Flow (GitHub Actions):

```
Push to main
  ↓
Checkout code
  ↓
Setup Node.js
  ↓
Install dependencies
  ↓
Run tests
  ↓
Clean dist folders ← NEW
  ↓
Build frontend → ../dist
  ↓
Deploy Worker (includes dist/)
  ↓
Store migrations in KV
  ↓
Verify deployment
```

### Android APK Build:

```
Push to main
  ↓
Build web first
  ↓
Clean dist folders ← NEW
  ↓
Build app (dist-app/)
  ↓
Capacitor sync
  ↓
Gradle build
  ↓
Upload APK to R2 (deletes old first) ← IMPROVED
```

---

## Testing

### Local Build Test:
```bash
cd buildbarguna-cloudflare/frontend
npm run build

# Check output location
ls -la ../dist/  # Should have index.html, assets/, etc.
```

### CI Test:
```bash
# Push to a test branch
git push origin your-branch

# Watch GitHub Actions
# https://github.com/your-org/your-repo/actions
```

### R2 Upload Test:
```bash
# Test new upload script
./scripts/upload-to-r2.sh frontend/dist-app/app-debug.apk test-latest.apk

# Verify in R2
npx wrangler r2 object get buildbarguna/builds/android/test-latest.apk
```

---

## Verification Checklist

- [ ] `npm run build` outputs to `buildbarguna-cloudflare/dist/`
- [ ] `npm run build:app` outputs to `frontend/dist-app/`
- [ ] CI builds without conflicts
- [ ] R2 upload succeeds without errors
- [ ] APK download link works
- [ ] Web app loads correctly after deployment

---

## Files Changed Summary

| File | Change | Purpose |
|------|--------|---------|
| `frontend/vite.config.ts` | Changed `outDir` | Correct build output location |
| `.github/workflows/deploy.yml` | Added clean step | Prevent build conflicts |
| `buildbarguna-cloudflare/.github/workflows/deploy.yml` | Updated build step | Clean before build |
| `scripts/deploy.sh` | Added clean step | Local deployment fix |
| `scripts/upload-to-r2.sh` | NEW script | Conflict-free R2 upload |
| `frontend/.gitignore` | NEW file | Ignore build artifacts |
| `R2_UPLOAD_GUIDE.md` | NEW guide | Documentation |

---

## Next Steps

1. **Test the changes:**
   ```bash
   cd buildbarguna-cloudflare/frontend
   rm -rf dist dist-app
   npm run build
   ls ../dist/
   ```

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "fix: clean dist before build to prevent conflicts"
   git push
   ```

3. **Monitor CI:**
   - Check GitHub Actions tab
   - Verify build succeeds
   - Test APK download link

4. **Update documentation:**
   - Share `R2_UPLOAD_GUIDE.md` with team
   - Update README if needed

---

## Troubleshooting

### Build still has conflicts?
```bash
# Manual clean
cd buildbarguna-cloudflare/frontend
rm -rf dist dist-app node_modules/.vite
npm run build
```

### R2 upload fails?
```bash
# Check R2 credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Manual delete + upload
npx wrangler r2 object delete buildbarguna/builds/android/file.apk
npx wrangler r2 object put buildbarguna/builds/android/file.apk --file=path/to/file.apk
```

### CI still failing?
- Check GitHub Actions logs
- Verify `wrangler.toml` assets directory matches build output
- Ensure all secrets are set in GitHub repository settings
