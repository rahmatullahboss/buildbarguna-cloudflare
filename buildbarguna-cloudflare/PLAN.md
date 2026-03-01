# BuildBarguna — Group Investment Platform
## Product Requirements Document (PRD) + Architecture Plan (v2 — Post Adversarial Review)

> **Project:** buildbarguna-cloudflare
> **Date:** 2026-03-01
> **Stack:** Cloudflare-Native (Workers + D1 + KV + R2 + Cron)
> **UI Language:** Bangla
> **Deploy:** Wrangler CLI

---

## 1. Project Summary

**BuildBarguna** is a group investing platform where members can buy shares in business projects and receive monthly profit distributions. Payment is manual (bKash) approved by admin.

---

## 2. Core Features

### 2.1 Member Registration & Login
- Register with name, mobile number, password
- Optional referral code at registration
- JWT-based authentication via Hono JWT middleware
- JWT blacklist stored in Cloudflare KV (TTL: 7 days) for logout support

### 2.2 Live Business Projects & Share Purchase
- Admin publishes projects (name, description, total capital, share count, share price)
- Member submits a share purchase request with bKash TxID
- Admin verifies TxID and approves/rejects
- On approval, shares are atomically added to member portfolio
- **bKash TxID is UNIQUE** — same TxID cannot be submitted twice

### 2.3 Monthly Profit Distribution
- Admin sets profit rate (%) per project per month in `profit_rates` table
- Cron Trigger runs on the 1st of every month (BD midnight)
- Distribution is **idempotent** — uses `INSERT OR IGNORE` with UNIQUE constraint on `(user_id, project_id, month)`
- Earnings are stored as audit log; balance is computed dynamically from earnings table (no mutable balance column)
- **Profit formula (explicit):**
  `earning = (user_shares / total_shares) × total_capital × rate / 100`
  Where `rate` is the monthly return % on total capital set by admin.
  All amounts stored as **INTEGER (paisa)** — no floating point money.

### 2.4 Daily Tasks
- Admin configures social media links as tasks (Facebook, YouTube, Telegram, etc.)
- Worker serves a redirect URL that logs the click before redirecting to destination
- After redirect, user can mark task complete (honor system + click-log)
- Completion tracked with UNIQUE(user_id, task_id, date) — no double-claim
- Tasks use soft-delete (is_active = 0), not hard delete

### 2.5 Admin Panel
- Member management (view, activate/deactivate)
- Project create/update/status change
- Share purchase approval/rejection queue
- Monthly profit rate setting and manual distribution trigger
- Daily task configuration
- Referral report

---

## 3. Cloudflare-Native Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend API | Hono.js on Workers | Ultra-fast, zero cold start, Workers-native |
| Database | Cloudflare D1 (SQLite) | Free tier, Workers-native, atomic transactions |
| Auth | Web Crypto API (PBKDF2) | Workers-native, no bcryptjs (Node.js-only) |
| Session/Blacklist | Cloudflare KV | Free tier, TTL support |
| File Storage | Cloudflare R2 | Free egress, S3-compatible |
| Scheduled Jobs | Workers Cron Triggers | Free, runs in same Worker |
| Frontend | React 18 + Vite + TailwindCSS + shadcn/ui | Served via Workers Static Assets |
| Deploy | Wrangler CLI | Official Cloudflare tool |
| Language | TypeScript | Type safety |

### Why NOT bcryptjs?
`bcryptjs` uses Node.js `crypto` APIs not available in Workers runtime. Instead, use the **Web Crypto API** (PBKDF2) which is natively supported in all Workers:

```typescript
// Hash password
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const hashArray = Array.from(new Uint8Array(bits))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('')
  const hashHex = hashArray.map(b => b.toString(16).padStart(2,'0')).join('')
  return saltHex + ':' + hashHex
}
```

---

## 4. Worker Architecture — Single Worker

```
buildbarguna-worker (ONE Worker only)
├── /api/*          → Hono.js REST API
├── /              → React SPA (Static Assets via Workers Assets)
└── scheduled()    → Monthly profit distribution (Cron Trigger)
```

**Worker count: 1** — API + Frontend + Cron all in one Worker. No separate servers.

---

## 5. File Structure

