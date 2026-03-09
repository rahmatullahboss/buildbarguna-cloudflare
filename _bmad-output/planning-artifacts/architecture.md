---
stepsCompleted: ['step-01-init', 'quick-architecture-generation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/project-context.md'
workflowType: 'architecture'
project_name: 'buildbarguna-cloudfare'
user_name: 'Rahmatullahzisan'
date: '2026-03-09'
---

# Architecture Decision Document

## Task & Point Wallet System

**Author:** Rahmatullahzisan  
**Date:** 2026-03-09  
**Status:** Draft  
**Based On:** PRD v1.0

---

## 1. System Overview

### 1.1 Feature Summary

The Task & Point Wallet System extends BuildBarguna with:
- Member-facing task completion with timer verification
- Point wallet for monthly settlement tracking
- Cash withdrawal from wallet to bKash
- Monthly automated settlement cron

### 1.2 Architecture Goals

| Goal | Description |
|------|-------------|
| Consistency | Follow existing patterns from `project-context.md` |
| Integration | Seamlessly extend existing tables and routes |
| Performance | Sub-500ms API responses |
| Security | Server-side timer validation, prevent abuse |
| Simplicity | Minimal new infrastructure, leverage D1 |

---

## 2. High-Level Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Tasks.tsx  │  PointWallet.tsx  │  AdminWithdrawals.tsx        │
└───────┬─────────────┬─────────────────────┬────────────────────┘
        │             │                     │
        │ /api/tasks  │ /api/wallet         │ /api/admin/point-withdrawals
        ▼             ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker (Hono)                      │
├─────────────────────────────────────────────────────────────────┤
│  authMiddleware ─► routes/tasks.ts                              │
│  authMiddleware ─► routes/wallet.ts                              │
│  authMiddleware ─► adminMiddleware ─► admin.ts (extensions)     │
└───────┬─────────────────────┬───────────────────────────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────────────────────────────┐
│  D1 Database  │     │  Cron Trigger (monthly)               │
│  (SQLite)     │     │  ─► settlePointsToWallet()            │
│               │     └───────────────────────────────────────┘
│  Existing:    │
│  - users      │     ┌───────────────────────────────────────┐
│  - daily_tasks│     │  KV (SESSIONS)                        │
│  - task_*     │     │  - Rate limiting (existing)           │
│  - user_points│     └───────────────────────────────────────┘
│  - point_*    │
│               │
│  NEW:         │
│  - point_wallets
│  - point_settlements
│  - point_withdrawals
└───────────────┘
```

### 2.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    MEMBER TASK FLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. GET /api/tasks                                               │
│     └─► Returns daily_tasks + one_time_tasks                     │
│     └─► Shows remaining_count per task                           │
│                                                                  │
│  2. POST /api/tasks/:id/start                                    │
│     └─► Creates task_start_sessions (clicked_at)                 │
│     └─► Returns destination_url + wait_seconds                   │
│     └─► User visits external URL (client-side timer)              │
│                                                                  │
│  3. POST /api/tasks/:id/complete                                 │
│     └─► Validates timer (clicked_at + cooldown < now)            │
│     └─► Creates task_completion (UNIQUE per user/task/date)      │
│     └─► Updates user_points.available_points                     │
│     └─► Creates point_transaction (type: 'earned')               │
│     └─► Returns new point total                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    WALLET FLOW                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Monthly Cron (1st, 00:00 BD time)                            │
│     └─► For each user with available_points > 0                  │
│     └─► Move points to point_wallets.balance                     │
│     └─► Reset available_points to 0                              │
│     └─► Create point_settlements record                          │
│                                                                  │
│  2. GET /api/wallet                                              │
│     └─► Returns wallet balance + pending_withdrawals             │
│                                                                  │
│  3. POST /api/wallet/withdraw                                    │
│     └─► Validates amount >= 200, balance >= amount               │
│     └─► Creates point_withdrawals (status: 'pending')            │
│     └─► Returns withdrawal_id                                     │
│                                                                  │
│  4. Admin: PATCH /admin/point-withdrawals/:id/approve            │
│     └─► Status: 'approved', deduct from wallet                   │
│                                                                  │
│  5. Admin: PATCH /admin/point-withdrawals/:id/complete           │
│     └─► Status: 'completed', record bkash_txid                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Architecture

### 3.1 Existing Tables (Leveraged)

| Table | Usage |
|-------|-------|
| `users` | User authentication, phone validation |
| `daily_tasks` | Task definitions (already exists) |
| `task_types` | Task type categories (already exists) |
| `task_completions` | Task completion records (already exists) |
| `user_points` | Running point totals (already exists) |
| `point_transactions` | Transaction log (already exists) |

### 3.2 New Tables

#### `task_start_sessions`

Tracks timer verification for task starts.

```sql
CREATE TABLE IF NOT EXISTS task_start_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  task_id       INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  session_date  TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(user_id, task_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_task_start_sessions_user_date 
  ON task_start_sessions(user_id, session_date);
```

**Key Decision:** Separate table from `task_completions` because:
- Start can happen without completion (abandoned tasks)
- Timer validation requires `clicked_at` timestamp
- Cleanup old sessions daily via cron

#### `point_wallets`

Wallet balance for settled points.

```sql
CREATE TABLE IF NOT EXISTS point_wallets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id),
  balance           INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_added    INTEGER NOT NULL DEFAULT 0,
  lifetime_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_settled_at   TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_point_wallets_user ON point_wallets(user_id);
```

**Key Decision:** Separate from `user_points` because:
- Settlement timing differs (monthly vs real-time)
- Different business rules (withdrawal vs earning)
- Clear audit trail

#### `point_settlements`

Audit trail of monthly settlements.

```sql
CREATE TABLE IF NOT EXISTS point_settlements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  month           TEXT NOT NULL,
  points_settled  INTEGER NOT NULL,
  from_balance    INTEGER NOT NULL,
  to_wallet       INTEGER NOT NULL,
  settled_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_point_settlements_user_month 
  ON point_settlements(user_id, month);
```

#### `point_withdrawals`

Withdrawal requests from wallet.

```sql
CREATE TABLE IF NOT EXISTS point_withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_points   INTEGER NOT NULL CHECK(amount_points >= 200),
  amount_taka     INTEGER NOT NULL,
  bkash_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user 
  ON point_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status 
  ON point_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user_pending 
  ON point_withdrawals(user_id) WHERE status = 'pending';
```

**Key Decision:** Similar pattern to existing `withdrawals` table:
- Same status flow (pending → approved → completed)
- Same admin approval process
- Reuse `bkash_number` validation

### 3.3 Schema Relationships

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │     │  daily_tasks │     │   task_types     │
│              │     │              │     │                  │
│ id           │◄────┤ task_type_id │────►│ id               │
│ phone        │     │ id           │     │ base_points      │
│ role         │     │ points       │     │ cooldown_seconds │
└──────┬───────┘     │ cooldown_sec │     └──────────────────┘
       │             │ daily_limit  │
       │             │ is_one_time  │
       │             └──────┬───────┘
       │                    │
       │     ┌──────────────┴───────────────┐
       │     │                              │
       ▼     ▼                              ▼
┌──────────────────┐             ┌────────────────────┐
│task_start_sessions│            │  task_completions  │
│                  │             │                    │
│ user_id ────────►│             │ user_id ──────────►│
│ task_id ────────►│             │ task_id ──────────►│
│ clicked_at       │             │ completed_at       │
│ session_date     │             │ points_earned      │
└──────────────────┘             │ task_date          │
                                 └─────────┬──────────┘
                                           │
       ┌───────────────────────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  user_points │────►│point_transactions│     │point_settlements │
│              │     │                  │     │                  │
│ available_pts│     │ transaction_type │     │ month            │
│ lifetime_*   │     │ points           │     │ points_settled  │
│ monthly_*    │     │ month_year       │     │ from_balance     │
└──────────────┘     └──────────────────┘     └────────┬─────────┘
                                                      │
       ┌──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐     ┌────────────────────┐
│  point_wallets   │────►│ point_withdrawals  │
│                  │     │                    │
│ balance          │     │ amount_points      │
│ lifetime_added   │     │ status            │
│ lifetime_withdrawn│    │ bkash_number      │
└──────────────────┘     └────────────────────┘
```

---

## 4. API Design

### 4.1 Member Endpoints

#### `GET /api/tasks`

Retrieve available tasks for the authenticated user.

**Response:**
```typescript
{
  success: true,
  data: {
    daily_tasks: Array<{
      id: number
      title: string
      platform: 'facebook' | 'youtube' | 'telegram' | 'other'
      destination_url: string
      points: number
      cooldown_seconds: number
      is_one_time: boolean
      completed_today: boolean
      completed_ever: boolean  // for one-time tasks
      remaining_count: number
    }>,
    one_time_tasks: Array<{...}>,  // same structure, is_one_time = true
    user_points: {
      available_points: number
      lifetime_earned: number
      monthly_earned: number
    }
  }
}
```

**Implementation Notes:**
- Query `daily_tasks` WHERE `is_active = 1`
- LEFT JOIN `task_completions` for today's date
- Calculate `remaining_count = daily_limit - COUNT(completions today)`
- Split results by `is_one_time` flag

---

#### `POST /api/tasks/:id/start`

Start a task timer.

**Request Body:** None (user_id from JWT)

**Response:**
```typescript
{
  success: true,
  data: {
    task_id: number
    destination_url: string
    wait_seconds: number
    started_at: string  // ISO timestamp
  }
}
```

**Validation:**
1. Task exists and `is_active = 1`
2. For daily tasks: `remaining_count > 0`
3. For one-time tasks: not already completed (`completed_ever = false`)
4. No existing session with `clicked_at` within cooldown

**Implementation:**
```typescript
// 1. Check task validity
const task = await c.env.DB.prepare(
  'SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1'
).bind(taskId).first()

if (!task) return err(c, 'Task not found', 404)

// 2. Check daily limit (for daily tasks)
if (!task.is_one_time) {
  const todayCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM task_completions 
     WHERE user_id = ? AND task_id = ? AND task_date = date('now')`
  ).bind(userId, taskId).first()
  
  if (todayCount.count >= task.daily_limit) {
    return err(c, 'Daily limit reached', 400)
  }
}

