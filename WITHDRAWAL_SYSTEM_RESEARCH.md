# Withdrawal/Payout System Best Practices for BuildBarguna

A research guide for implementing a secure, compliant withdrawal system for the Bangladeshi group investment platform.

---

## 1. Withdrawal Request Flow (Request → Admin Approval → Payout)

### Recommended Flow Architecture

**User Initiates Request:**
- User views available balance (total earnings - previous withdrawals - pending requests)
- User submits withdrawal request with:
  - Amount in paisa (integer)
  - bKash phone number (validated against user profile or new)
  - Optional note/reason
- Request stored as `pending` with timestamp

**Admin Reviews & Approves:**
- Admin dashboard shows queue of pending withdrawals sorted by:
  - Time submitted (FIFO is fairest, though can prioritize by amount or user tier)
  - User tier/KYC status
- Admin verifies:
  - Available balance exists
  - No fraud flags raised
  - User's KYC/profile is complete
  - bKash phone number format is valid
- Admin marks as `approved` (not yet paid)

**System Processes Payment:**
- Automated service or manual operator initiates bKash payment via:
  - bKash API (if available/integrated)
  - Manual bKash transfer by admin (note TxID in system)
- Payment sent to user's registered bKash number
- On successful bKash confirmation: mark as `completed` + store bKash TxID
- On failure: revert to `pending` or `rejected` depending on reason

**User Receives Confirmation:**
- Email/SMS notification with:
  - Amount transferred
  - bKash TxID reference
  - Status update
- User can view withdrawal history in profile

### Request States & Transitions

```
pending → approved → completed (success)
       ↓
       rejected
       
pending → cancelled (user cancels)
```

---

## 2. Database Schema & Tables Needed

### New Table: `withdrawals`

Core withdrawal request tracking:

```sql
CREATE TABLE IF NOT EXISTS withdrawals (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  requested_amount   INTEGER NOT NULL CHECK(requested_amount > 0),  -- paisa
  status             TEXT NOT NULL DEFAULT 'pending' 
                     CHECK(status IN ('pending','approved','completed','rejected','cancelled')),
  bkash_number       TEXT NOT NULL,  -- Phone number formatted +880XXXXXXXXX or 01XXXXXXXXX
  request_reason     TEXT,  -- Optional: "Monthly earnings", etc.
  admin_note         TEXT,  -- Admin can add notes on approval/rejection
  bkash_txid         TEXT UNIQUE,  -- Confirmation TxID after payment sent
  rejected_reason    TEXT,  -- If rejected, why (insufficient balance, user inactive, etc.)
  
  -- Audit trail
  requested_at       TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at        TEXT,  -- When admin approved
  approved_by        INTEGER REFERENCES users(id),  -- Which admin
  completed_at       TEXT,  -- When payment confirmed
  rejected_at        TEXT,
  cancelled_at       TEXT,
  
  -- Metadata
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_withdrawals_user_status      ON withdrawals(user_id, status);
CREATE INDEX idx_withdrawals_status           ON withdrawals(status);
CREATE INDEX idx_withdrawals_requested_at     ON withdrawals(requested_at);
CREATE INDEX idx_withdrawals_user_created     ON withdrawals(user_id, created_at);
```

### New Table: `withdrawal_limits` (Optional but recommended)

Track per-user withdrawal limits/cooldowns:

```sql
CREATE TABLE IF NOT EXISTS withdrawal_limits (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id),
  last_withdrawal_at    TEXT,  -- Last successful withdrawal date
  withdrawal_count_mtd  INTEGER DEFAULT 0,  -- Count in current month
  total_withdrawn_mtd   INTEGER DEFAULT 0,  -- Total paisa withdrawn this month
  next_eligible_at      TEXT,  -- If cooldown enforced
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_withdrawal_limits_user ON withdrawal_limits(user_id);
```

### Optional Table: `withdrawal_settings`

Admin-configurable platform-wide settings:

```sql
CREATE TABLE IF NOT EXISTS withdrawal_settings (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key           TEXT NOT NULL UNIQUE,
  setting_value         TEXT NOT NULL,
  description           TEXT,
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by            INTEGER REFERENCES users(id)
);

-- Insert initial settings
INSERT INTO withdrawal_settings (setting_key, setting_value, description) VALUES
('min_withdrawal_amount_paisa', '10000', 'Minimum 100 taka'),
('max_withdrawal_amount_paisa', '500000', 'Maximum 5000 taka'),
('cooldown_hours', '24', 'Minimum hours between withdrawals'),
('max_withdrawals_per_month', '4', 'Maximum requests per user per month'),
('requires_kyc_verification', '1', 'Must have verified KYC before withdrawal'),
('auto_approve_below_paisa', '50000', 'Auto-approve if < 500 taka (risky, skip)'),
('admin_approval_timeout_hours', '48', 'How long admin has to approve');
```

---

## 3. Validation Rules

### Client-Side (Frontend)

- **Amount format:** Must be integer ≥ 1 (in paisa)
- **Display:** Show in taka (amount_paisa / 100) with 2 decimals
- **bKash number:** Must be Bangladeshi mobile (01XXX XXXXXX or +880XXX XXXXXX)
- **Available balance:** Show real-time (total earnings - withdrawn - pending)
- **Error handling:** Clear Bengali messages for all validation failures

### Server-Side (API)

**Amount Validation:**
```
1. requested_amount > 0 (positive integer)
2. requested_amount >= MIN_WITHDRAWAL (e.g., 10,000 paisa = 100 taka)
3. requested_amount <= MAX_WITHDRAWAL (e.g., 500,000 paisa = 5,000 taka)
4. requested_amount <= available_balance (earnings - withdrawn - pending)
```

**User Validation:**
```
1. User is_active = 1
2. User created_at > registration_lock_period (e.g., 7 days old, to prevent instant abuse)
3. User has completed KYC/profile verification (if required)
4. User's last withdrawal was > cooldown_period ago (e.g., 24 hours)
5. User hasn't exceeded monthly withdrawal limit (e.g., 4 requests/month)
6. User hasn't exceeded monthly amount limit (e.g., 1,000,000 paisa/month)
7. User has no active fraud flags or suspension
```

**bKash Validation:**
```
1. Phone matches pattern: 01[0-9]{8} or +880[0-9]{9}
2. Phone is normalized to standard format (e.g., 01XXXXXXXXX)
3. Phone doesn't match admin's bKash (to prevent fake payouts)
4. (Optional) Phone is registered to user's name in KYC (verification)
```

**Balance Calculation:**

```typescript
const availableBalance = 
  (total_earnings from earnings table)
  - (SUM of completed withdrawals)
  - (SUM of approved but not completed withdrawals)
  - (SUM of pending withdrawals)
```

This prevents double-counting and overdrafts.

---

## 4. Security Considerations

### Rate Limiting

**API Endpoints:**
- `POST /api/withdrawals` (create request): **5 requests per user per hour**
  - Prevents accidental duplicate submissions
  - User can resubmit after cooldown
- `GET /api/withdrawals/balance`: **20 requests per minute** (check balance frequently)
- Admin approval endpoints: **100 per minute** (admins batch-process)

**Implementation:** Use Cloudflare Workers KV with time-windows
```typescript
const rateLimitKey = `rl:withdrawal:${userId}:${Math.floor(Date.now() / 3600000)}`
const count = await c.env.SESSIONS.get(rateLimitKey) || 0
if (count >= 5) return err(c, 'ইতিমধ্যে খুব বেশি অনুরোধ পাঠিয়েছেন। পরে চেষ্টা করুন।')
```

### Fraud Prevention

**Detection Rules:**

1. **Unusual Activity:** Flag if:
   - User makes withdrawal request immediately after signup
   - User requests withdrawal > 50% of total earnings in one go
   - User requests to new bKash number (not in profile)
   - Multiple withdrawals in short timeframe (e.g., 3 in 6 hours)

