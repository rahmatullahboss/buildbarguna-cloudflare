---
project_name: 'buildbarguna-cloudflare'
user_name: 'Rahmatullahzisan'
date: '2026-03-01'
sections_completed: ['technology_stack', 'backend_rules', 'frontend_rules', 'database_rules', 'security_rules', 'conventions']
existing_patterns_found: 42
---

# Project Context for AI Agents — BuildBarguna

_This file contains critical rules and patterns that AI agents MUST follow when implementing code in this project. Focus is on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Backend (Cloudflare Worker)
- **Runtime:** Cloudflare Workers (Edge, NOT Node.js — use `nodejs_compat` flag)
- **Framework:** Hono `^4.12.3`
- **Validation:** Zod `^3.25.76` + `@hono/zod-validator ^0.7.6`
- **Language:** TypeScript `^5.9.3`, strict mode ON
- **Database:** Cloudflare D1 (SQLite dialect)
- **KV Store:** Cloudflare KV (SESSIONS binding)
- **File Storage:** Cloudflare R2 (FILES binding — currently optional/commented out)
- **Cron:** Cloudflare Cron Triggers (`scheduled` export)
- **Compatibility date:** `2025-09-01` with `nodejs_compat` flag
- **JWT:** Hono built-in `hono/jwt` (`sign`, `verify`)
- **Crypto:** Web Crypto API (native, NOT Node's `crypto` module)
- **Entry point:** `src/index.ts`

### Frontend (React SPA)
- **Framework:** React `^19.2.4` + React DOM `^19.2.4`
- **Router:** React Router DOM `^7.13.1`
- **Data fetching:** TanStack Query `^5.90.21`
- **Build tool:** Vite `^7.3.1` with `@vitejs/plugin-react ^5.1.4`
- **CSS:** Tailwind CSS `^4.2.1` (v4 — uses `@tailwindcss/postcss`, NOT `tailwindcss` plugin directly)
- **Icons:** Lucide React `^0.575.0`
- **Utilities:** `clsx ^2.1.1`, `tailwind-merge ^2.6.1`
- **Language:** TypeScript `^5.9.3`, strict mode ON, `isolatedModules: true`
- **Path alias:** `@/` → `./src/`
- **Build output:** `../dist` (one level up from frontend/, served by Worker as static assets)
- **Dev proxy:** `/api` → `http://localhost:8787`

---

## Critical Backend Implementation Rules

### 1. Hono App Pattern
```ts
// ALWAYS type the app with Bindings and Variables
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ALWAYS type route sub-apps the same way
export const myRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
```

### 2. Response Helpers — ALWAYS Use `ok()` and `err()`
```ts
// NEVER use c.json() directly — always use helpers from src/lib/response.ts
import { ok, err } from '../lib/response'

return ok(c, { data })          // { success: true, data }
return ok(c, { data }, 201)     // with status 201
return err(c, 'message')        // { success: false, error: 'message' }, 400
return err(c, 'message', 404)   // with status 404
```
- `ok()` accepts status: `200 | 201` only
- `err()` accepts status: `400 | 401 | 403 | 404 | 409 | 500` only

### 3. Pagination — ALWAYS Use Helpers
```ts
import { getPagination, paginate } from '../lib/response'

const { page, limit, offset } = getPagination(c.req.query())
// limit is capped at 100, min 1; page min 1
return ok(c, paginate(rows.results, total, page, limit))
// Returns: { items, total, page, limit, hasMore }
```

### 4. JWT & Auth
- JWT secret accessed via `c.env.JWT_SECRET` (Cloudflare secret — NEVER in vars/wrangler.toml)
- JWT_SECRET MUST be at least 32 characters (validated in global middleware)
- JWT payload shape: `{ sub: string (userId), phone, role, jti, exp }`
- `sub` is user ID as **string** — convert to number with `parseInt(payload.sub)` when setting context
- Token blacklist stored in **D1** (NOT KV) for strong consistency — KV has ~60s eventual lag
- Use `createMiddleware` from `hono/factory` for middleware, NOT plain functions

### 5. Auth Middleware — Context Variables
```ts
// After authMiddleware, access via:
c.get('userId')    // number
c.get('userRole')  // 'member' | 'admin'
c.get('userPhone') // string
```

### 6. Admin Middleware
```ts
import { adminMiddleware } from '../middleware/admin'
// Apply AFTER authMiddleware
adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', adminMiddleware)
```

### 7. D1 Database Queries
```ts
// Single row:
const row = await c.env.DB.prepare('SELECT ...').bind(...).first<TypeName>()

// Multiple rows:
const result = await c.env.DB.prepare('SELECT ...').bind(...).all<TypeName>()
// Access via result.results (array)

// Execute (INSERT/UPDATE/DELETE):
const result = await c.env.DB.prepare('INSERT ...').bind(...).run()
// Check result.success for success

// ALWAYS use Promise.all for parallel independent queries (never sequential await)
const [rowA, rowB] = await Promise.all([queryA, queryB])
```

### 8. Zod Validation Pattern
```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({ ... })
route.post('/', zValidator('json', schema), async (c) => {
  const data = c.req.valid('json')  // typed!
})
```

### 9. Money / Financial Values
- ALL monetary amounts stored as **paisa** (integer) — NOT taka, NOT decimals
- `total_capital`, `total_amount`, `amount`, `share_price` — all in paisa
- Profit rates stored as **basis points** (integer) — 100 basis points = 1%
- Use `src/lib/money.ts` for calculations
- NEVER use floating point arithmetic for money

### 10. Cron / Scheduled Events
```ts
// In src/index.ts — dual export pattern required
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(myTask(env))
  }
}
```

### 11. CORS
- NEVER use `origin: '*'` — explicitly allowlist known origins
- Allowed: `https://buildbarguna-worker.workers.dev`, `http://localhost:5173`, `http://localhost:8787`
- Apply CORS only to `/api/*` routes

### 12. Error Messages (Bangla)
- All user-facing error/success messages are in **Bangla (Bengali)** — maintain this convention
- Example: `'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে'`

---

## Critical Frontend Implementation Rules

### 1. API Calls — ALWAYS Use `src/lib/api.ts`
```ts
// NEVER use fetch() directly — always use the typed api modules
import { projectsApi, sharesApi, earningsApi, tasksApi, adminApi } from '@/lib/api'

// All api functions return:
// { success: true; data: T } | { success: false; error: string }
// Always check success before using data
```

### 2. Token Storage — CRITICAL SECURITY RULE
- JWT token stored in **memory only** (via `src/lib/apiToken.ts`) — NEVER localStorage
- `sessionStorage` used ONLY for: `bb_logged_in` flag, `bb_user` (non-sensitive profile)
- Token is lost on page refresh — user must log in again (by design for security)
- Use `setToken()` / `clearToken()` / `getToken()` from `@/lib/api`

### 3. Auth Utilities — Use `src/lib/auth.ts`
```ts
import { isLoggedIn, isAdmin, saveUser, getUser, formatTaka, formatDate, currentMonth } from '@/lib/auth'

// Format money (paisa → Bengali taka string):
formatTaka(5000)  // → '৳50.00' in Bengali locale

// Format date (ISO string → Bengali locale):
formatDate('2026-01-01')  // Bengali formatted date

// Current month for earnings:
currentMonth()  // → '2026-03' (ISO YYYY-MM format)
```

### 4. Route Guards
```ts
// ProtectedRoute — requires login
<ProtectedRoute><Layout><MyPage /></Layout></ProtectedRoute>

// AdminRoute — requires login + admin role
<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>
```
- These are UI-only guards — server ALWAYS enforces auth too
- Redirects: unauthenticated → `/login`, non-admin → `/`

### 5. TanStack Query Pattern
```ts
// Always wrap API calls in useQuery / useMutation
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', page],
  queryFn: () => projectsApi.list(page)
})
// data will be { success: true; data: ... } or { success: false; error: ... }
// Always check data?.success before accessing data.data
```

### 6. Tailwind CSS v4 — IMPORTANT
- Tailwind v4 is used — syntax differs from v3
- Config in `tailwind.config.js` — uses `@tailwindcss/postcss` in postcss config (NOT `tailwindcss` plugin)
- Custom colors defined: `primary.{50,100,500,600,700,900}`, `success.{500,600}`, `danger.{500,600}`, `warning.{500,600}`
- Custom font: `font-bangla` → `Noto Sans Bengali, SolaimanLipi, sans-serif`

### 7. Path Aliases
```ts
// Use @/ alias for all imports from src/
import { something } from '@/lib/api'
import MyComponent from '@/components/MyComponent'
// NEVER use relative paths like ../../lib/api from deep files
```

### 8. Component File Naming
- Page components: `PascalCase.tsx` (e.g., `Dashboard.tsx`, `ProjectDetail.tsx`)
- Admin pages: `buildbarguna-cloudflare/frontend/src/pages/admin/` folder
- Utility libs: `camelCase.ts` (e.g., `api.ts`, `auth.ts`, `apiToken.ts`)
- Components: `PascalCase.tsx` in `src/components/`

---

## Database Schema Rules

### Tables & Key Constraints
- `users.phone` — UNIQUE, format: Bangladeshi mobile `01[3-9]\d{8}`
- `users.role` — CHECK IN ('member', 'admin'), DEFAULT 'member'
- `users.is_active` — INTEGER (0/1), NOT boolean
- `projects.status` — CHECK IN ('draft', 'active', 'closed'), DEFAULT 'draft'
- `share_purchases.bkash_txid` — UNIQUE (prevents duplicate payments)
- `share_purchases.status` — CHECK IN ('pending', 'approved', 'rejected')
- `user_shares` — composite PK (user_id, project_id) — upsert on approval
- `profit_rates` — UNIQUE(project_id, month) — one rate per project per month
- `earnings` — UNIQUE(user_id, project_id, month) — idempotent distribution
- `token_blacklist` — PK on `jti`, stores `expires_at` as Unix timestamp (INTEGER)
- `task_completions` — UNIQUE(user_id, task_id, task_date) — one per day

### D1 SQLite Quirks
- `datetime('now')` returns UTC — NOT local time
- Use `INSERT OR IGNORE` for idempotent inserts
- Use `COALESCE(SUM(...), 0)` to avoid NULL from empty aggregates
- `INTEGER` used for booleans (0/1), NOT BOOLEAN type
- All timestamps stored as `TEXT` in ISO format

### Query Performance — Always Index
- NEVER add N+1 queries — use JOIN + GROUP BY instead
- Key indexes already defined: `idx_share_purchases_user`, `idx_earnings_user_month`, etc.

---

## Security Rules (NEVER Violate)

1. **JWT_SECRET** — NEVER in `wrangler.toml` vars, ALWAYS set via `wrangler secret put JWT_SECRET`
2. **Token blacklist** — use D1, NOT KV (KV has eventual consistency lag ~60s)
3. **CORS** — NEVER `origin: '*'` with Authorization header
4. **Client guards** — always paired with server-side auth/admin middleware
5. **Password hashing** — use `src/lib/crypto.ts` `hashPassword()` / `verifyPassword()`
6. **Login rate limiting** — 5 failed attempts per phone per 15 minutes, stored in KV with TTL 900s
7. **Phone enumeration** — always increment rate limit counter even on unknown phone
8. **R2 secrets** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` set as Worker secrets

---

## Project Structure

```
buildbarguna-cloudflare/
├── src/                        # Backend (Cloudflare Worker)
│   ├── index.ts                # Entry point — app + scheduled export
│   ├── types.ts                # Bindings, Variables, all DB row types
│   ├── routes/                 # One file per route group
│   │   ├── auth.ts             # /api/auth/*
│   │   ├── projects.ts         # /api/projects/*
│   │   ├── shares.ts           # /api/shares/*
│   │   ├── earnings.ts         # /api/earnings/*
│   │   ├── tasks.ts            # /api/tasks/*
│   │   ├── admin.ts            # /api/admin/*
│   │   └── upload.ts           # /api/upload/*
│   ├── middleware/
│   │   ├── auth.ts             # authMiddleware (JWT verify + blacklist)
│   │   └── admin.ts            # adminMiddleware (role check)
│   ├── lib/
│   │   ├── jwt.ts              # createToken, verifyToken, generateJti
│   │   ├── crypto.ts           # hashPassword, verifyPassword, generateReferralCode
│   │   ├── response.ts         # ok(), err(), paginate(), getPagination()
│   │   ├── money.ts            # financial calculations (paisa/basis points)
│   │   └── r2.ts               # R2 upload helpers
│   ├── db/
│   │   └── schema.sql          # D1 schema — run with wrangler d1 execute
│   └── cron/
│       └── earnings.ts         # Monthly profit distribution
├── frontend/
│   └── src/
│       ├── App.tsx             # Route definitions
│       ├── lib/
│       │   ├── api.ts          # All API calls + TypeScript types
│       │   ├── apiToken.ts     # In-memory token storage (avoids circular imports)
│       │   ├── auth.ts         # isLoggedIn, isAdmin, formatTaka, formatDate
│       │   └── imageCompress.ts
│       ├── components/
│       │   ├── ProtectedRoute.tsx  # ProtectedRoute + AdminRoute
│       │   ├── Layout.tsx
│       │   └── ImageUpload.tsx
│       └── pages/
│           ├── *.tsx           # Member pages
│           └── admin/          # Admin-only pages
├── wrangler.toml               # Worker config (NO secrets here)
└── dist/                       # Built frontend (gitignored, created by build)
```

---

## Development Commands

```bash
# Backend dev server (port 8787)
npm run dev

# Frontend dev server (port 5173, proxies /api to 8787)
npm run dev:frontend

# Build frontend + deploy worker
npm run deploy

# D1 migrations
npm run db:migrate:local   # local D1
npm run db:migrate:remote  # production D1

# Generate TypeScript types from wrangler.toml
npm run cf-typegen

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

---

## Adding New Features — Checklist

### New Backend Route:
1. Create `src/routes/myroute.ts` with `new Hono<{ Bindings: Bindings; Variables: Variables }>()`
2. Add types to `src/types.ts` if new DB types needed
3. Use `ok()` / `err()` for all responses
4. Apply `authMiddleware` for protected routes, `adminMiddleware` for admin routes
5. Use `zValidator` for request body validation
6. Register in `src/index.ts`: `app.route('/api/myroute', myRoutes)`
7. Update schema.sql if new tables needed

### New Frontend Page:
1. Create `src/pages/MyPage.tsx` (PascalCase)
2. Add API functions to `src/lib/api.ts` with proper TypeScript types
3. Use `useQuery` / `useMutation` from TanStack Query for data fetching
4. Add route in `App.tsx` wrapped in `ProtectedRoute` or `AdminRoute`
5. All money display via `formatTaka(paisa)` from `@/lib/auth`
6. Error messages shown to users should be in Bangla