// 3. Check one-time completion
if (task.is_one_time) {
  const everCompleted = await c.env.DB.prepare(
    'SELECT id FROM task_completions WHERE user_id = ? AND task_id = ?'
  ).bind(userId, taskId).first()
  
  if (everCompleted) return err(c, 'One-time task already completed', 400)
}

// 4. Create session (INSERT OR REPLACE for idempotency)
await c.env.DB.prepare(
  `INSERT INTO task_start_sessions (user_id, task_id, clicked_at, session_date)
   VALUES (?, ?, datetime('now'), date('now'))
   ON CONFLICT(user_id, task_id, session_date) 
   DO UPDATE SET clicked_at = datetime('now')`
).bind(userId, taskId).run()

// 5. Return task info
return ok(c, {
  task_id: taskId,
  destination_url: task.destination_url,
  wait_seconds: task.cooldown_seconds,
  started_at: new Date().toISOString()
})
```

---

#### `POST /api/tasks/:id/complete`

Complete a task and earn points.

**Request Body:** None

**Response:**
```typescript
{
  success: true,
  data: {
    points_earned: number
    total_points: number
    completed_at: string
  }
}
```

**Validation:**
1. Session exists with `clicked_at`
2. `clicked_at + cooldown_seconds <= now`
3. All limits still valid (re-check to prevent race conditions)

**Implementation:**
```typescript
// 1. Get session
const session = await c.env.DB.prepare(
  `SELECT * FROM task_start_sessions 
   WHERE user_id = ? AND task_id = ? AND session_date = date('now')`
).bind(userId, taskId).first()