```
buildbarguna-cloudflare/
├── wrangler.toml
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts               ← Worker entry (fetch + scheduled)
│   ├── types.ts               ← Bindings types
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── shares.ts
│   │   ├── earnings.ts
│   │   ├── tasks.ts
│   │   └── admin.ts
│   ├── middleware/
│   │   ├── auth.ts            ← JWT verify
│   │   └── admin.ts           ← Admin role check
│   ├── lib/
│   │   ├── crypto.ts          ← PBKDF2 password hash (Web Crypto API)
│   │   └── money.ts           ← Integer paisa arithmetic helpers
│   ├── db/
│   │   └── schema.sql
│   └── cron/
│       └── earnings.ts
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Projects.tsx
│       │   ├── ProjectDetail.tsx
│       │   ├── MyInvestments.tsx
│       │   ├── Earnings.tsx
│       │   ├── DailyTasks.tsx
│       │   └── admin/
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminProjects.tsx
│       │       ├── AdminShares.tsx
│       │       ├── AdminEarnings.tsx
│       │       └── AdminTasks.tsx
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Navbar.tsx
│       │   └── ui/
│       └── lib/
│           ├── api.ts
│           └── auth.ts
│
└── dist/                      ← React build output (Workers Static Assets)
```

---

## 6. Database Schema (D1 / SQLite) — Fixed

```sql
-- IMPORTANT: All money stored as INTEGER (paisa = taka * 100) to avoid float errors

-- 1. Users
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- PBKDF2 via Web Crypto API
  role          TEXT DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  referral_code TEXT UNIQUE,
  referred_by   TEXT,                    -- referral_code of referrer
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
  -- NOTE: No balance column — computed dynamically from earnings table
);

-- 2. Projects
CREATE TABLE projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT,
  total_capital INTEGER NOT NULL,        -- paisa (taka * 100)
  total_shares  INTEGER NOT NULL,
  share_price   INTEGER NOT NULL,        -- paisa per share
  status        TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
  created_at    TEXT DEFAULT (datetime('now'))
  -- NOTE: No sold_shares column — computed via SUM(quantity) from user_shares
);

-- 3. Share Purchase Requests
CREATE TABLE share_purchases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  quantity      INTEGER NOT NULL CHECK(quantity > 0),
  total_amount  INTEGER NOT NULL,        -- paisa
  bkash_txid    TEXT NOT NULL UNIQUE,    -- UNIQUE: prevents reuse of same TxID
  status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  admin_note    TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))  -- updated manually in every UPDATE
);

-- 4. User Share Portfolio
CREATE TABLE user_shares (
  user_id       INTEGER NOT NULL REFERENCES users(id),
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  quantity      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, project_id)     -- one row per user per project, accumulate
);

-- 5. Monthly Profit Rates (set by admin)
CREATE TABLE profit_rates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  month       TEXT NOT NULL,             -- 'YYYY-MM'
  rate        INTEGER NOT NULL,          -- basis points (1% = 100 bps) to avoid float
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, month)
);

-- 6. Earnings Distribution Log
CREATE TABLE earnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  month       TEXT NOT NULL,             -- 'YYYY-MM'
  shares      INTEGER NOT NULL,
  rate        INTEGER NOT NULL,          -- basis points
  amount      INTEGER NOT NULL,          -- paisa
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, project_id, month)     -- idempotency: prevents double distribution
);

-- 7. Daily Tasks
CREATE TABLE daily_tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  destination_url TEXT NOT NULL,         -- actual social media URL
  platform    TEXT CHECK(platform IN ('facebook','youtube','telegram','other')),
  is_active   INTEGER DEFAULT 1,         -- soft delete only, never hard delete
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 8. Task Completions
CREATE TABLE task_completions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  task_id     INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at  TEXT,                      -- when redirect was logged
  completed_at TEXT DEFAULT (datetime('now')),
  date        TEXT NOT NULL,             -- 'YYYY-MM-DD'
  UNIQUE(user_id, task_id, date)
);

-- Indexes
CREATE INDEX idx_share_purchases_user ON share_purchases(user_id);
CREATE INDEX idx_share_purchases_status ON share_purchases(status);
CREATE INDEX idx_user_shares_project ON user_shares(project_id);
CREATE INDEX idx_earnings_user ON earnings(user_id);
CREATE INDEX idx_earnings_month ON earnings(month);
CREATE INDEX idx_task_completions_user_date ON task_completions(user_id, date);
```

---

## 7. Money Arithmetic Rules

All money values are stored as **INTEGER in paisa** (1 taka = 100 paisa).

```typescript
// lib/money.ts
export const toTaka = (paisa: number) => paisa / 100
export const toPaisa = (taka: number) => Math.round(taka * 100)
export const formatTaka = (paisa: number) => `৳${(paisa / 100).toFixed(2)}`

// Profit calculation (basis points: 1% = 100 bps)
// earning_paisa = floor((user_shares / total_shares) * total_capital_paisa * rate_bps / 10000)
export const calcEarning = (userShares: number, totalShares: number, capitalPaisa: number, rateBps: number) =>
  Math.floor((userShares / totalShares) * capitalPaisa * rateBps / 10000)
```

---

## 8. Profit Distribution Formula

**Admin sets:** `rate` = monthly return % on total capital (e.g. 5% = 500 bps)

