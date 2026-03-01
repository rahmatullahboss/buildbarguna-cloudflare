# BuildBarguna — Deployment Guide (Wrangler CLI)

## Prerequisites
- Node.js 18+
- Cloudflare account (free tier)
- Wrangler CLI installed globally: `npm install -g wrangler`
- Logged in: `wrangler login`

## Step 1 — Install dependencies

```bash
cd buildbarguna-cloudflare
npm install

cd frontend
npm install
cd ..
```

## Step 2 — Create Cloudflare resources

```bash
# D1 Database
npx wrangler d1 create buildbarguna-db
# Copy the database_id from output → paste into wrangler.toml

# KV Namespace
npx wrangler kv namespace create SESSIONS
# Copy the id from output → paste into wrangler.toml

# R2 Bucket
npx wrangler r2 bucket create buildbarguna-files
```

## Step 3 — Update wrangler.toml

Replace these placeholders in `wrangler.toml`:
- `REPLACE_WITH_YOUR_D1_ID` → your D1 database_id
- `REPLACE_WITH_YOUR_KV_ID` → your KV namespace id

## Step 4 — Set JWT Secret

```bash
npx wrangler secret put JWT_SECRET
# Enter a strong random string (min 32 chars)
# Example: openssl rand -base64 32
```

## Step 5 — Run database migration

```bash
# Local (for testing)
npm run db:migrate:local

# Remote (production)
npm run db:migrate:remote
```

## Step 6 — Test locally

```bash
# Terminal 1: Start worker
npm run dev

# Terminal 2: Start frontend dev server
npm run dev:frontend
# Frontend available at http://localhost:5173
# Worker API at http://localhost:8787
```

## Step 7 — Build & Deploy

```bash
npm run deploy
# This runs: cd frontend && npm run build && cp -r dist ../dist && wrangler deploy
```

## Step 8 — Create first Admin account

```bash
# 1. Register via the app normally at your deployed URL
# 2. Then promote to admin:
npx wrangler d1 execute buildbarguna-db \
  --command="UPDATE users SET role='admin' WHERE phone='01XXXXXXXXX'" \
  --remote
```

## Step 9 — Verify deployment

```bash
# Check worker status
npx wrangler deployments list

# Test health endpoint
curl https://buildbarguna-worker.<your-subdomain>.workers.dev/api/health
```

## Useful commands

```bash
# View live logs
npx wrangler tail

# Query database
npx wrangler d1 execute buildbarguna-db --command="SELECT * FROM users" --remote

# Run cron manually (test earnings distribution)
npx wrangler d1 execute buildbarguna-db \
  --command="SELECT * FROM profit_rates" --remote

# Redeploy after changes
npm run deploy
```

## GitHub Actions CI/CD (Auto Deploy)

Every push to `main` branch automatically:
1. Runs unit tests (132 tests)
2. Builds the React frontend
3. Deploys to Cloudflare Workers via Wrangler

### Setup — Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets:

| Secret Name | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → right sidebar → Account ID |

### API Token permissions required:
- **Workers Scripts** — Edit
- **Workers KV Storage** — Edit  
- **Workers R2 Storage** — Edit *(if using R2)*
- **D1** — Edit
- **Account** — Read

### Trigger deploy manually:
GitHub repo → **Actions** tab → "Deploy to Cloudflare Workers" → **Run workflow**

> **Note:** `JWT_SECRET` is already set via `wrangler secret put` — it is stored in Cloudflare directly and does NOT need to be a GitHub secret.

---

## Custom Domain (optional)

```bash
# In Cloudflare dashboard:
# Workers & Pages → buildbarguna-worker → Settings → Domains & Routes
# Add custom domain: yourdomain.com
```

## Environment summary

| Resource | Name | Binding |
|----------|------|---------|
| Worker | buildbarguna-worker | — |
| D1 Database | buildbarguna-db | DB |
| KV Namespace | SESSIONS | SESSIONS |
| R2 Bucket | buildbarguna-files | FILES |
| Secret | JWT_SECRET | JWT_SECRET |
| Cron | 0 18 1 * * | scheduled() |

**Total cost: $0/month** on Cloudflare free tier.