if (!session) {
  return err(c, 'Task not started. Call /start first.', 400)
}

// 2. Get task
const task = await c.env.DB.prepare(
  'SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1'
).bind(taskId).first()

if (!task) return err(c, 'Task not found', 404)

// 3. Validate timer
const clickedTime = new Date(session.clicked_at).getTime()
const now = Date.now()
const elapsedSeconds = (now - clickedTime) / 1000

if (elapsedSeconds < task.cooldown_seconds) {
  return err(c, `Wait ${task.cooldown_seconds - elapsedSeconds}s more`, 400)
}

// 4. Re-check limits (prevent race conditions)
// ... same validation as /start

// 5. Create completion (UNIQUE constraint prevents duplicates)
try {
  await c.env.DB.prepare(
    `INSERT INTO task_completions (user_id, task_id, clicked_at, completed_at, task_date, points_earned)
     VALUES (?, ?, ?, datetime('now'), date('now'), ?)`
  ).bind(userId, taskId, session.clicked_at, task.points).run()
} catch (e) {
  // UNIQUE constraint violation
  return err(c, 'Task already completed', 409)
}

// 6. Update user points
await c.env.DB.prepare(
  `UPDATE user_points SET 
     available_points = available_points + ?,
     lifetime_earned = lifetime_earned + ?,
     monthly_earned = monthly_earned + ?,
     updated_at = datetime('now')
   WHERE user_id = ?`
).bind(task.points, task.points, task.points, userId).run()

