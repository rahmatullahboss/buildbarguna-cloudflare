# 🚀 BuildBarguna - CI/CD Quick Start

## Automated Deployment Setup

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these **2 required secrets**:

```
Name: CLOUDFLARE_API_TOKEN
Value: [your_cloudflare_api_token]
```

```
Name: CLOUDFLARE_ACCOUNT_ID
Value: [your_cloudflare_account_id]
```

### Step 2: Create Cloudflare API Token

1. Visit https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Custom Token**
3. Name it `GitHub Actions - BuildBarguna`
4. Add these permissions:
   - **Account** → Cloudflare Workers → `Edit`
   - **Account** → D1 → `Edit`
   - **Account** → KV Storage → `Edit`
   - **Account** → Account Settings → `Read`
5. Click **Continue to summary**
6. Click **Create Token**
7. **Copy the token** (you can't see it again!)

### Step 3: Find Your Account ID

1. Go to https://dash.cloudflare.com
2. Look at the **right sidebar** on the home page
3. Copy your **Account ID**

### Step 4: Push to Deploy

```bash
git add .
git commit -m "feat: my new feature"
git push origin main
```

**That's it!** GitHub Actions will:
- ✅ Run tests
- ✅ Build frontend
- ✅ Deploy to Cloudflare
- ✅ Run database migrations automatically

---

## Workflows

### 1. Automatic Deployment (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch
- Push to `production` branch
- Manual trigger from GitHub Actions

**What happens:**
```
Push → Tests → Build → Deploy → Migrate → Done!
```

### 2. Manual Migration (`.github/workflows/migrate.yml`)

**Use when:**
- You need to run migrations manually
- Deployment succeeded but migrations failed
- You want to migrate a specific file

**How to use:**
1. Go to **Actions** tab
2. Select **Run Database Migrations**
3. Click **Run workflow**
4. Choose environment
5. Run!

---

## Monitoring

### Check Deployment Status

**GitHub Actions:**
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

**Cloudflare Logs:**
```
https://dash.cloudflare.com/?to=/:account/workers/services/view/buildbarguna-worker/production/logs
```

### Check Migration Status

```bash
# See which migrations have run
npx wrangler d1 execute buildbarguna-invest-db --remote \
  --command "SELECT id, name, applied_at FROM _migrations ORDER BY id"

# Check if migration flag is set
npx wrangler kv:key get needs_migration --binding=SESSIONS
```

---

## Manual Commands

### Deploy Manually

```bash
# Full deployment
npm run deploy:prod

# Just migrations
npm run db:migrate:prod
```

### Check Applied Migrations

```bash
npx wrangler d1 execute buildbarguna-invest-db --remote \
  --command "SELECT * FROM _migrations"
```

---

## Troubleshooting

### ❌ Deployment Failed

**Check logs:**
```
GitHub → Actions → Deploy to Cloudflare Workers → Latest run
```

**Common issues:**
- Missing secrets → Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
- Test failures → Fix tests and push again
- Build errors → Check frontend build locally first

### ❌ Migration Failed

**Option 1: Auto-retry**
```bash
# Set flag to trigger migration on next request
npx wrangler kv:key put needs_migration "true" --binding=SESSIONS
```

**Option 2: Manual run**
```bash
# Run specific migration
npx wrangler d1 execute buildbarguna-invest-db --remote \
  --file=src/db/migrations/005_critical_fixes.sql
```

### ❌ Worker Returns 503

1. Check Cloudflare Logs for errors
2. Verify migrations completed
3. Run manual migration if needed

---

## Environment Structure

```
buildbarguna-cloudflare/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml      # Auto deployment
│   │   └── migrate.yml     # Manual migrations
│   └── CICD_SETUP.md       # Detailed setup guide
├── src/
│   ├── lib/
│   │   └── migrations.ts   # Migration runner
│   └── db/
│       └── migrations/     # SQL migration files
├── scripts/
│   └── deploy.sh          # Deploy script
└── MIGRATIONS.md          # Migration documentation
```

---

## Next Steps

1. ✅ **Add GitHub secrets** (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
2. ✅ **Push to main** to test deployment
3. ✅ **Check Actions tab** to see deployment progress
4. ✅ **Visit your Worker** to verify it's working
5. ✅ **Check migrations** ran successfully

---

## Documentation

- **CI/CD Setup Guide:** `.github/CICD_SETUP.md`
- **Migration Guide:** `MIGRATIONS.md`
- **Deploy Script:** `scripts/deploy.sh`

---

## Support

**GitHub Actions failing?**
→ Check Actions logs → Fix errors → Push again

**Migrations not running?**
→ Run `npm run db:migrate:prod` manually

**Need help?**
→ Check Cloudflare Logs → Review MIGRATIONS.md
