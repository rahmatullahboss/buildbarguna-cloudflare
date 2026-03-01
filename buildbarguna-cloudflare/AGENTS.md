# Agent Instructions — BuildBarguna Cloudflare

## Language

**Always reply in English.** Do not use Bangla/Bengali in any agent responses, code comments, commit messages, or explanations — regardless of what language the user writes in.

## Project Overview

BuildBarguna is a Bangladeshi group investment platform built on Cloudflare Workers + Hono backend, React frontend, D1 (SQLite) database, and KV storage.

## Critical Rules (Never Violate)

### Money
- All monetary amounts stored as **paisa** (integer) — 1 taka = 100 paisa. Never use floats.
- Profit rates stored as **basis points** (integer) — 100 bps = 1%. Never use percentages directly.
- Always use `Math.floor()` for earned amounts — never round up.
- Use `calcEarningBySharePrice()` from `src/lib/money.ts` for per-share earnings.
- Use `calcEarning()` only when you have total_shares and total_capital (proportion-based).

### API Responses
- Always use `ok()` and `err()` from `src/lib/response.ts` — never `c.json()` directly.
- `ok()` accepts status `200 | 201` only.
- `err()` accepts status `400 | 401 | 403 | 404 | 409 | 429 | 500` only.

### Auth & Security
- JWT token stored in **memory only** on frontend (`src/lib/apiToken.ts`) + sessionStorage with obfuscation for refresh persistence.
- JWT_SECRET set via `wrangler secret put JWT_SECRET` — never in `wrangler.toml`.
- Token blacklist in **D1** (not KV) — D1 has strong consistency, KV has ~60s eventual lag.
- CORS: never use `origin: '*'` with Authorization header. Explicitly allowlist origins.
- Always use `sign(payload, secret, 'HS256')` and `verify(token, secret, 'HS256')` — explicit algorithm required.

### Database
- Use `INSERT OR IGNORE` for idempotent inserts (earnings, task completions).
- Use `COALESCE(SUM(...), 0)` to avoid NULL from empty aggregates.
- Always use parameterized queries — never string interpolation for user input.
- Integers for booleans (0/1), TEXT for timestamps in ISO format.
- Use `Promise.all()` for parallel independent D1 queries — never sequential awaits.
- D1 batch limit is 100 statements per `batch()` call — chunk large batches.
- Use `Promise.allSettled()` in cron jobs so one project failure doesn't crash all.

### Withdrawals
- Available balance = `SUM(earnings)` − `SUM(completed withdrawals)` − `SUM(pending + approved withdrawals)`.
- Pending and approved withdrawals are RESERVED — must be subtracted from available.
- Re-validate balance at approval time (race condition safety).
- `idx_one_pending_per_user` partial unique index prevents multiple pending per user.
- Catch D1 UNIQUE constraint errors and return friendly error messages.

### Frontend
- All API calls go through functions in `src/lib/api.ts` — never raw `fetch()`.
- Always check `data?.success` before accessing `data.data`.
- Use `formatTaka(paisa)` from `@/lib/auth` for all money display.
- Use `@/` path alias for all imports from `src/` — no deep relative paths.
- Page components: `PascalCase.tsx`. Admin pages go in `src/pages/admin/`.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Runtime | Cloudflare Workers (nodejs_compat) | — |
| Backend Framework | Hono | ^4.12.3 |
| Validation | Zod + @hono/zod-validator | ^3.25.76 |
| Database | Cloudflare D1 (SQLite) | — |
| KV Store | Cloudflare KV (SESSIONS) | — |
| File Storage | Cloudflare R2 | — |
| Frontend | React + React Router DOM | ^19.2.4 / ^7.13.1 |
| Data Fetching | TanStack Query | ^5.90.21 |
| CSS | Tailwind CSS v4 | ^4.2.1 |
| Build Tool | Vite | ^7.3.1 |
| Language | TypeScript strict mode | ^5.9.3 |

## Project Structure