// 7. Create transaction record
await c.env.DB.prepare(
  `INSERT INTO point_transactions (user_id, task_id, points, transaction_type, description, month_year)
   VALUES (?, ?, ?, 'earned', ?, strftime('%Y-%m', 'now'))`
).bind(userId, taskId, task.points, `Completed: ${task.title}`).run()

// 8. Get new total
const userPoints = await c.env.DB.prepare(
  'SELECT available_points FROM user_points WHERE user_id = ?'
).bind(userId).first()

return ok(c, {
  points_earned: task.points,
  total_points: userPoints.available_points,
  completed_at: new Date().toISOString()
})
```

---

#### `GET /api/wallet`

Get wallet balance and pending withdrawals.

**Response:**
```typescript
{
  success: true,
  data: {
    wallet: {
      balance: number
      lifetime_added: number
      lifetime_withdrawn: number
      last_settled_at: string | null
    },
    pending_withdrawals: Array<{
      id: number
      amount_points: number
      amount_taka: number
      requested_at: string
    }>,
    available_for_withdrawal: number  // balance - pending
  }
}
```

---

#### `POST /api/wallet/withdraw`

Request cash withdrawal.

**Request Body:**
```typescript
{
  amount_points: number  // must be >= 200
  bkash_number: string   // 01[3-9]XXXXXXXX
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    withdrawal_id: number
    amount_points: number
    amount_taka: number
    status: 'pending'
    requested_at: string
  }
}
```

---

### 4.2 Admin Endpoints

#### `GET /api/admin/point-withdrawals`

List withdrawal requests by status.

**Query Parameters:**
- `status`: 'pending' | 'approved' | 'completed' | 'rejected'
- `page`: number (default 1)
- `limit`: number (default 20, max 100)

---

#### `PATCH /api/admin/point-withdrawals/:id/approve`

Approve a withdrawal request.

**Effects:**
1. Status → 'approved'
2. Deduct from `point_wallets.balance`
3. Update `lifetime_withdrawn`

---

#### `PATCH /api/admin/point-withdrawals/:id/reject`

Reject a withdrawal request.

**Effects:**
1. Status → 'rejected'
2. User can request again

---

#### `PATCH /api/admin/point-withdrawals/:id/complete`

Mark withdrawal as completed after bKash transfer.

**Request Body:**
```typescript
{
  bkash_txid: string  // bKash transaction ID
}
```

---

## 5. Cron Job Design

### 5.1 Monthly Settlement

**File:** `src/cron/settlements.ts`

```typescript
export async function settlePointsToWallet(env: Bindings): Promise<{
  success: boolean
  users_settled: number
  total_points: number
  errors: string[]
}> {
  const errors: string[] = []
  let usersSettled = 0
  let totalPoints = 0
  
  try {
    // 1. Find all users with available_points > 0
    const users = await env.DB.prepare(
      `SELECT user_id, available_points 
       FROM user_points 
       WHERE available_points > 0`
    ).all()
    
    // 2. Process each user
    for (const row of users.results) {
      const { user_id, available_points } = row as { user_id: number; available_points: number }
      
      try {
        // 2a. Get or create wallet
        await env.DB.prepare(
          `INSERT INTO point_wallets (user_id, balance, lifetime_added)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET 
             balance = balance + ?,
             lifetime_added = lifetime_added + ?,
             updated_at = datetime('now')`
        ).bind(user_id, available_points, available_points, available_points, available_points).run()
        
        // 2b. Get wallet balance after update
        const wallet = await env.DB.prepare(
          'SELECT balance FROM point_wallets WHERE user_id = ?'
        ).bind(user_id).first<{ balance: number }>()
        
        // 2c. Reset available_points
        await env.DB.prepare(
          `UPDATE user_points SET 
             available_points = 0,
             monthly_earned = 0,
             monthly_redeemed = 0,
             updated_at = datetime('now')
           WHERE user_id = ?`
        ).bind(user_id).run()
        
        // 2d. Create settlement record
        const month = new Date().toISOString().slice(0, 7) // YYYY-MM
        await env.DB.prepare(
          `INSERT INTO point_settlements (user_id, month, points_settled, from_balance, to_wallet)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(user_id, month, available_points, available_points, wallet!.balance).run()
        
        // 2e. Create transaction
        await env.DB.prepare(
          `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year)
           VALUES (?, ?, 'settled_to_wallet', 'Monthly settlement to wallet', ?)`
        ).bind(user_id, available_points, month).run()
        
        usersSettled++
        totalPoints += available_points
        
      } catch (e) {
        errors.push(`User ${user_id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    
  } catch (e) {
    errors.push(`Fatal: ${e instanceof Error ? e.message : 'Unknown error'}`)
    return { success: false, users_settled: 0, total_points: 0, errors }
  }
  
  console.log(`[Settlement] Settled ${totalPoints} points for ${usersSettled} users`)
  
  return {
    success: true,
    users_settled: usersSettled,
    total_points: totalPoints,
    errors
  }
}
```

### 5.2 Integration with Existing Cron

**File:** `src/index.ts`

```typescript
import { settlePointsToWallet } from './cron/settlements'

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([
      distributeMonthlyEarnings(env),
      cleanupTokenBlacklist(env),
      settlePointsToWallet(env)  // NEW
    ]))
  }
}
```

---

## 6. Security Decisions

### 6.1 Timer Enforcement

**Decision:** Server-side validation using `task_start_sessions.clicked_at`

**Rationale:**
- Client-side timers can be bypassed
- `clicked_at` stored in database
- Validation: `clicked_at + cooldown_seconds <= now`
- Prevents replay attacks with UNIQUE constraint

**Alternative Rejected:** Client-side only
- Easy to bypass with browser dev tools
- No audit trail

### 6.2 Duplicate Prevention

**Mechanism:** UNIQUE constraints in database

```sql
-- task_completions: one per user/task/day
UNIQUE(user_id, task_id, task_date)

