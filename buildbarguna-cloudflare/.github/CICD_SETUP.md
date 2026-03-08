# GitHub CI/CD Setup for BuildBarguna

## Overview

This directory contains GitHub Actions workflows for automatic deployment and database migrations.

## Workflows

### 1. **deploy.yml** - Automatic Deployment

**Triggers:**
- Push to `main` branch
- Push to `production` branch
- Manual trigger via GitHub Actions UI

**What it does:**
1. Checks out code
2. Installs dependencies
3. Runs tests
4. Builds frontend
5. Deploys Worker to Cloudflare
6. Sets migration flag (triggers auto-migration on first request)
7. Verifies deployment
8. Posts deployment summary

### 2. **migrate.yml** - Manual Migration Runner

**Triggers:**
- Manual trigger only (workflow_dispatch)

**Inputs:**
- `environment`: production or staging
- `migration_file`: Optional specific migration file

**What it does:**
1. Sets migration flag in KV
2. Makes test request to trigger migrations
3. Shows applied migrations in summary

---

## Setup Instructions

### 1. Add Cloudflare Secrets to GitHub

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```bash
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCOUNT_ID=your_r2_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_here
R2_BUCKET_NAME=your_bucket_name_here
R2_PUBLIC_URL=https://your-public-r2-domain
ANDROID_KEYSTORE_BASE64=base64_of_your_release_keystore
ANDROID_KEYSTORE_PASSWORD=your_keystore_password
ANDROID_KEY_ALIAS=your_key_alias
ANDROID_KEY_PASSWORD=your_key_password
```

`ANDROID_KEYSTORE_BASE64` should be the Base64-encoded contents of the same release keystore you want every APK update to use. If this key changes, Android will treat the APK as a different signer and users will need to uninstall before reinstalling.

### 2. Create Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create Custom Token
3. Permissions:
   - **Worker Scripts** → Edit
   - **D1** → Edit
   - **KV Storage** → Edit
   - **Account Settings** → Read
4. Copy the token and add to GitHub secrets

### 3. Find Account ID

1. Go to Cloudflare Dashboard
2. Look at the right sidebar on home page
3. Copy Account ID
4. Add to GitHub secrets

---

## Usage

### Automatic Deployment (Push to main)

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

GitHub Actions will:
- ✅ Run tests
- ✅ Build frontend
- ✅ Deploy to production
- ✅ Trigger migrations

### Manual Deployment

1. Go to https://github.com/YOUR_USERNAME/YOUR_REPO/actions
2. Select "Deploy to Cloudflare Workers"
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

### Manual Migration

1. Go to https://github.com/YOUR_USERNAME/YOUR_REPO/actions
2. Select "Run Database Migrations"
3. Click "Run workflow"
4. Select environment (production/staging)
5. Optionally specify migration file
6. Click "Run workflow"

---

## Deployment Flow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │
│  - Checkout     │
│  - Install      │
│  - Test         │
│  - Build        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy Worker  │
│  (Cloudflare)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set KV Flag     │
│ needs_migration │
│ = true          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ First Request   │
│ arrives         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Worker checks   │
│ KV flag         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run pending     │
│ migrations      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process request │
│ normally        │
└─────────────────┘
```

---

## Monitoring

### Check Deployment Status

1. **GitHub Actions:**
   - https://github.com/YOUR_USERNAME/YOUR_REPO/actions

2. **Cloudflare Logs:**
   - https://dash.cloudflare.com/?to=/:account/workers/services/view/buildbarguna-worker/production/logs

3. **Migration Status:**
   ```bash
   # Check KV flag
   npx wrangler kv:key get needs_migration --binding=SESSIONS
   
   # Check applied migrations
   npx wrangler d1 execute buildbarguna-invest-db --remote \
     --command "SELECT * FROM _migrations ORDER BY id"
   ```

### Deployment Summary

After each deployment, GitHub shows a summary with:
- ✅ Deployment status
- ✅ Commit hash
- ✅ Branch name
- ✅ Links to logs
- ✅ Migration commands

---

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Look for error message
3. Fix issue and push again

### Migration Failed

1. Go to Actions → "Run Database Migrations"
2. Run workflow again
3. Check Cloudflare Logs for errors

### Worker Returns 503

1. Check if migrations completed
2. Run manual migration if needed
3. Check KV flag status

---

## Environment Variables

The workflows use these environment variables (set in secrets):

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | API token with Worker/D1/KV permissions | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | ✅ |

---

## Customization

### Change Deployment Branch

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main      # Change to your branch
      - production
```

### Add Staging Environment

Add to `wrangler.toml`:

```toml
[env.staging]
name = "buildbarguna-worker-staging"
```

Then update workflows to support `--env staging`.

### Add Tests

Add to deploy workflow:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

---

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets
2. **Limit API token permissions** - Only grant what's needed
3. **Use branch protection** - Require PR review for main
4. **Enable required status checks** - Tests must pass before merge
5. **Review deployment logs** - Monitor for suspicious activity

---

## Support

For issues:
1. Check GitHub Actions logs
2. Check Cloudflare Worker logs
3. Review migration documentation in `MIGRATIONS.md`