**Formula:**
```
member_earning = floor((member_shares ÷ project_total_shares) × project_total_capital × rate ÷ 100)
```

**Example:**
- Project: total_capital = ৳10,000, total_shares = 100, rate = 5%
- Member owns 10 shares
- Earning = (10/100) × 10,000 × 5% = ৳50

**Stored as:** 5000 paisa in `earnings.amount`

---

## 9. API Routes

### Auth `/api/auth`
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout          ← adds token to KV blacklist
GET  /api/auth/me
```

### Projects `/api/projects` (public)
```
GET  /api/projects             ← ?page=1&limit=20
GET  /api/projects/:id
```

### Shares `/api/shares` [Auth]
```
POST /api/shares/buy
GET  /api/shares/my            ← ?page=1&limit=20
GET  /api/shares/requests      ← my pending/approved/rejected requests
```

### Earnings `/api/earnings` [Auth]
```
GET  /api/earnings             ← ?page=1&limit=20
GET  /api/earnings/summary     ← computed total balance (sum of earnings)
```

### Tasks `/api/tasks` [Auth]
```
GET  /api/tasks                ← today's tasks with completion status
GET  /api/tasks/:id/redirect   ← logs click, redirects to destination_url
POST /api/tasks/:id/complete   ← mark complete after redirect
```

### Admin `/api/admin` [Admin Auth]
```
GET   /api/admin/users                    ← ?page=1&limit=20
GET   /api/admin/users/:id
PATCH /api/admin/users/:id/toggle

POST  /api/admin/projects
PUT   /api/admin/projects/:id
PATCH /api/admin/projects/:id/status

GET   /api/admin/shares/pending           ← ?page=1&limit=20
PATCH /api/admin/shares/:id/approve
PATCH /api/admin/shares/:id/reject

GET   /api/admin/profit-rates
POST  /api/admin/profit-rates             ← set rate for project+month
POST  /api/admin/distribute-earnings      ← manual trigger (same as cron)

GET   /api/admin/tasks
POST  /api/admin/tasks
PUT   /api/admin/tasks/:id
PATCH /api/admin/tasks/:id/toggle         ← soft delete (is_active toggle)
```

---

## 10. wrangler.toml (Fixed)

```toml
name = "buildbarguna-worker"
main = "src/index.ts"
compatibility_date = "2025-09-01"
minify = true

# Static assets (React build output)
assets = { directory = "dist", html_handling = "single-page-application" }

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "buildbarguna-db"
database_id = "REPLACE_AFTER_CREATE"

