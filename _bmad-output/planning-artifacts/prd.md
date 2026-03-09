---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'quick-prd-generation']
inputDocuments:
  - '_bmad-output/project-context.md'
workflowType: 'prd'
project_name: 'buildbarguna-cloudfare'
user_name: 'Rahmatullahzisan'
date: '2026-03-09'
classification:
  projectType: 'Feature Enhancement'
  domain: 'Fintech / Membership Platform'
  complexity: 'Medium'
  projectContext: 'Brownfield'
documentCounts:
  briefs: 0
  research: 0
  projectContext: 1
---

# Product Requirements Document

## Task & Point Wallet System

**Author:** Rahmatullahzisan  
**Date:** 2026-03-09  
**Status:** Draft  
**Project:** BuildBarguna Cloudflare

---

## 1. Executive Summary

BuildBarguna is a Bangladeshi membership platform where members invest in projects and receive profit distributions. This PRD defines the **Task & Point Wallet System** - a comprehensive feature allowing members to earn points by completing social media marketing tasks and convert those points to withdrawable cash.

### Key Objectives

1. **Engagement:** Increase member engagement through daily tasks
2. **Marketing:** Incentivize social media marketing for platform growth
3. **Rewards:** Provide transparent points-to-cash conversion mechanism
4. **Automation:** Minimize admin intervention with auto-verified task completion

---

## 2. Problem Statement

### Current State

BuildBarguna already has partial implementation:
- ✅ Database tables: `task_types`, `daily_tasks`, `task_completions`, `user_points`, `point_transactions`
- ✅ Admin routes: `/api/admin/tasks`, `/api/admin/task-types`
- ✅ Admin point adjustment: `/api/admin/users/:id/points/adjust`
- ✅ Leaderboard: `/api/points/leaderboard`
- ✅ Rewards system: `/api/rewards`

### Gaps Identified

| Gap | Impact |
|-----|--------|
| No member-facing task routes | Members cannot view or complete tasks |
| No timer verification | Tasks can be abused without verification |
| No point wallet | Points are tracked but not convertible to cash |
| No cash out mechanism | Members cannot withdraw earned points |
| No monthly settlement cron | Points don't automatically convert to withdrawable balance |

### User Pain Points

1. Members see "points" in their dashboard but cannot use them meaningfully
2. Admin must manually track and settle points (error-prone)
3. No incentive for members to help with marketing activities

---

## 3. User Stories

### 3.1 Member Stories

| ID | Story | Priority |
|----|-------|----------|
| M-01 | As a member, I want to see available tasks with point rewards so I can choose which to complete | High |
| M-02 | As a member, I want tasks to auto-complete after a timer so I earn points fairly | High |
| M-03 | As a member, I want to see my total points and task completion history | High |
| M-04 | As a member, I want a wallet showing my settled points that can be withdrawn | High |
| M-05 | As a member, I want to request cash out from my point wallet (min 200 points) | High |
| M-06 | As a member, I want to see one-time vs repeatable tasks separately | Medium |
| M-07 | As a member, I want to see daily task limits and remaining counts | Medium |

### 3.2 Admin Stories

| ID | Story | Priority |
|----|-------|----------|
| A-01 | As an admin, I want to create/edit/delete tasks with customizable points and timers | High |
| A-02 | As an admin, I want to set one-time vs repeatable tasks | High |
| A-03 | As an admin, I want to see all task completions with user details | High |
| A-04 | As an admin, I want to approve/reject point cash out requests | High |
| A-05 | As an admin, I want to adjust member points manually (already exists) | ✅ Done |
| A-06 | As an admin, I want to see point cash out history and status | Medium |

### 3.3 System Stories

| ID | Story | Priority |
|----|-------|----------|
| S-01 | System settles points to wallet monthly on 1st at 00:00 BD time | High |
| S-02 | System prevents duplicate task completions per day (per task cooldown) | High |
| S-03 | System enforces minimum 200 points for cash out | High |
| S-04 | System tracks point expiry (none - lifetime validity) | Medium |