```
buildbarguna-cloudflare/
├── src/
│   ├── index.ts              # Entry — app.fetch + scheduled export
│   ├── types.ts              # Bindings, Variables, all DB row types
│   ├── routes/               # One file per route group
│   │   ├── auth.ts           # /api/auth/*
│   │   ├── projects.ts       # /api/projects/*
│   │   ├── shares.ts         # /api/shares/*
│   │   ├── earnings.ts       # /api/earnings/* (includes /portfolio)
│   │   ├── withdrawals.ts    # /api/withdrawals/* + /api/admin/withdrawals/*
│   │   ├── tasks.ts          # /api/tasks/*
│   │   ├── admin.ts          # /api/admin/*
│   │   └── upload.ts         # /api/upload/*
│   ├── middleware/
│   │   ├── auth.ts           # authMiddleware
│   │   └── admin.ts          # adminMiddleware
│   └── lib/
│       ├── money.ts          # All financial calculations
│       ├── jwt.ts            # createToken, verifyToken
│       ├── crypto.ts         # hashPassword, verifyPassword
│       ├── response.ts       # ok(), err(), paginate()
│       └── r2.ts             # R2 upload helpers
├── frontend/src/
│   ├── App.tsx               # Routes
│   ├── lib/
│   │   ├── api.ts            # All API calls + TypeScript types
│   │   ├── apiToken.ts       # In-memory + sessionStorage token
│   │   └── auth.ts           # isLoggedIn, formatTaka, formatDate
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Portfolio.tsx     # Full portfolio with ROI, history
│   │   ├── Withdraw.tsx      # Withdrawal request + history
│   │   └── admin/
│   │       ├── AdminEarnings.tsx
│   │       └── AdminWithdrawals.tsx
│   └── e2e/                  # Playwright E2E tests
├── vitest.config.ts          # Unit test config (node environment)
└── src/lib/*.unit.test.ts    # Unit tests (132 passing)
```

## Testing

```bash
# Unit tests (fast, no server needed)
npm run test:unit

# Watch mode
npm run test:watch

# E2E tests (requires dev servers running)
# Terminal 1: npm run dev (port 8787)
# Terminal 2: cd frontend && npm run dev (port 5173)
# Terminal 3: cd frontend && npm run test:e2e
```

**Current test coverage:**
- `money.unit.test.ts` — 64 tests (all financial calculations)
- `crypto.unit.test.ts` — 19 tests (hash/verify/referral)
- `withdrawal.unit.test.ts` — 29 tests (balance, validation, anti-overdraft)
- `portfolio.unit.test.ts` — 20 tests (ROI, weights, concentration risk)
- **Total: 132/132 passing**

## Development Commands

```bash
npm run dev              # Backend dev server (port 8787)
npm run dev:frontend     # Frontend dev server (port 5173)
npm run deploy           # Build frontend + deploy worker
npm run db:migrate:local # Local D1 schema migration
npm run db:migrate:remote # Production D1 schema migration
npm run cf-typegen       # Generate TypeScript types from wrangler.toml
```

## Production URLs

- Worker: `https://buildbarguna-worker.rahmatullahzisan01.workers.dev`
- Health: `https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/health`

## Adding New Features — Checklist

### New backend route:
1. Create `src/routes/myroute.ts` — type as `Hono<{ Bindings: Bindings; Variables: Variables }>`
2. Add DB types to `src/types.ts`
3. Use `ok()` / `err()` for all responses
4. Apply `authMiddleware` + optionally `adminMiddleware`
5. Use `zValidator('json', schema)` for body validation
6. Register in `src/index.ts`: `app.route('/api/myroute', myRoutes)`
7. Update `src/db/schema.sql` if new tables needed
8. Write unit tests in `src/lib/myfeature.unit.test.ts`

### New frontend page:
1. Create `src/pages/MyPage.tsx` (PascalCase)
2. Add API functions + types to `src/lib/api.ts`
3. Use `useQuery` / `useMutation` from TanStack Query
4. Add route in `App.tsx` wrapped in `ProtectedRoute` or `AdminRoute`
5. Add nav link in `src/components/Layout.tsx`
6. Display money with `formatTaka(paisa)` from `@/lib/auth`
7. Add E2E test in `frontend/e2e/`
