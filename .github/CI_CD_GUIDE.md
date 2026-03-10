# CI/CD Setup Guide

## Overview

BuildBarguna uses GitHub Actions for CI/CD with automated testing, building, and deployment to Cloudflare Workers.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` or `develop`
- Manual trigger

**Jobs:**
1. **Lint & Type Check** - ESLint + TypeScript
2. **Unit Tests** - Vitest test suite
3. **Build Test** - Frontend build verification
4. **Security Scan** - npm audit
5. **Database Migrations** - Migration file validation

### 2. Deploy Pipeline (`deploy.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger

**Jobs:**
1. **Deploy Web** - Test → Build → Deploy to Cloudflare Workers
2. **Build Android** - Build APK → Upload to R2

## Required Secrets

### GitHub Secrets (Settings → Secrets → Actions)

```bash
# Cloudflare
CLOUDFLARE_API_TOKEN        # Cloudflare API token
CLOUDFLARE_ACCOUNT_ID       # Cloudflare account ID

# R2 (for Android APK storage)
R2_BUCKET_NAME              # R2 bucket name
R2_ACCOUNT_ID               # R2 account ID
R2_ACCESS_KEY_ID            # R2 access key
R2_SECRET_ACCESS_KEY        # R2 secret key
R2_PUBLIC_URL               # R2 public URL

# Android Signing
ANDROID_KEYSTORE_BASE64     # Base64 encoded keystore
ANDROID_KEYSTORE_PASSWORD   # Keystore password
ANDROID_KEY_ALIAS           # Key alias
ANDROID_KEY_PASSWORD        # Key password

# Worker Secrets (set via wrangler)
# These are set directly in Cloudflare, not GitHub:
# - JWT_SECRET
# - RESEND_API_KEY
# - GOOGLE_CLIENT_ID
# - EMAIL_FROM
```

## Setup Instructions

### 1. Create Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create Custom Token
3. Permissions:
   - `Worker Scripts` → `Edit`
   - `Worker Routes` → `Edit`
   - `Account Settings` → `Read`
4. Copy token and add to GitHub Secrets as `CLOUDFLARE_API_TOKEN`

### 2. Get Cloudflare Account ID

1. Go to Cloudflare Dashboard
2. Right sidebar → Account ID
3. Copy and add to GitHub Secrets as `CLOUDFLARE_ACCOUNT_ID`

### 3. Setup R2 for Android APKs

```bash
# Create R2 bucket (if not exists)
wrangler r2 bucket create buildbarguna-apks

# Get R2 credentials from Cloudflare Dashboard
# Add to GitHub Secrets:
# - R2_BUCKET_NAME
# - R2_ACCOUNT_ID
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY
# - R2_PUBLIC_URL
```

### 4. Generate Android Signing Key

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore release-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias buildbarguna

# Convert to base64 (for GitHub Secrets)
base64 release-keystore.jks > keystore-base64.txt

# Add to GitHub Secrets:
# - ANDROID_KEYSTORE_BASE64 (content of keystore-base64.txt)
# - ANDROID_KEYSTORE_PASSWORD
# - ANDROID_KEY_ALIAS
# - ANDROID_KEY_PASSWORD
```

## Manual Deployment

### Deploy to Production

```bash
# From main branch
git checkout main
git pull
npm run deploy
```

### Deploy Specific Version

```bash
# Checkout specific tag
git checkout v1.2.3
npm run deploy
```

## Monitoring

### View Deployment Logs

```bash
# Real-time logs
wrangler tail buildbarguna-worker

# View recent deployments
wrangler deployments list
```

### Check GitHub Actions

1. Go to https://github.com/your-org/buildbarguna/actions
2. Click on workflow run
3. View logs for each job

## Troubleshooting

### Deployment Fails

**Error: Cloudflare API token invalid**
```bash
# Regenerate token
# Go to https://dash.cloudflare.com/profile/api-tokens
# Create new token with correct permissions
# Update GitHub Secret
```

**Error: Build fails**
```bash
# Test build locally
cd buildbarguna-cloudflare
npm run build

# Check frontend
cd frontend
npm run build
```

### Android Build Fails

**Error: Keystore not found**
```bash
# Ensure ANDROID_KEYSTORE_BASE64 secret is set
# Check base64 decoding:
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > test.jks
ls -lh test.jks
```

**Error: Signing failed**
```bash
# Verify keystore passwords
# Check key alias matches
keytool -list -v -keystore release-keystore.jks
```

## Rollback

### Rollback to Previous Deployment

```bash
# List versions
wrangler versions list

# Rollback to specific version
wrangler versions rollback <VERSION_ID>
```

### Emergency Rollback

1. Go to Cloudflare Dashboard
2. Workers → buildbarguna-worker
3. Deployments → Click previous version
4. Click "Rollback"

## Best Practices

1. **Always test locally before pushing**
   ```bash
   npm run test:unit
   npm run build
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/new-feature
   # Push to trigger CI
   ```

3. **Review CI logs before merging**
   - All checks must pass
   - Security scan should have no high vulnerabilities

4. **Tag releases**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

5. **Monitor after deployment**
   ```bash
   wrangler tail buildbarguna-worker
   # Watch for errors in first 30 minutes
   ```

## Quick Reference

```bash
# Local testing
npm run test:unit          # Run tests
npm run build             # Build project
npm run dev               # Development server

# Deployment
npm run deploy            # Deploy to production

# Monitoring
wrangler tail             # View logs
wrangler deployments list # List deployments

# Database
wrangler d1 execute       # Run migrations
```

## Support

- GitHub Actions Docs: https://docs.github.com/actions
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Internal Docs: See `docs/` folder