# KV (JWT blacklist / session)
[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_AFTER_CREATE"

# R2 (Project images)
[[r2_buckets]]
binding = "FILES"
bucket_name = "buildbarguna-files"

# Cron: 1st of every month at BD midnight (UTC 18:00 = BD 00:00)
[triggers]
crons = ["0 18 1 * *"]

# [vars] — NO SECRETS HERE
# JWT_SECRET → use: wrangler secret put JWT_SECRET
# ADMIN_PHONE removed — use D1 directly to set role='admin'
```

---

## 11. src/index.ts

```typescript
import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { shareRoutes } from './routes/shares'
import { earningRoutes } from './routes/earnings'
import { taskRoutes } from './routes/tasks'
import { adminRoutes } from './routes/admin'
import { distributeMonthlyEarnings } from './cron/earnings'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/shares', shareRoutes)
app.route('/api/earnings', earningRoutes)
app.route('/api/tasks', taskRoutes)
app.route('/api/admin', adminRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(distributeMonthlyEarnings(env))
  }
}
```

---

## 12. Cron Earnings Distribution (Idempotent)

```typescript
// src/cron/earnings.ts
export async function distributeMonthlyEarnings(env: Bindings) {
  const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  // Get all profit rates set for this month
  const rates = await env.DB.prepare(
    'SELECT * FROM profit_rates WHERE month = ?'
  ).bind(month).all()

  for (const rate of rates.results) {
    const project = await env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(rate.project_id).first()

    if (!project) continue

    // Get all shareholders for this project
    const shareholders = await env.DB.prepare(
      'SELECT * FROM user_shares WHERE project_id = ?'
    ).bind(rate.project_id).all()

    for (const holder of shareholders.results) {
      const amount = Math.floor(
        (holder.quantity / project.total_shares) *
        project.total_capital *
        rate.rate / 10000  // rate in basis points
      )
      if (amount <= 0) continue

      // INSERT OR IGNORE — idempotent, safe to run twice
      await env.DB.prepare(`
        INSERT OR IGNORE INTO earnings (user_id, project_id, month, shares, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(holder.user_id, rate.project_id, month, holder.quantity, rate.rate, amount).run()
    }
  }
}
```

---

## 13. Security

| Concern | Solution |
|---------|---------|
| Password hashing | Web Crypto API (PBKDF2, 100k iterations) — Workers-native |
| JWT secret | `wrangler secret put JWT_SECRET` — encrypted, never in vars |
| Token logout | JWT token stored in KV blacklist with TTL |
| Admin check | JWT payload `role` field verified in middleware |
| Money precision | Integer paisa, never REAL/float |
| Duplicate TxID | UNIQUE constraint on `bkash_txid` |
| Double profit run | UNIQUE(user_id, project_id, month) + INSERT OR IGNORE |
| Rate limiting | Hono rate limiter middleware on auth routes |
| SQL injection | D1 prepared statements only — never string concat |

---

## 14. Frontend Pages (Bangla UI)

| Page | Route | Description |
|------|-------|-------------|
| লগইন | `/login` | Phone + password |
| রেজিস্ট্রেশন | `/register` | Name, phone, password, optional referral |
| ড্যাশবোর্ড | `/` | Balance (computed), total shares, recent activity |
| প্রজেক্টসমূহ | `/projects` | Live project cards with share availability |
| প্রজেক্ট বিস্তারিত | `/projects/:id` | Detail + "শেয়ার কিনুন" form |
| আমার বিনিয়োগ | `/my-investments` | Share portfolio |
| মুনাফা ইতিহাস | `/earnings` | Monthly earnings breakdown |
| ডেইলি টাস্ক | `/tasks` | Social media tasks |
| অ্যাডমিন | `/admin/*` | Admin panel (role-gated) |

---

## 15. Deployment Steps (Wrangler CLI)

```bash
# 1. Install dependencies
npm install

# 2. Create Cloudflare resources
npx wrangler d1 create buildbarguna-db
npx wrangler kv namespace create SESSIONS
npx wrangler r2 bucket create buildbarguna-files

# 3. Copy the IDs printed above into wrangler.toml

# 4. Run DB migration
npx wrangler d1 execute buildbarguna-db --file=src/db/schema.sql --remote

# 5. Set encrypted secret (NOT in wrangler.toml)
npx wrangler secret put JWT_SECRET

# 6. Build frontend
npm run build  # runs: cd frontend && npm run build && cp -r dist ../dist

# 7. Deploy everything
npx wrangler deploy

# 8. Bootstrap first admin (after registering via app)
npx wrangler d1 execute buildbarguna-db \
  --command="UPDATE users SET role='admin' WHERE phone='01XXXXXXXXX'" --remote
```

---

## 16. Root package.json Scripts

```json
{
  "scripts": {
    "dev:worker": "wrangler dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build && cp -r dist ../dist",
    "deploy": "npm run build && wrangler deploy",
    "db:migrate": "wrangler d1 execute buildbarguna-db --file=src/db/schema.sql --remote",
    "db:migrate:local": "wrangler d1 execute buildbarguna-db --file=src/db/schema.sql --local"
  }
}
```

---

## 17. Cost Estimate

| Service | Free Limit | Our Usage | Cost |
|---------|-----------|-----------|------|
| Workers | 10M req/month | ~100K req/month | $0 |
| D1 Database | 5M reads/month | ~500K reads/month | $0 |
| KV | 1GB, 10M reads | ~10K reads/month | $0 |
| R2 | 10GB | ~1GB | $0 |
| Cron | Unlimited | 1 trigger/month | $0 |
| **Total** | | | **$0/month** |

---

## 18. Development Phases

### Phase 1: Setup (Day 1)
- [ ] Init Hono project with Workers template
- [ ] Configure wrangler.toml with D1, KV, R2, Cron
- [ ] Create D1, KV, R2 resources via wrangler
- [ ] Run schema.sql migration

### Phase 2: Backend API (Day 2–3)
- [ ] types.ts — Bindings
- [ ] lib/crypto.ts — PBKDF2 password hashing
- [ ] lib/money.ts — Integer paisa helpers
- [ ] Auth routes (register, login, logout, me)
- [ ] Project routes (list, detail)
- [ ] Share purchase routes
- [ ] Earnings routes
- [ ] Task routes + redirect endpoint
- [ ] Admin routes (all)
- [ ] Cron earnings distribution (idempotent)

### Phase 3: Frontend (Day 4–5)
- [ ] Vite + React + TailwindCSS + shadcn/ui
- [ ] Auth pages
- [ ] Member pages (Dashboard, Projects, Investments, Earnings, Tasks)
- [ ] Admin pages

### Phase 4: Deploy & Test (Day 6)
- [ ] Frontend build integration
- [ ] wrangler deploy
- [ ] Bootstrap admin account
- [ ] End-to-end test: register → buy share → admin approve → cron → earnings
