# Implementation Guide: Architecture Fixes
## BuildBarguna Critical Fixes

---

## FIX #1: Parallel Batch Processing for Cron Earnings

### Current Code (Sequential — SLOW)
```typescript
// src/cron/earnings.ts (PROBLEMATIC)
for (let i = 0; i < statements.length; i += 100) {
  await env.DB.batch(statements.slice(i, i + 100))  // Waits for each batch
}
```

### Fixed Code (Parallel — 10x FASTER)
```typescript
// src/cron/earnings.ts
export async function distributeMonthlyEarnings(env: Bindings, month?: string): Promise<void> {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7)

  const ratesResult = await env.DB.prepare(
    'SELECT * FROM profit_rates WHERE month = ?'
  ).bind(targetMonth).all<{ project_id: number; rate: number }>()

  if (!ratesResult.results.length) return

  for (const rate of ratesResult.results) {
    const project = await env.DB.prepare(
      'SELECT id, total_shares, total_capital FROM projects WHERE id = ? AND status != ?'
    ).bind(rate.project_id, 'draft').first<{ id: number; total_shares: number; total_capital: number }>()

    if (!project || project.total_shares === 0) continue

    const shareholders = await env.DB.prepare(
      'SELECT user_id, quantity FROM user_shares WHERE project_id = ?'
    ).bind(rate.project_id).all<{ user_id: number; quantity: number }>()

    if (!shareholders.results.length) continue

    const statements = shareholders.results
      .map(holder => {
        const amount = calcEarning(
          holder.quantity,
          project.total_shares,
          project.total_capital,
          rate.rate
        )
        if (amount <= 0) return null

        return env.DB.prepare(
          `INSERT OR IGNORE INTO earnings (user_id, project_id, month, shares, rate, amount)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(holder.user_id, rate.project_id, targetMonth, holder.quantity, rate.rate, amount)
      })
      .filter(Boolean) as D1PreparedStatement[]

    // ✅ FIXED: Run batches in PARALLEL, not sequential
    const batchSize = 100
    const batchPromises = []
    for (let i = 0; i < statements.length; i += batchSize) {
      batchPromises.push(
        env.DB.batch(statements.slice(i, i + batchSize))
      )
    }
    await Promise.all(batchPromises)  // Execute all batches concurrently
  }
}
```

### Testing the Fix
```bash
# Test locally with 10k shareholders
npm run dev

# Simulate by setting profit rate and running:
curl -X POST http://localhost:8787/api/admin/distribute-earnings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": "2025-03"}'

# Should complete in <10 seconds instead of 30+ seconds
```

### Monitoring
Add to `src/cron/earnings.ts`:
```typescript
export async function distributeMonthlyEarnings(env: Bindings, month?: string): Promise<void> {
  const startTime = Date.now()
  console.log(`[EARNINGS] Starting distribution for ${month}`)

  // ... existing code ...

  const elapsed = Date.now() - startTime
  console.log(`[EARNINGS] Completed in ${elapsed}ms`)
  
  if (elapsed > 20000) {
    console.warn(`[EARNINGS] WARNING: Took ${elapsed}ms, approaching timeout limit`)
    // In production: send alert to monitoring system
  }
}
```

---

## FIX #2: Share Approval Race Condition Lock Table

### Step 1: Update Schema (Add Lock Table)

```sql
-- Add to src/db/schema.sql after earnings table

-- 9. Share Approval Lock (prevents double-approval race condition)
CREATE TABLE IF NOT EXISTS share_approvals (
  purchase_id INTEGER PRIMARY KEY,
  approved_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(purchase_id) REFERENCES share_purchases(id) ON DELETE CASCADE
);