-- task_start_sessions: one per user/task/day
UNIQUE(user_id, task_id, session_date)

-- point_withdrawals: one pending per user
UNIQUE(user_id) WHERE status = 'pending'
```

### 6.3 Rate Limiting

**Existing implementation in `src/lib/constants.ts`:**

```typescript
export const RATE_LIMITS = {
  TASK_START: { MAX_REQUESTS: 60, WINDOW_SECONDS: 60 },
  TASK_COMPLETE: { MAX_REQUESTS: 60, WINDOW_SECONDS: 60 },
  WALLET_WITHDRAW: { MAX_REQUESTS: 5, WINDOW_SECONDS: 3600 },
}
```

### 6.4 Auth & Authorization

| Endpoint | Auth | Admin |
|----------|------|-------|
| `/api/tasks/*` | Required | No |
| `/api/wallet/*` | Required | No |
| `/api/admin/point-withdrawals/*` | Required | Yes |

---

## 7. Type Definitions

### 7.1 New Types (Add to `src/types.ts`)

```typescript
// Task Start Session
export type TaskStartSession = {
  id: number
  user_id: number
  task_id: number
  clicked_at: string
  session_date: string
}

// Task List Item (API response)
export type TaskListItem = {
  id: number
  title: string
  platform: 'facebook' | 'youtube' | 'telegram' | 'other'
  destination_url: string
  points: number
  cooldown_seconds: number
  is_one_time: boolean
  completed_today: boolean
  completed_ever: boolean
  remaining_count: number
}

// Task List Response
export type TaskListResponse = {
  daily_tasks: TaskListItem[]
  one_time_tasks: TaskListItem[]
  user_points: {
    available_points: number
    lifetime_earned: number
    monthly_earned: number
  }
}

// Point Wallet
export type PointWallet = {
  id: number
  user_id: number
  balance: number
  lifetime_added: number
  lifetime_withdrawn: number
  last_settled_at: string | null
  updated_at: string
}

// Point Settlement
export type PointSettlement = {
  id: number
  user_id: number
  month: string
  points_settled: number
  from_balance: number
  to_wallet: number
  settled_at: string
}

// Point Withdrawal
export type PointWithdrawal = {
  id: number
  user_id: number
  amount_points: number
  amount_taka: number
  bkash_number: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  admin_note: string | null
  approved_by: number | null
  requested_at: string
  processed_at: string | null
}

// Withdrawal with User (Admin view)
export type PointWithdrawalWithUser = PointWithdrawal & {
  user_name: string
  user_phone: string
}
```

---

## 8. Frontend Integration

### 8.1 API Module Updates

**File:** `frontend/src/lib/api.ts`

```typescript
// Add to existing tasksApi
export const tasksApi = {
  list: () => 
    fetchJSON<{ success: true; data: TaskListResponse }>(`${API_BASE}/tasks`),
  
  start: (taskId: number) =>
    fetchJSON<{ success: true; data: { task_id: number; destination_url: string; wait_seconds: number } }>(
      `${API_BASE}/tasks/${taskId}/start`, 
      { method: 'POST' }
    ),
  
  complete: (taskId: number) =>
    fetchJSON<{ success: true; data: { points_earned: number; total_points: number } }>(
      `${API_BASE}/tasks/${taskId}/complete`,
      { method: 'POST' }
    ),
  
  history: (page = 1) =>
    fetchJSON<{ success: true; data: PaginatedResponse<TaskCompletion> }>(
      `${API_BASE}/tasks/history?page=${page}`
    ),
}

// Add new walletApi
export const walletApi = {
  get: () =>
    fetchJSON<{ success: true; data: { wallet: PointWallet; pending_withdrawals: PointWithdrawal[]; available_for_withdrawal: number } }>(
      `${API_BASE}/wallet`
    ),
  
  withdraw: (amount_points: number, bkash_number: string) =>
    fetchJSON<{ success: true; data: { withdrawal_id: number; amount_points: number; amount_taka: number } }>(
      `${API_BASE}/wallet/withdraw`,
      { 
        method: 'POST',
        body: JSON.stringify({ amount_points, bkash_number })
      }
    ),
  
  history: (page = 1) =>
    fetchJSON<{ success: true; data: PaginatedResponse<PointWithdrawal> }>(
      `${API_BASE}/wallet/withdrawals?page=${page}`
    ),
}
```

### 8.2 Route Updates

**File:** `frontend/src/App.tsx`

```tsx
// Add new routes
<Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
<Route path="/wallet" element={<ProtectedRoute><Layout><PointWallet /></Layout></ProtectedRoute>} />
<Route path="/admin/point-withdrawals" element={<AdminRoute><Layout><AdminPointWithdrawals /></Layout></AdminRoute>} />
```

---

## 9. Migration Plan

### 9.1 Migration File

**File:** `src/db/migrations/012_point_wallet_schema.sql`

```sql
-- Migration: Point Wallet System
-- Version: 012
-- Date: 2026-03-09
-- Description: Add task start sessions, point wallets, settlements, and withdrawals

-- ============================================================
-- 1. TASK START SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS task_start_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  task_id       INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  session_date  TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(user_id, task_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_task_start_sessions_user_date 
  ON task_start_sessions(user_id, session_date);

-- ============================================================
-- 2. POINT WALLETS
-- ============================================================

CREATE TABLE IF NOT EXISTS point_wallets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id),
  balance           INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_added    INTEGER NOT NULL DEFAULT 0,
  lifetime_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_settled_at   TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_point_wallets_user ON point_wallets(user_id);

-- ============================================================
-- 3. POINT SETTLEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS point_settlements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  month           TEXT NOT NULL,
  points_settled  INTEGER NOT NULL,
  from_balance    INTEGER NOT NULL,
  to_wallet       INTEGER NOT NULL,
  settled_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_point_settlements_user_month 
  ON point_settlements(user_id, month);

-- ============================================================
-- 4. POINT WITHDRAWALS
-- ============================================================

CREATE TABLE IF NOT EXISTS point_withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_points   INTEGER NOT NULL CHECK(amount_points >= 200),
  amount_taka     INTEGER NOT NULL,
  bkash_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user 
  ON point_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status 
  ON point_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user_pending 
  ON point_withdrawals(user_id) WHERE status = 'pending';

-- ============================================================
-- 5. POINT SETTINGS (Configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS point_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO point_settings (key, value) VALUES
  ('min_cashout_points', '200'),
  ('points_to_taka_rate', '1');  -- 100 points = 100 taka

-- ============================================================
-- 6. ADD TRANSACTION TYPE
-- ============================================================

-- Note: SQLite doesn't support ALTER TYPE for CHECK constraints
-- The existing point_transactions.transaction_type already allows 'settled_to_wallet'
-- as it's just a TEXT field with CHECK constraint
-- If needed, we can add a migration to update the CHECK constraint
-- But for now, 'settled_to_wallet' will work with the existing schema
```

### 9.2 Migration Commands

```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate:remote
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File:** `src/lib/points.unit.test.ts`

```typescript
describe('Point Calculations', () => {
  it('should convert points to taka correctly', () => {
    expect(pointsToTaka(100)).toBe(100)
    expect(pointsToTaka(200)).toBe(200)
    expect(pointsToTaka(150)).toBe(150)  -- No rounding
  })
  
  it('should validate minimum withdrawal', () => {
    expect(isValidWithdrawal(199)).toBe(false)
    expect(isValidWithdrawal(200)).toBe(true)
  })
})
```

### 10.2 Integration Tests

**File:** `src/routes/tasks.unit.test.ts`

```typescript
describe('Task Completion Flow', () => {
  it('should prevent completion without start', async () => {
    // Call complete without start
    // Expect 400 error
  })
  
  it('should prevent completion before timer', async () => {
    // Start task
    // Immediately call complete
    // Expect 400 error
  })
  
  it('should award points after timer', async () => {
    // Start task
    // Wait cooldown_seconds
    // Complete task
    // Expect points_earned in response
    // Verify user_points increased
  })
  
  it('should prevent duplicate completions', async () => {
    // Complete task once
    // Try to complete again
    // Expect 409 conflict
  })
})
```

### 10.3 E2E Tests

**File:** `frontend/e2e/tasks.spec.ts`

```typescript
test('Task completion flow', async ({ page }) => {
  await page.goto('/tasks')
  
  // Click start task
  await page.click('[data-testid="start-task-1"]')
  
  // Verify redirect to external URL
  // Note: This would be mocked in E2E
  
  // Complete task after timer
  await page.click('[data-testid="complete-task-1"]')
  
  // Verify points earned message
  await expect(page.locator('[data-testid="points-earned"]')).toBeVisible()
})
```

---

## 11. Deployment Checklist

### 11.1 Pre-Deployment

- [ ] Run migration locally and verify schema
- [ ] Run all unit tests: `npm run test:unit`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify wrangler.toml cron configuration
- [ ] Test settlement cron locally with manual trigger

### 11.2 Deployment Steps

```bash
# 1. Deploy database migration
npm run db:migrate:remote

# 2. Deploy worker
npm run deploy

# 3. Verify health check
curl https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/health

# 4. Test new endpoints
curl -X GET https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/tasks \
  -H "Authorization: Bearer <token>"
```

### 11.3 Post-Deployment

- [ ] Verify `/api/tasks` returns task list
- [ ] Verify `/api/wallet` returns wallet balance
- [ ] Test complete task flow in production
- [ ] Monitor Cloudflare Worker logs for errors
- [ ] Verify cron job runs on 1st of month

---

## 12. Open Decisions

| Decision | Options | Recommendation |
|----------|---------|---------------|
| Timer validation strictness | Server-side only | Server-side with `clicked_at` |
| Session cleanup | Cron job daily | Add to existing cleanup cron |
| Point expiry | Lifetime vs Monthly | Lifetime (per PRD) |
| Fraud detection | Manual vs Automated | Start manual, add automated later |

---

## 13. Future Enhancements

1. **Task Categories:** Add more granular categories beyond platform
2. **Fraud Detection:** IP-based rate limiting, device fingerprinting
3. **Task Suggestions:** ML-based task recommendations
4. **Leaderboard Integration:** Real-time point rankings
5. **Point Purchase:** Allow buying points directly
6. **Referral Bonus:** Points for inviting new members

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-09  
**Status:** Ready for Implementation