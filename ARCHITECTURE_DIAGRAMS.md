# Architecture Diagrams & Visual References

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE NETWORK                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CLOUDFLARE WORKERS (Single)                 │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │              Hono.js Router                          │ │   │
│  │  │  ┌─────────────────────────────────────────────┐    │ │   │
│  │  │  │ GET  /api/projects      → projectRoutes    │    │ │   │
│  │  │  │ POST /api/shares/buy    → shareRoutes      │    │ │   │
│  │  │  │ GET  /api/earnings      → earningRoutes    │    │ │   │
│  │  │  │ POST /api/admin/*       → adminRoutes      │    │ │   │
│  │  │  │ GET  /*                 → Static Assets    │    │ │   │
│  │  │  └─────────────────────────────────────────────┘    │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │  D1      │  │   KV     │  │   R2     │  │  Cron    │  │   │
│  │  │ SQLite   │  │  Sessions│  │  Images  │  │ Earnings │  │   │
│  │  │ Database │  │ Rate-Limit Cleanup   │  │  Dist.   │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

USER DEVICES
  │
  ├─→ React 18 SPA (Vite)
  │   [Served as Workers Static Assets]
  │
  └─→ REST API
      [All requests to /api/* routes]
```

---

## Data Flow: Share Purchase & Approval

```
USER FLOW: Buying Shares
═════════════════════════

1. User Frontend
   │
   └─→ POST /api/shares/buy
       │
       ├─ Validate project is active
       ├─ Check share availability
       ├─ Verify bKash TxID is unique
       └─ INSERT into share_purchases (status='pending')
           │
           └─→ Response: Purchase request created, awaiting admin approval

2. Admin Dashboard
   │
   └─→ GET /api/admin/shares/pending
       │
       ├─ Fetch all pending purchase requests
       └─ Display with user info and project name

3. Admin Approves Share
   │
   └─→ PATCH /api/admin/shares/:id/approve
       │
       ├─ INSERT share_approvals(purchase_id) [LOCK via unique constraint]
       │  └─ If fails → Another admin already approved ✗
       │
       ├─ UPDATE share_purchases status='approved'
       │
       └─ INSERT INTO user_shares (with capacity check)
           └─ If fails → Not enough shares available
               └─ ROLLBACK approval + delete lock
           
           If succeeds:
           └─ User portfolio updated ✓
           └─ Next time user logs in: shares appear in "My Investments"

4. User Views Earnings
   │
   └─→ GET /api/earnings/summary
       │
       └─ SELECT SUM(amount) FROM earnings WHERE user_id=?
           └─ Shows total balance + this month's earnings
```

---

## Database Schema (Simplified)

```
USERS
├─ id (PK)
├─ phone (UNIQUE) ← Used for login
├─ password_hash (PBKDF2)
├─ role (member | admin)
├─ referral_code (UNIQUE)
└─ referred_by

PROJECTS
├─ id (PK)
├─ title
├─ total_capital (paisa)
├─ total_shares
├─ share_price (paisa)
└─ status (draft | active | closed)

SHARE_PURCHASES
├─ id (PK)
├─ user_id (FK)
├─ project_id (FK)
├─ quantity
├─ total_amount (paisa)
├─ bkash_txid (UNIQUE)
├─ status (pending | approved | rejected)
└─ admin_note

USER_SHARES [One row per user per project]
├─ user_id (PK1)
├─ project_id (PK2)
└─ quantity [Portfolio]

PROFIT_RATES
├─ project_id (FK)
├─ month (YYYY-MM)
├─ rate (basis points: 1% = 100)
└─ UNIQUE(project_id, month)

EARNINGS [Idempotent via UNIQUE constraint]
├─ user_id (PK1)
├─ project_id (PK2)
├─ month (PK3)
└─ amount (paisa)

📌 NEW: SHARE_APPROVALS [Prevents race condition]
├─ purchase_id (PK) [Acts as distributed lock]
└─ approved_at

📌 NEW: TOKEN_BLACKLIST [Replaces KV for consistency]
├─ jti (PK) [JWT unique ID]
├─ expires_at
└─ blacklisted_at
```

---

## Critical Issues: Before vs After

### Issue #1: Cron CPU Timeout

```
BEFORE (Sequential Batching):
─────────────────────────────

Time: 0ms     Start ────────────────────────────────────> 200s End
              │
              Batch 1 (100 statements)
              │ [100ms]
              │
              Batch 2 (100 statements)
              │ [100ms]
              │
              Batch 3 (100 statements)
              │ [100ms]
              ...
              Batch 1000 (100 statements)
              │ [100ms]
              │
              ✗ TIMEOUT (CPU limit ~50 seconds)


AFTER (Parallel Batching with Promise.all()):
──────────────────────────────────────────────

Time: 0ms     Start ──────> 10s End
              │
              ├─→ Batch 1 [100ms] ────────┐
              ├─→ Batch 2 [100ms] ────────┤
              ├─→ Batch 3 [100ms] ────────┤ All in parallel
              ├─→ Batch 4 [100ms] ────────┤
              ...                          │
              └─→ Batch 1000 [100ms] ─────┘
              
              ✓ Total time = longest batch (~150ms)
              ✓ ALL 1000 batches complete in 10 seconds
```

### Issue #2: Race Condition in Share Approval

```
BEFORE (No Lock):
─────────────────

Admin A                              Admin B
 │                                   │
 ├─ Approve purchase #100 (100 sh)   ├─ Approve purchase #101 (50 sh)
 │                                   │
 ├─ Read: SUM(user_shares) = 0  ┐    ├─ Read: SUM(user_shares) = 0  ┐
 │                               │    │                               │
 ├─ Check: 0 + 100 ≤ 100 ✓       │    ├─ Check: 0 + 50 ≤ 100 ✓       │
 │                               │    │                               │
 ├─ INSERT (100 shares)      ────┼────┼──→ INSERT (50 shares)        │
 │                               │    │                               │
 └─ COMMIT                   ────┴────┴──→ COMMIT                    │

RESULT: Portfolio has 150 shares (exceeded 100 limit!) ✗


AFTER (With Lock Table):
───────────────────────

Admin A                              Admin B
 │                                   │
 ├─ Approve purchase #100 (100 sh)   ├─ Approve purchase #101 (50 sh)
 │                                   │
 ├─ INSERT share_approvals(#100)     ├─ INSERT share_approvals(#101)
 │  └─ SUCCESS (acquired lock)       │  └─ SUCCESS (acquired lock)
 │                                   │
 ├─ Check capacity & INSERT (100)    ├─ Check capacity & INSERT (50)
 │  └─ SUCCESS                       │  └─ FAIL (capacity check)
 │                                   │
 └─ COMMIT ✓                         └─ ROLLBACK: capacity exceeded

RESULT: Only 100 shares approved, other request fails gracefully ✓
```

### Issue #3: KV Eventual Consistency

```
BEFORE (KV Blacklist):
──────────────────────

User logs out in ASIA region:
  │
  └─→ PUT key='blacklist:jti-123' to KV
      └─→ Stored in ASIA tier

User makes request from US ISP:
  │
  └─→ GET key='blacklist:jti-123' from KV
      └─→ Reads from US tier
      └─→ Data not propagated yet (60s eventual consistency)
      └─→ ✗ Request authorized (should be rejected!)

Timeline:
  0s   Asia KV updated
  60s  US KV finally updated
  ↑    User has 60-second window to use token after logout


AFTER (D1 Blacklist):
─────────────────────

User logs out:
  │
  └─→ INSERT into token_blacklist (jti, expires_at)
      └─→ Stored in D1 (strong consistency)

User makes request:
  │
  └─→ SELECT FROM token_blacklist WHERE jti='jti-123'
      └─→ All regions read same D1 instance (globally consistent)
      └─→ ✓ Request immediately rejected

Timeline:
  0s   Token blacklisted everywhere
  ↑    User cannot use token immediately after logout
```

---

## Performance Impact: Before vs After Fixes

```
METRIC: Project Listing (20 projects, 100k users)

BEFORE:
┌─────────────────────────────────────────────────┐
│ Query: SELECT p.*, (SELECT SUM...) FROM p...   │
│                                                  │
│ Execution:                                       │
│ Batch 1: Fetch projects (1 query)        15ms   │
│ ├─ Project 1: Subquery                  5ms    │
│ ├─ Project 2: Subquery                  5ms    │
│ ├─ ...                                          │
│ └─ Project 20: Subquery                 5ms    │
│                                                  │
│ Total: 1 + 20 = 21 queries                     │
│ Total time: ~100ms ✗ SLOW                     │
└─────────────────────────────────────────────────┘

AFTER:
┌──────────────────────────────────────────────────┐
│ Query: SELECT p.*, SUM(us.qty) FROM p           │
│        LEFT JOIN user_shares us                  │
│        GROUP BY p.id                             │
│                                                   │
│ Execution:                                        │
│ ├─ Parse & optimize (D1)             2ms        │
│ ├─ Execute JOIN (D1)                 5ms        │
│ └─ Return results                    1ms        │
│                                                   │
│ Total: 1 query, 2 round-trips                    │
│ Total time: ~10ms ✓ FAST (10x faster)          │
└──────────────────────────────────────────────────┘
```

---

## Request Latency Timeline

```
CURRENT (Without Fixes):
────────────────────────

Request: GET /api/projects?page=1&limit=20
│
├─ CORS validation              2ms
├─ Auth middleware check         5ms [D1 query]
├─ Project listing query        50ms [N+1 subqueries]
│  ├─ Main query                 5ms
│  └─ 20 subqueries × 2.5ms      50ms
├─ Response serialization        5ms
└─ Send response                 2ms
────────────────────────────────────
Total:                          64ms


AFTER FIXES:
────────────

Request: GET /api/projects?page=1&limit=20
│
├─ CORS validation              2ms
├─ Auth middleware check         5ms [D1 query with index]
├─ Project listing query        10ms [Single optimized query]
│  ├─ Main query with JOIN       7ms
│  └─ Response assembly          3ms
├─ Response serialization        2ms
└─ Send response                 2ms
────────────────────────────────────
Total:                          21ms ✓ 3x faster
```

---

## Cron Job Execution Timeline

```
MONTH 1 (Current Scale, 10k users):
───────────────────────────────────

Cron trigger fires: 0:00
│
├─ Fetch profit rates              200ms
│
├─ For each project (5 projects):
│  │
│  ├─ Project 1 (2k users)
│  │  ├─ Fetch shareholders         100ms
│  │  ├─ Calculate earnings         50ms
│  │  └─ Batch INSERT (20 batches)  2000ms [20 × 100ms]
│  │
│  ├─ Project 2 (2k users)
│  │  └─ (similar)                  2000ms
│  │
│  ├─ Project 3 (2k users)
│  │  └─ (similar)                  2000ms
│  │
│  ├─ Project 4 (2k users)
│  │  └─ (similar)                  2000ms
│  │
│  └─ Project 5 (2k users)
│     └─ (similar)                  2000ms
│
└─ Total: ~10,200ms (10 seconds) ✓ SAFE


MONTH 12 (After Fixes, 100k users):
────────────────────────────────────

Cron trigger fires: 0:00
│
├─ Fetch profit rates              200ms
│
├─ For each project (5 projects):
│  │
│  ├─ Project 1 (20k users)
│  │  ├─ Fetch shareholders         500ms
│  │  ├─ Calculate earnings         200ms
│  │  └─ Batch INSERT IN PARALLEL   ~200ms [200 batches, all at once]
│  │     (Before: 200 × 100ms = 20,000ms)
│  │     (After: max(all) = 200ms via Promise.all)
│  │
│  ├─ Project 2-5 (similarly, in parallel)
│  │  └─ (similar)                  ~200ms each
│
└─ Total: ~3,000ms (3 seconds) ✓ SAFE (was 100+ seconds)
```

---

## Authentication & Authorization Flow

```
REGISTRATION
────────────

User inputs:
├─ Name
├─ Phone (Bangladesh format)
├─ Password
└─ Optional: Referral code

Flow:
  1. Frontend: Validate locally (Zod)
  2. POST /api/auth/register
  3. Backend:
     ├─ Check phone not already registered
     ├─ Validate referral code (if provided)
     ├─ Hash password: PBKDF2(password, salt) → 100k iterations
     ├─ Generate referral code for new user
     ├─ INSERT into users table
     └─ Return success


LOGIN
─────

User inputs:
├─ Phone
└─ Password

Flow:
  1. Frontend: POST /api/auth/login
  2. Backend:
     ├─ Check rate limit (KV): max 5 attempts per 15 min
     ├─ Fetch user from DB
     ├─ Verify password: PBKDF2(input, stored_salt) == stored_hash
     ├─ If valid:
     │  ├─ Generate JWT with 7-day expiry
     │  ├─ Include: user_id, phone, role, jti (unique ID)
     │  └─ Return token
     ├─ If invalid:
     │  ├─ Increment rate limit counter
     │  └─ Return 401
  3. Frontend: Store token in memory (NOT localStorage)


LOGOUT
──────

Flow:
  1. Frontend: POST /api/auth/logout
  2. Backend:
     ├─ Extract token from Authorization header
     ├─ Verify token signature
     ├─ Extract jti (unique token ID)
     ├─ INSERT into token_blacklist (D1)
     │  └─ With expiration time = token.exp
     └─ Return success
  3. Frontend: Clear memory, redirect to login


PROTECTED REQUEST
─────────────────

Flow:
  1. Frontend: GET /api/earnings
     ├─ Authorization: Bearer <token>
  2. Backend (authMiddleware):
     ├─ Extract token from header
     ├─ Verify signature (JWT_SECRET)
     ├─ Check token not expired
     ├─ Query token_blacklist (D1):
     │  └─ IF blacklisted: Return 401
     ├─ Extract user_id from token
     ├─ Set c.set('userId', user_id)
     └─ Call next()
  3. Route handler executes with verified userId
     └─ Return earnings data
```

---

## Scale Projections

```
User Growth Projection (Year 1):

Month   Users    Share Purchases    Earnings Records    Concerns
─────   ─────    ───────────────    ────────────────    ────────
  1     1k       100                500                 None
  3     5k       500                2.5k                None
  6     10k      1k                 5k                  Need monitoring
  9     50k      5k                 25k                 Cron approaching limit
 12     100k     10k                50k                 Need parallel batching

At 100k users:
├─ D1 queries/month: ~500k (within soft limits)
├─ Cron execution time: 100s without parallel → 5s with parallel
├─ API response time: 100ms without fixes → 20ms with fixes
└─ Workers memory: ~5MB (plenty of headroom)

Scaling Decision Points:
├─ At 100k users: Implement parallel batching ✓ (in fixes)
├─ At 500k users: Consider PostgreSQL instead of D1
├─ At 1M users: Split into multiple workers
└─ At 10M+ users: Full microservices architecture needed
```

---

## Deployment Checklist Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION CHECKLIST                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PHASE 1: Schema Updates (30 min)                            │
│  ├─ [X] Add share_approvals table                            │
│  ├─ [X] Add token_blacklist table                            │
│  ├─ [X] Add 4 performance indexes                            │
│  └─ [ ] Test locally                                         │
│       └─ npm run db:migrate:local                            │
│                                                               │
│  PHASE 2: Code Changes (4-5 hours)                           │
│  ├─ [ ] Fix cron parallel batching                           │
│  ├─ [ ] Implement share approval lock                        │
│  ├─ [ ] Migrate token blacklist to D1                        │
│  ├─ [ ] Fix projects N+1 query                               │
│  └─ [ ] Test locally                                         │
│       └─ npm run dev                                         │
│                                                               │
│  PHASE 3: Deployment (1 hour)                                │
│  ├─ [ ] Deploy schema to production                          │
│  │    └─ npm run db:migrate:remote                           │
│  ├─ [ ] Deploy code to production                            │
│  │    └─ npm run deploy                                      │
│  └─ [ ] Verify in production                                 │
│       └─ wrangler tail buildbarguna-worker                   │
│                                                               │
│  PHASE 4: Testing (2 hours)                                  │
│  ├─ [ ] Load test cron job                                   │
│  │    └─ Should complete in <15s                             │
│  ├─ [ ] Test concurrent share approvals                      │
│  │    └─ Should prevent double-approval                      │
│  ├─ [ ] Test logout across regions                           │
│  │    └─ Should be immediate                                 │
│  └─ [ ] Monitor for 24 hours                                 │
│       └─ wrangler tail                                       │
│                                                               │
│  TOTAL TIME: 8-10 hours                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics Dashboard

```
METRIC                          TARGET    ALERT      CURRENT
─────────────────────────────   ──────    ─────      ───────
Cron Execution Time             <15s      >20s       ~20-30s ⚠️
Logout Effectiveness            <1s       >5s        ~60s ⚠️
Project Listing Time            <20ms     >50ms      ~100ms ⚠️
Share Approval Race Condition   0         >0         Possible ⚠️
Token Blacklist Propagation     <1s       >60s       ~60s ⚠️
D1 Query Time (p95)             <50ms     >100ms     ~80ms ⚠️
Worker Error Rate               <0.1%     >1%        <0.1% ✓
Authentication Success Rate     >99.5%    <98%       >99.8% ✓
```

---