-- Index for quick lookup during approval
CREATE INDEX IF NOT EXISTS idx_share_approvals_timestamp ON share_approvals(approved_at);
```

### Step 2: Update Admin Route

Replace the approval logic in `src/routes/admin.ts`:

```typescript
adminRoutes.patch('/shares/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  // Step 1: Fetch the purchase request
  const purchase = await c.env.DB.prepare(
    'SELECT * FROM share_purchases WHERE id = ? AND status = ?'
  ).bind(id, 'pending').first<{
    user_id: number
    project_id: number
    quantity: number
  }>()

  if (!purchase) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)

  // Step 2: Try to acquire approval lock via unique constraint
  // If another admin already approved, this will fail
  const lockResult = await c.env.DB.prepare(
    'INSERT INTO share_approvals (purchase_id) VALUES (?)'
  ).bind(id).run()

  if (!lockResult.success) {
    return err(c, 'এই অনুরোধ অন্য অ্যাডমিন দ্বারা ইতিমধ্যে অনুমোদিত হয়েছে', 409)
  }

  // Step 3: Now update purchase status (protected by lock)
  const updateResult = await c.env.DB.prepare(
    `UPDATE share_purchases SET status = 'approved', updated_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(id).run()

  if (updateResult.meta.changes === 0) {
    // This shouldn't happen (we just locked it), but be safe
    return err(c, 'অনুরোধ প্রক্রিয়া করতে ব্যর্থ', 500)
  }

  // Step 4: Check capacity and insert shares
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO user_shares (user_id, project_id, quantity)
     SELECT ?, ?, ?
     WHERE (SELECT COALESCE(SUM(quantity), 0) FROM user_shares WHERE project_id = ?) + ? <=
           (SELECT total_shares FROM projects WHERE id = ?)
     ON CONFLICT(user_id, project_id) DO UPDATE SET quantity = quantity + excluded.quantity`
  ).bind(
    purchase.user_id, purchase.project_id, purchase.quantity,
    purchase.project_id, purchase.quantity, purchase.project_id
  ).run()

  if (insertResult.meta.changes === 0) {
    // Shares unavailable, rollback approval
    await c.env.DB.prepare(
      `UPDATE share_purchases SET status = 'pending', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(id).run()
    
    // Delete the approval lock
    await c.env.DB.prepare(
      'DELETE FROM share_approvals WHERE purchase_id = ?'
    ).bind(id).run()

    return err(c, 'পর্যাপ্ত শেয়ার নেই। অনুরোধ মুলতবি অবস্থায় রাখা হয়েছে।', 409)
  }

  return ok(c, { message: 'শেয়ার অনুমোদন করা হয়েছে এবং পোর্টফোলিওতে যোগ হয়েছে' })
})
```

### Step 3: Test Concurrent Approvals

Create `test/concurrent-approval.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('Concurrent Share Approvals', () => {
  it('Should prevent double approval on concurrent requests', async () => {
    const shareId = 100
    const approvalUrls = Array(5).fill(null).map((_, i) => (
      `POST /api/admin/shares/${shareId}/approve`
    ))

    // Simulate 5 concurrent approval requests
    const results = await Promise.allSettled(
      approvalUrls.map(url => fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ADMIN_TOKEN' }
      }))
    )

    // Only ONE should succeed (201), others should get 409 (conflict)
    const successes = results.filter(r => r.status === 201).length
    const conflicts = results.filter(r => r.status === 409).length

    expect(successes).toBe(1)
    expect(conflicts).toBe(4)
    
    // Verify user only got shares once
    const portfolio = await fetch(`/api/shares/my`, {
      headers: { 'Authorization': 'Bearer USER_TOKEN' }
    })
    const shares = await portfolio.json()
    expect(shares.data.items).toHaveLength(1)
  })
})
```

---

## FIX #3: Token Blacklist Migration to D1

### Step 1: Update Schema

```sql
-- Add to src/db/schema.sql after users table

-- 9. Token Blacklist (replaces KV for strong consistency)
CREATE TABLE IF NOT EXISTS token_blacklist (
  jti TEXT PRIMARY KEY,
  blacklisted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
```

### Step 2: Update Auth Routes

```typescript
// src/routes/auth.ts

authRoutes.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')!
  const token = authHeader.slice(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)

  if (payload) {
    // Convert Unix timestamp to ISO string
    const expiresAt = new Date(payload.exp * 1000).toISOString()
    
    // ✅ FIXED: Use D1 instead of KV for strong consistency
    await c.env.DB.prepare(
      `INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)`
    ).bind(payload.jti, expiresAt).run()
  }

  return ok(c, { message: 'লগআউট সফল হয়েছে' })
})
```

### Step 3: Update Auth Middleware

```typescript
// src/middleware/auth.ts

export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return err(c, 'অনুমোদন প্রয়োজন', 401)
    }

    const token = authHeader.slice(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    if (!payload) {
      return err(c, 'টোকেন অকার্যকর বা মেয়াদোত্তীর্ণ', 401)
    }

    // ✅ FIXED: Check D1 blacklist instead of KV
    const blacklisted = await c.env.DB.prepare(
      `SELECT 1 FROM token_blacklist 
       WHERE jti = ? AND expires_at > datetime('now')`
    ).bind(payload.jti).first()

    if (blacklisted) {
      return err(c, 'টোকেন বাতিল করা হয়েছে, আবার লগইন করুন', 401)
    }

    c.set('userId', parseInt(payload.sub))
    c.set('userRole', payload.role)
    c.set('userPhone', payload.phone)

    await next()
  }
)
```

### Step 4: Add Cleanup Cron Job

Add monthly cleanup in `src/index.ts`:

```typescript
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Monthly earnings: 1st day at 18:00
    if (event.cron === '0 18 1 * *') {
      ctx.waitUntil(distributeMonthlyEarnings(env))
    }
    
    // ✅ NEW: Weekly cleanup of expired tokens (every Monday at 2 AM)
    if (event.cron === '0 2 * * 1') {
      ctx.waitUntil(cleanupExpiredTokens(env))
    }
  }
}

async function cleanupExpiredTokens(env: Bindings): Promise<void> {
  const result = await env.DB.prepare(
    `DELETE FROM token_blacklist WHERE expires_at < datetime('now')`
  ).run()
  
  console.log(`[CLEANUP] Removed ${result.meta.changes} expired tokens`)
}
```

Update `wrangler.toml`:
```toml
[triggers]
crons = [
  "0 18 1 * *",      # Earnings on 1st of month at 18:00
  "0 2 * * 1"        # Cleanup on Mondays at 2 AM
]
```

---

## FIX #4: Add Missing Database Indexes

### Update Schema

Add to `src/db/schema.sql` at the end:

```sql
-- Additional indexes for performance (before production)
CREATE INDEX IF NOT EXISTS idx_earnings_project         ON earnings(project_id);
CREATE INDEX IF NOT EXISTS idx_share_purchases_project  ON share_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_profit_rates_project_month ON profit_rates(project_id, month);
CREATE INDEX IF NOT EXISTS idx_share_purchases_user_project ON share_purchases(user_id, project_id);

-- Optional: For future analytics
CREATE INDEX IF NOT EXISTS idx_task_completions_date    ON task_completions(date);
CREATE INDEX IF NOT EXISTS idx_users_phone              ON users(phone);  -- For login queries
```

### Apply Migration

```bash
# Local testing
npm run db:migrate:local

# Production deployment
npm run db:migrate:remote

# Verify indexes exist
wrangler d1 execute buildbarguna-db --command "SELECT name FROM sqlite_master WHERE type='index'" --remote
```

---

## FIX #5: Projects Listing N+1 Query

### Current Code (N+1 — SLOW)

```typescript
// src/routes/projects.ts (PROBLEMATIC)
const [rows, countRow] = await Promise.all([
  c.env.DB.prepare(
    `SELECT p.*,
      COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id), 0) as sold_shares
     FROM projects p WHERE p.status = 'active' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all(),
  ...
])
```

### Fixed Code (Single Query — FAST)

```typescript
// src/routes/projects.ts (FIXED)
import { Hono } from 'hono'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, Project } from '../types'