---

## 4. Functional Requirements

### 4.1 Member Task System

#### 4.1.1 Task List View

**Endpoint:** `GET /api/tasks`

Returns available tasks for the authenticated member:
- Active tasks only (`is_active = 1`)
- Task details: title, platform, points, timer duration, daily limit
- Remaining count per task (limit - completions today)
- One-time status indicator

**Response Schema:**
```typescript
{
  success: true,
  data: {
    daily_tasks: [
      {
        id: number,
        title: string,
        platform: 'facebook' | 'youtube' | 'telegram' | 'other',
        destination_url: string,
        points: number,
        cooldown_seconds: number,
        is_one_time: boolean,
        completed_today: boolean,
        remaining_count: number  // daily_limit - completions today
      }
    ],
    one_time_tasks: [...], // same schema
    user_points: {
      available_points: number,
      lifetime_earned: number,
      monthly_earned: number
    }
  }
}
```

#### 4.1.2 Task Completion with Timer

**Endpoint:** `POST /api/tasks/:id/start`

Records task click and returns task details with timer info:
- Validates task exists and is active
- Checks daily limit not exceeded
- Checks if one-time task already completed
- Records `clicked_at` timestamp
- Returns task URL and required wait time

**Endpoint:** `POST /api/tasks/:id/complete`

Completes task after timer:
- Validates timer elapsed (clicked_at + cooldown_seconds < now)
- Creates `task_completion` record
- Updates `user_points`
- Creates `point_transaction` with type 'earned'
- Returns new point total

**Flow:**
```
User clicks task → POST /start → Returns { task_url, wait_seconds }
→ User redirected to external URL
→ Timer runs client-side
→ Timer completes → POST /complete → Points awarded
```

**Security Considerations:**
- Server validates timer with `clicked_at` timestamp
- Unique constraint: (user_id, task_id, task_date) prevents duplicates
- One-time tasks: check if completion exists ever

### 4.2 Point Wallet System

#### 4.2.1 Database Schema Changes

**New Table: `point_wallets`**

```sql
CREATE TABLE IF NOT EXISTS point_wallets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id),
  balance         INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_added  INTEGER NOT NULL DEFAULT 0,
  lifetime_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_settled_at TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_point_wallets_user ON point_wallets(user_id);
```

**New Table: `point_settlements`**

```sql
CREATE TABLE IF NOT EXISTS point_settlements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  month           TEXT NOT NULL,  -- YYYY-MM format
  points_settled  INTEGER NOT NULL,
  from_balance    INTEGER NOT NULL,  -- available_points before settlement
  to_wallet       INTEGER NOT NULL,  -- wallet balance after
  settled_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_point_settlements_user_month ON point_settlements(user_id, month);
```

**New Table: `point_withdrawals`**

```sql
CREATE TABLE IF NOT EXISTS point_withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_points   INTEGER NOT NULL CHECK(amount_points >= 200),  -- min 200
  amount_taka     INTEGER NOT NULL,  -- points to taka conversion
  bkash_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT,
  UNIQUE(user_id) WHERE status = 'pending'  -- one pending withdrawal per user
);

CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user ON point_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status ON point_withdrawals(status);
```

#### 4.2.2 Wallet Endpoints

**Get Wallet Balance:**
```
GET /api/wallet
Response: { balance, lifetime_added, lifetime_withdrawn, pending_withdrawals }
```

**Request Cash Out:**
```
POST /api/wallet/withdraw
Body: { amount_points, bkash_number }
Validates: 
  - amount >= 200
  - wallet balance >= amount
  - no pending withdrawal exists
  - valid bKash number (01[3-9]XXXXXXXX)
```

**Cash Out History:**
```
GET /api/wallet/withdrawals
Returns: paginated list of withdrawal requests
```