2. **Duplicate Prevention:**
   - Unique constraint on `(user_id, requested_at)` (one per minute max)
   - Check for duplicate bKash TxID across all users (prevents operator fraud)
   - Validate bKash TxID format before storing

3. **Admin Collusion Prevention:**
   - Require 2-admin approval for withdrawals > large amount (e.g., 100,000 paisa)
   - Log all admin actions with timestamp and approver ID
   - Track which admin approved which withdrawal
   - Alert if one admin approves > threshold of withdrawals per day

4. **Account Takeover:**
   - Require password/PIN confirmation for withdrawal request
   - Force re-login if withdrawal attempt from new IP
   - Send SMS confirmation code before processing (optional but recommended for BD context)

5. **bKash Fraud:**
   - Validate that bKash TxID exists and matches amount (via bKash API if available)
   - Log all bKash transaction details
   - Set flag if same bKash number appears for multiple users (shared account detection)

### Data Protection

**PII & Sensitive Data:**
- bKash numbers are sensitive (linked to user's identity/bank)
- **Never log full bKash numbers** in application logs (store masked: `01XXXX2345`)
- Use environment variables for sensitive settings (never hardcode)
- Encrypt bKash numbers at rest (if budget allows) using encryption library

**Access Control:**
- Only admins can approve/reject withdrawals
- Only admins can view other users' bKash numbers
- Users can only see their own withdrawal history
- Withdrawal audit log should be immutable (append-only)

### Idempotency & Edge Cases

**Prevent Double-Payment:**
- If bKash TxID is sent twice (operator mistakes), idempotency key prevents duplicate:
  - Use unique constraint on `bkash_txid`
  - Return 409 Conflict if attempting to mark as completed with existing TxID

**Insufficient Balance Race:**
- Use transaction-like approach:
  1. Check balance at request time (advisory)
  2. Check balance again at approval time
  3. If insufficient, reject with clear reason
  4. Recommend user wait for next earnings cycle

**Operator Error Recovery:**
- If bKash payment fails but TxID was recorded:
  - Store error code and message in `admin_note`
  - Revert to `pending` or `failed` state
  - Allow retry without duplicate submission

---

## 5. API Endpoints Needed

### User Endpoints (Authenticated)

**GET `/api/withdrawals/balance`**
- Returns available withdrawal balance
- Response:
  ```json
  {
    "success": true,
    "data": {
      "total_earnings_paisa": 500000,
      "total_withdrawn_paisa": 100000,
      "pending_withdrawals_paisa": 50000,
      "available_balance_paisa": 350000,
      "available_balance_taka": 3500,
      "user_kyc_verified": true,
      "can_request_withdrawal": true,
      "next_eligible_at": "2025-01-15T10:30:00Z"
    }
  }
  ```

**POST `/api/withdrawals`**
- Request withdrawal
- Body:
  ```json
  {
    "amount_paisa": 100000,
    "bkash_number": "01712345678",
    "reason": "Monthly earnings"
  }
  ```
- Response: `{ success: true, data: { withdrawal_id: 123, status: "pending", requested_at: "..." } }`

**GET `/api/withdrawals`**
- List user's withdrawal requests (paginated)
- Query params: `?page=1&limit=10&status=completed`
- Response:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 1,
          "amount_paisa": 100000,
          "status": "completed",
          "bkash_number_masked": "01712XXXX678",
          "bkash_txid": "ABC123DEF",
          "requested_at": "2025-01-10T10:00:00Z",
          "completed_at": "2025-01-11T15:30:00Z"
        }
      ],
      "total": 15,
      "page": 1,
      "limit": 10,
      "hasMore": true
    }
  }
  ```

**GET `/api/withdrawals/:id`**
- Get single withdrawal request details
- User can only see their own

**PATCH `/api/withdrawals/:id/cancel`**
- User cancels pending withdrawal request
- Only works if status is `pending`
- Response: `{ success: true, data: { status: "cancelled" } }`

---

### Admin Endpoints (Admin-Only)

**GET `/api/admin/withdrawals`**
- List all pending/completed withdrawals
- Query params: `?page=1&limit=20&status=pending&sort=requested_at`
- Response: includes user details, KYC status

**GET `/api/admin/withdrawals/:id`**
- Full withdrawal details for admin review

**PATCH `/api/admin/withdrawals/:id/approve`**
- Approve withdrawal request
- Body:
  ```json
  {
    "admin_note": "Verified KYC and balance"
  }
  ```
- Updates: status → `approved`, approved_at, approved_by
- Response: confirmation

**PATCH `/api/admin/withdrawals/:id/reject`**
- Reject withdrawal
- Body:
  ```json
  {
    "reason": "User KYC not verified"
  }
  ```
- Updates: status → `rejected`, rejected_at, rejected_reason

**PATCH `/api/admin/withdrawals/:id/mark-completed`**
- Mark withdrawal as paid (after bKash transfer confirmed)
- Body:
  ```json
  {
    "bkash_txid": "ABC123DEF",
    "admin_note": "Transferred via operator dashboard"
  }
  ```
- Updates: status → `completed`, bkash_txid, completed_at

**GET `/api/admin/withdrawal-stats`**
- Overview: total pending, total this month, avg payout time
- Response:
  ```json
  {
    "pending_count": 5,
    "pending_amount_paisa": 500000,
    "completed_this_month": 42,
    "completed_amount_this_month_paisa": 4200000,
    "avg_approval_time_hours": 2.5,
    "users_flagged": 3
  }
  ```

---

## 6. Frontend Pages & Components Needed

### User-Facing Pages

**`/withdrawal` or `/earnings/withdraw`**
- Display available balance prominently
- Form to request withdrawal:
  - Amount input (with taka/paisa conversion)
  - bKash number field (with validation)
  - Optional reason field
  - Minimum/maximum warnings
- List of recent withdrawals with status
- FAQ section: "How long does withdrawal take?", "Why was I rejected?"

**`/withdrawals/history`**
- Paginated list of all withdrawal requests
- Filters: status (all, pending, completed, rejected)
- Sortable columns: date, amount, status
- Search by withdrawal ID or amount
- Show: amount, status, request date, completion date, bKash TxID (for completed)

**`/account/kyc` or `/profile/kyc`** (if not already exists)
- Show KYC verification status
- Allow user to update/verify phone number
- Show registered bKash number
- Prompt to verify if withdrawal requires KYC

### Admin Pages

**`/admin/withdrawals` (Dashboard)**
- Queue of pending withdrawals (sortable, filterable)
- Quick stats: pending count, pending total amount, avg wait time
- Show user details: name, phone, KYC status, registration date
- One-click approve/reject buttons
- Bulk actions (approve multiple at once)

**`/admin/withdrawals/detail/:id`**
- Full withdrawal request details
- User's earnings breakdown (show why they have that balance)
- Fraud risk score (if implemented)
- Admin actions:
  - Approve button (sets status=approved)
  - Reject button (with reason dropdown)
  - Mark as Completed button (input TxID)
  - Admin note textarea

**`/admin/withdrawals/stats`**
- Charts: withdrawals per day, total amount per day
- Metrics: avg approval time, rejection rate, flagged users
- User analysis: top withdrawers, suspicious patterns
- bKash reconciliation: matching TxIDs to withdrawals

**`/admin/settings/withdrawals`**
- Update withdrawal settings:
  - Min/max amounts
  - Cooldown period
  - Monthly limits
  - KYC requirement toggle
  - Auto-approval threshold
- Log of setting changes

### Components

**`<WithdrawalForm />`**
- Input validation, error display
- Disabled state while submitting
- Success modal on submission

**`<AvailableBalance />`**
- Display formatted balance in taka
- Breakdown: earnings, withdrawn, pending
- Real-time update (refresh on mount, every 30s)

**`<WithdrawalList />`**
- Paginated table of withdrawals
- Status badge styling
- Copy-to-clipboard for TxID
- Responsive design for mobile

**`<WithdrawalQueue />` (Admin)**
- Filterable/sortable queue
- Inline approve/reject actions
- Bulk checkbox selection
- User KYC status indicator

---

## 7. Common Mistakes to Avoid

### Financial & Logic Errors

❌ **Mistake 1: Not re-validating balance at approval time**
- Problem: User requests 100k, balance checks out, but new earnings arrive + other withdrawal approved → balance no longer sufficient
- Fix: Always check balance again at approval time, reject if insufficient

❌ **Mistake 2: Calculating available balance incorrectly**
- Common error: Forget to subtract `pending` withdrawals
- Leads to: Over-promising payouts, insufficient funds
- Fix: `available = earnings - completed_withdrawals - approved_pending - user_pending`

❌ **Mistake 3: Allowing simultaneous approval of conflicting requests**
- Problem: Admin A approves withdrawal A (leaving 10k), Admin B approves withdrawal B (needs 20k) at same time
- Fix: Use DB-level checks: verify balance in `WHERE` clause before updating

❌ **Mistake 4: Not tracking which admin approved what**
- Problem: Can't trace responsible party if fraudulent approval occurs
- Fix: Always store `approved_by` user_id and timestamp
- Impact: Regulatory requirement + fraud audit trail

### Security & Fraud Errors

❌ **Mistake 5: Logging full bKash numbers**
- Problem: Log breach exposes user banking info
- Fix: Always mask to `01XXXX2345`, encrypt at rest

❌ **Mistake 6: Not rate-limiting withdrawal requests**
- Problem: User can spam 1000 requests in 1 second, DDoS admin queue
- Fix: 5 requests per hour, lock out after threshold

❌ **Mistake 7: Accepting bKash TxID without validation**
- Problem: Admin manually enters fake TxID, no audit trail
- Fix: Validate format, check against bKash API if possible, make immutable once recorded

❌ **Mistake 8: No idempotency check on bKash TxID**
- Problem: Operator sends same TxID twice → records two payouts for one transfer
- Fix: Unique constraint on `bkash_txid` column

❌ **Mistake 9: Allowing withdrawal before user is "settled"**
- Problem: User makes 1 share purchase, immediately requests all earnings, never completes purchase
- Fix: Require either `share_purchases.approved` count > 0 OR earnings.amount > minimum_age (days)

❌ **Mistake 10: Not validating bKash number format**
- Problem: Admin typos user's number, payout goes to wrong person
- Fix: Server validates: `01[0-9]{8}` pattern, matches user's country

### UX & Communication Errors

❌ **Mistake 11: Ambiguous withdrawal status messaging**
- Problem: "Pending" is unclear — does user need to act? Is it stuck?
- Fix: Use clear states:
  - `pending` → "Waiting for admin review"
  - `approved` → "Approved! Transferring to bKash (within 24 hours)"
  - `completed` → "Received! TxID: ABC123"
  - `rejected` → "Not approved. Reason: [reason]"

❌ **Mistake 12: Not showing why a withdrawal was rejected**
- Problem: User frustrated, can't fix issue
- Fix: Always include `rejected_reason` visible to user
- Examples: "Insufficient balance", "KYC not verified", "Too frequent"

❌ **Mistake 13: No notification system**
- Problem: User requests withdrawal, never knows if approved
- Fix: Email/SMS on: request received, approved, rejected, completed

❌ **Mistake 14: Allowing withdrawal of incomplete earnings**
- Problem: User invests in 2 projects, earnings from 1 accrued, tries to withdraw all
- Fix: Only allow withdrawal of fully credited, non-reversible earnings

### Operational Errors

❌ **Mistake 15: No manual override mechanism for stuck withdrawals**
- Problem: Withdrawal stuck in `approved` state, no way to retry
- Fix: Admin button to revert to `pending` or reset bKash_txid

❌ **Mistake 16: Insufficient logging/audit trail**
- Problem: Can't trace why a payout failed or who approved fraud
- Fix: Log every state change: who, when, what changed, from/to values

❌ **Mistake 17: Manual bKash transfer without system linkage**
- Problem: Operator sends via bKash app, forgets to update system → user thinks money didn't arrive
- Fix: Require `bkash_txid` entry AFTER confirmation, not before

❌ **Mistake 18: Not handling bKash API failures gracefully**
- Problem: bKash API down → all withdrawals stuck
- Fix: Graceful degradation: allow manual TxID entry, queue withdrawals, retry logic

❌ **Mistake 19: No monthly reconciliation process**
- Problem: Don't know if all payouts actually went through
- Fix: Export all `completed` withdrawals, verify against bKash statement monthly

❌ **Mistake 20: Hardcoding limits/settings in code**
- Problem: Can't adjust min/max withdrawal without code deploy
- Fix: Store in `withdrawal_settings` table, allow admin to update live

---

## Summary Table: Implementation Priority

| Feature | Priority | Effort | Risk if Missing |
|---------|----------|--------|-----------------|
| Core flow (request→approve→payout) | P0 | Medium | System non-functional |
| Balance validation | P0 | Low | Financial loss |
| User/admin endpoints | P0 | Medium | Can't operate |
| bKash phone validation | P1 | Low | Payouts to wrong people |
| Rate limiting | P1 | Low | DDoS/spam |
| Admin audit trail | P1 | Low | Can't investigate fraud |
| Cooldown & monthly limits | P2 | Low | Withdrawal spam |
| KYC verification tie-in | P2 | Medium | Regulatory risk (if required) |
| Fraud detection (auto-flags) | P2 | Medium | Financial loss |
| SMS/Email notifications | P2 | Medium | User confusion |
| bKash API integration | P3 | High | Must use manual workaround |
| Two-admin approval | P3 | Medium | High-risk fraud |
| Encryption at rest | P3 | Medium | Data breach |

---

## Bangladesh-Specific Considerations

1. **bKash Integration:**
   - No single "official" bKash API for group investments
   - Most platforms use manual transfer + TxID verification
   - Expect 1-2 hour processing (not instant)
   - bKash has daily/monthly limits (user-dependent)

2. **Regulatory Environment:**
   - Bangladesh Securities and Exchange Commission (BSEC) oversees securities
   - Group investment schemes may fall under this
   - Maintain detailed audit trail for compliance
   - Consider requiring user KYC (national ID, address proof)

3. **User Behavior:**
   - Expect frequent withdrawals (users like liquidity)
   - Mobile-first interface essential
   - Many users have limited internet (optimize for slow networks)
   - SMS preferable to email for notifications (higher delivery)

4. **Infrastructure:**
   - Cloudflare Workers: 10ms+ latency to BD is acceptable
   - D1 for small-scale (< 100k users) is fine; consider migration if growth
   - No local payment gateway; manual bKash transfer is standard for startups

---

## Next Steps for Implementation

1. Create DB tables (withdrawals, withdrawal_limits, withdrawal_settings)
2. Implement balance calculation helper function
3. Build user endpoints: GET balance, POST request, GET history
4. Build admin endpoints: approve, reject, mark-completed
5. Add rate limiting middleware
6. Create frontend pages: withdrawal form, history, admin queue
7. Add notifications (email/SMS on state changes)
8. Implement fraud detection rules
9. Set up admin audit logging
10. Write comprehensive tests for edge cases (insufficient balance, race conditions)
11. Create admin guide: how to process withdrawals, handle disputes
12. Monitor bKash transfer success rate in production

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-14  
**For:** BuildBarguna Platform (Cloudflare Workers + D1 + React)