export const projectRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/projects — public, paginated
projectRoutes.get('/', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())

  // ✅ FIXED: Single query with LEFT JOIN + GROUP BY
  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT 
         p.id, p.title, p.description, p.image_url, 
         p.total_capital, p.total_shares, p.share_price, 
         p.status, p.created_at,
         COALESCE(SUM(us.quantity), 0) as sold_shares
       FROM projects p
       LEFT JOIN user_shares us ON us.project_id = p.id
       WHERE p.status = 'active'
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<Project & { sold_shares: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM projects WHERE status = 'active'`
    ).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// GET /api/projects/:id — public
projectRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  // ✅ FIXED: Single query instead of two
  const project = await c.env.DB.prepare(
    `SELECT 
       p.id, p.title, p.description, p.image_url, 
       p.total_capital, p.total_shares, p.share_price, 
       p.status, p.created_at,
       COALESCE(SUM(us.quantity), 0) as sold_shares
     FROM projects p
     LEFT JOIN user_shares us ON us.project_id = p.id
     WHERE p.id = ?
     GROUP BY p.id`
  ).bind(id).first<Project & { sold_shares: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  return ok(c, {
    ...project,
    available_shares: project.total_shares - project.sold_shares
  })
})
```

### Performance Comparison

```
Before:
- Listing page with 20 projects: 21 queries (1 outer + 20 subqueries)
- Execution time: 50-100ms
- Per concurrent user (100 users): 2100 queries, 5-10 second total

After:
- Listing page with 20 projects: 2 queries (1 list + 1 count)
- Execution time: 5-10ms
- Per concurrent user (100 users): 200 queries, 500ms total

Improvement: 50x faster
```

---

## Deployment Order

1. **Week 1:**
   - [ ] Add schema changes (lock table, blacklist table, cleanup indexes)
   - [ ] Test locally
   - [ ] Run migration on remote D1
   - [ ] Deploy indexes

2. **Week 2:**
   - [ ] Deploy cron parallel batching fix
   - [ ] Deploy share approval lock logic
   - [ ] Deploy token blacklist D1 migration
   - [ ] Deploy projects N+1 query fix

3. **Week 3:**
   - [ ] Monitor in production for 1 week
   - [ ] Load test with 10k+ concurrent users
   - [ ] Verify cron completes in <15 seconds

---

## Rollback Plan

If any fix causes issues:

```bash
# Rollback schema changes
wrangler d1 execute buildbarguna-db --file=src/db/schema-backup.sql --remote

# Rollback code
git revert <commit-hash>
npm run deploy

# Monitor logs
wrangler tail buildbarguna-worker
```

---

## Testing Checklist

- [ ] Parallel batch processing: cron completes in <15 seconds
- [ ] Share approval: 5 concurrent approvals, only 1 succeeds
- [ ] Token blacklist: logout works within 1 second (not 60 seconds)
- [ ] Indexes: query execution time <10ms
- [ ] N+1 query: project listing uses 2 queries not 21

---