### 4.3 Admin Point Withdrawal Management

**List Pending Withdrawals:**
```
GET /api/admin/point-withdrawals?status=pending
```

**Approve Withdrawal:**
```
PATCH /api/admin/point-withdrawals/:id/approve
Body: { admin_note?: string }
Effects:
  - Updates status to 'approved'
  - Deducts from wallet balance
  - Updates lifetime_withdrawn
```

**Reject Withdrawal:**
```
PATCH /api/admin/point-withdrawals/:id/reject
Body: { admin_note: string }
Effects:
  - Updates status to 'rejected'
  - Member can request again
```

**Mark as Completed (Payment Sent):**
```
PATCH /api/admin/point-withdrawals/:id/complete
Body: { bkash_txid: string }
Effects:
  - Updates status to 'completed'
  - Records bKash transaction ID
```

### 4.4 Monthly Settlement Cron

**Cron Trigger:** 1st of every month at 00:00 Bangladesh time

**Existing Cron Configuration:**
```toml
[triggers]
crons = ["0 18 1 * *"]  -- 1st of month at BD midnight (UTC 18:00)
```

**Logic:**
```typescript
async function settlePointsToWallet(env: Bindings): Promise<void> {
  // 1. Find all users with available_points > 0
  // 2. For each user:
  //    a. Create point_wallets row if not exists
  //    b. Move available_points to wallet balance
  //    c. Reset available_points to 0
  //    d. Create point_settlements record
  //    e. Create point_transaction (type: 'settled_to_wallet')
  // 3. Log summary
}
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Task list load time | < 500ms |
| Task completion API | < 200ms |
| Wallet operations | < 300ms |
| Concurrent task completions | 100/second |

### 5.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Timer enforcement | Server-side validation with `clicked_at` |
| Duplicate prevention | UNIQUE constraint on (user_id, task_id, task_date) |
| Rate limiting | Existing KV-based rate limiting |
| Auth required | All endpoints use authMiddleware |
| Admin-only routes | adminMiddleware for admin endpoints |

### 5.3 Data Integrity

| Requirement | Implementation |
|-------------|---------------|
| Points accuracy | INTEGER paisa, never float |
| Settlement atomicity | Sequential DB operations with error handling |
| Audit trail | All transactions logged in point_transactions |
| No negative balances | CHECK constraints on all balance columns |

---

## 6. Technical Architecture

### 6.1 Backend Routes

| Route | File | Status |
|-------|------|--------|
| `/api/tasks` | `src/routes/tasks.ts` | NEW |
| `/api/wallet` | `src/routes/wallet.ts` | NEW |
| `/api/admin/point-withdrawals` | (add to `src/routes/admin.ts`) | NEW |

### 6.2 New Files to Create

```
src/
├── routes/
│   ├── tasks.ts          # NEW - Member task endpoints
│   └── wallet.ts         # NEW - Point wallet endpoints
├── cron/
│   └── settlements.ts     # NEW - Monthly settlement cron
└── db/
    └── migrations/
        └── 012_point_wallet_schema.sql  # NEW
```

### 6.3 Database Migration

**File:** `src/db/migrations/012_point_wallet_schema.sql`

---

## 7. API Endpoints Summary

### 7.1 Member Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List available tasks |
| POST | `/api/tasks/:id/start` | Start task timer |
| POST | `/api/tasks/:id/complete` | Complete task & earn points |
| GET | `/api/tasks/history` | Task completion history |
| GET | `/api/wallet` | Wallet balance |
| POST | `/api/wallet/withdraw` | Request cash out |
| GET | `/api/wallet/withdrawals` | Withdrawal history |

### 7.2 Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/point-withdrawals` | List withdrawals by status |
| PATCH | `/api/admin/point-withdrawals/:id/approve` | Approve withdrawal |
| PATCH | `/api/admin/point-withdrawals/:id/reject` | Reject withdrawal |
| PATCH | `/api/admin/point-withdrawals/:id/complete` | Mark as paid |

---

## 8. Frontend Components

### 8.1 Member Pages

```
frontend/src/pages/
├── Tasks.tsx           # Task list with categories
├── TaskDetail.tsx      # Task completion with timer
├── PointsHistory.tsx   # Point earning history
├── PointWallet.tsx     # Wallet & cash out
└── WithdrawalHistory.tsx # Withdrawal status
```

### 8.2 Admin Pages

```
frontend/src/pages/admin/
├── AdminPointWithdrawals.tsx  # Withdrawal approvals
└── AdminPointSettings.tsx     # Point configuration
```

---

## 9. Implementation Phases

### Phase 1: Member Task Routes (3-4 days)
1. Create `src/routes/tasks.ts`
2. Implement task list endpoint
3. Implement task start/complete with timer validation
4. Test timer enforcement
5. Frontend: Tasks page and task completion modal

### Phase 2: Point Wallet System (2-3 days)
1. Create database migration
2. Create `src/routes/wallet.ts`
3. Implement wallet balance endpoint
4. Implement cash out request
5. Frontend: Wallet page

### Phase 3: Admin Withdrawal Management (2 days)
1. Add admin endpoints to `src/routes/admin.ts`
2. Implement approval/rejection flow
3. Frontend: Admin withdrawals page

### Phase 4: Monthly Settlement Cron (1-2 days)
1. Create `src/cron/settlements.ts`
2. Implement settlement logic
3. Integrate with existing cron schedule
4. Test with manual trigger

### Phase 5: Testing & Polish (2-3 days)
1. Unit tests for point calculations
2. Integration tests for workflows
3. E2E tests for user journeys
4. Error handling edge cases
5. Performance optimization

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Daily active task completers | +30% baseline |
| Points earned per user | Track average |
| Cash out requests | Track volume |
| Settlement success rate | 99.9% |
| Task completion rate | >80% started → completed |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Task abuse (fake completions) | High | Server-side timer validation, IP tracking |
| High withdrawal volume | Medium | Minimum 200 points, admin approval queue |
| Settlement failures | High | Idempotent operations, error logging |
| Performance at scale | Medium | Indexed queries, rate limiting |
| Fraud (multiple accounts) | High | Phone verification (existing), device fingerprinting (future) |

---

## 12. Open Questions

1. **Settlement timing:** Currently set to 1st of month. Should this be configurable?
2. **Point expiry:** Currently lifetime. Should points expire after X months?
3. **Task categories:** Should we add more granular categories beyond platform?
4. **Fraud detection:** Need for automated fraud detection system?
5. **Point purchasing:** Should members be able to purchase points directly?

---

## 13. Appendix

### A. Point Calculation Rules

- 100 points = 100 taka (1:1 rate per 100 points)
- Minimum withdrawal: 200 points = 200 taka
- Points lifetime validity (no expiry)
- Settlement happens monthly automatically

### B. Task Completion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User sees  │     │  User clicks │     │  Timer runs │
│  task list  │────>│  Start Task  │────>│  (client)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           v                    v
                    ┌─────────────┐     ┌─────────────┐
                    │ POST /start │     │ POST /complete│
                    │ clicked_at │     │ Validate    │
                    └─────────────┘     │ + Award pts │
                                        └─────────────┘
```

### C. Settlement Flow

```
┌────────────────┐
│  Month End     │
│  (1st at 00:00)│
└───────┬────────┘
        │
        v
┌────────────────┐
│ Cron Triggered │
│ settlePoints() │
└───────┬────────┘
        │
        v
┌────────────────┐     ┌────────────────┐
│ For each user  │────>│ available_pts  │
│ with points>0  │     │ → wallet       │
└────────────────┘     └────────────────┘
        │
        v
┌────────────────┐
│ Log settlement │
│ Create record  │
└────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-09  
**Status:** Ready for Review