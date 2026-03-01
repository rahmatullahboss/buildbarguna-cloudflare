# Withdrawal System - Quick Reference

## Core Concepts (BD Platform Context)

**All amounts in paisa (integers). 1 taka = 100 paisa.**

- User earnings accumulate in `earnings` table
- Withdrawals are requests to move accumulated earnings to user's bKash account
- Flow: `pending` (user submits) → `approved` (admin approves) → `completed` (bKash transfer confirmed)
- Manual bKash transfer is standard (no official API for group investments in BD)

---

## Database Changes

### Add 3 Tables

```sql
-- Core withdrawals table
CREATE TABLE withdrawals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  requested_amount INTEGER NOT NULL CHECK(> 0),
  status TEXT CHECK(IN 'pending','approved','completed','rejected','cancelled'),
  bkash_number TEXT NOT NULL,  -- e.g. "01712345678"
  bkash_txid TEXT UNIQUE,      -- Set after payment sent
  requested_at TEXT DEFAULT now(),
  approved_at TEXT, approved_by INTEGER,
  completed_at TEXT,
  rejected_reason TEXT,
  created_at TEXT, updated_at TEXT
);
CREATE INDEX idx_withdrawals_user_status ON withdrawals(user_id, status);

-- Optional: track per-user limits
CREATE TABLE withdrawal_limits (
  user_id INTEGER UNIQUE,
  last_withdrawal_at TEXT,
  withdrawal_count_mtd INTEGER,
  total_withdrawn_mtd INTEGER
);

-- Platform settings (configurable by admin)
CREATE TABLE withdrawal_settings (
  setting_key TEXT UNIQUE,  -- e.g. 'min_withdrawal_amount_paisa'
  setting_value TEXT
);
```

---

## Key Validation Rules

### Server-Side Checks (Non-Negotiable)

```
1. Amount:
   - 10,000 ≤ amount ≤ 500,000 paisa (100-5000 taka)
   
2. Available Balance:
   - available = total_earnings - completed_withdrawals - approved_pending - user_pending
   - amount ≤ available
   
3. User Status:
   - is_active = 1
   - account age > 7 days (prevent instant abuse)
   - KYC verified (if required)
   - last_withdrawal > 24 hours ago (cooldown)
   - withdrawal_count_mtd < 4 (max per month)
   
4. bKash Number:
   - Matches pattern: 01[0-9]{8}
   - Not empty, valid format
```

### Race Condition Protection

When admin approves:
1. Check available balance AGAIN (not just at request time)
2. Use DB-level WHERE clause: `WHERE available >= requested_amount`
3. If check fails: reject with clear message

---

## Critical Security Rules

| Rule | Why | Implementation |
|------|-----|-----------------|
| Never log full bKash number | Data breach risk | Mask: `01XXXX2345` |
| Unique constraint on bkash_txid | Prevent duplicate payouts | DB level constraint |
| Always store approved_by admin ID | Fraud audit trail | Link to users(id) |
| Rate limit: 5 requests/hour/user | Prevent spam | Cloudflare Workers KV |
| Validate bKash TxID format | Prevent typos from losing money | Regex before insert |
| Re-check balance at approval time | Prevent overdraft | WHERE balance >= amount |
| Mask bKash in API responses | User privacy | Show only last 4 digits |

---

## API Endpoints (Minimal)

### User Endpoints
```
GET  /api/withdrawals/balance
     → { available_paisa, total_earnings, withdrawn, pending }

POST /api/withdrawals
     → { amount_paisa, bkash_number, reason }
     
GET  /api/withdrawals
     → paginated list of user's requests

PATCH /api/withdrawals/:id/cancel
      → cancel pending request only
```

### Admin Endpoints
```
GET  /api/admin/withdrawals?status=pending
     → queue of pending requests

PATCH /api/admin/withdrawals/:id/approve
      → { admin_note }
      
PATCH /api/admin/withdrawals/:id/reject
      → { reason }
      
PATCH /api/admin/withdrawals/:id/mark-completed
      → { bkash_txid }
```

---

## Top 10 Mistakes to Avoid

1. ❌ Not re-validating balance at approval time → Fix: Check again before approve
2. ❌ Forgetting to subtract pending requests from available balance → Fix: Include in calculation
3. ❌ Logging full bKash numbers → Fix: Mask to `01XXXX2345`
4. ❌ No unique constraint on bkash_txid → Fix: Add DB constraint
5. ❌ Accepting withdrawal before user is "settled" (new account) → Fix: Require account_age > 7 days
6. ❌ Not storing which admin approved what → Fix: Add `approved_by` field
7. ❌ Allowing unlimited requests → Fix: Rate limit + monthly caps
8. ❌ Ambiguous status messages → Fix: Clear states with explanations
9. ❌ No rate limiting on API → Fix: 5 requests/hour/user
10. ❌ Not validating bKash number format → Fix: Server-side regex check

---

## Implementation Checklist

**Phase 1: Core (Week 1)**
- [ ] Add `withdrawals` table
- [ ] Build balance calculation function
- [ ] POST endpoint to request withdrawal
- [ ] GET endpoint for available balance
- [ ] Validation: amount range, balance check, user status

**Phase 2: Admin (Week 1-2)**
- [ ] GET admin queue (pending withdrawals)
- [ ] PATCH approve endpoint
- [ ] PATCH reject endpoint
- [ ] PATCH mark-completed endpoint (with bKash TxID)
- [ ] Admin UI page with queue

**Phase 3: Security (Week 2)**
- [ ] Rate limiting (5/hour)
- [ ] bKash number validation
- [ ] Audit logging (approved_by, timestamps)
- [ ] User status checks (KYC, account age, cooldown)

**Phase 4: Polish (Week 3)**
- [ ] Frontend: withdrawal form, history, balance display
- [ ] Notifications: SMS/email on approve/reject/complete
- [ ] Admin settings page (min/max amounts, cooldown)
- [ ] Error messages in Bengali
- [ ] Testing: race conditions, insufficient balance, duplicate TxIDs

---

## Bangladesh-Specific Notes

- **bKash:** No official API for group investments; manual transfer is standard
- **KYC:** Consider requiring national ID + address for regulatory compliance
- **Notifications:** SMS > Email (higher delivery in BD)
- **User Behavior:** Expect frequent withdrawals (mobile-first platform)
- **Regulations:** BSEC oversees securities; maintain audit trail for compliance
- **Processing Time:** 1-2 hours typical for bKash transfer (not instant)

---

## Balance Calculation (Critical)

```sql
-- Get user's available balance
SELECT 
  COALESCE(SUM(e.amount), 0) as total_earnings,
  COALESCE((SELECT SUM(amount) FROM withdrawals 
            WHERE user_id = ? AND status = 'completed'), 0) as completed_withdrawals,
  COALESCE((SELECT SUM(amount) FROM withdrawals 
            WHERE user_id = ? AND status = 'approved'), 0) as approved_pending,
  COALESCE((SELECT SUM(amount) FROM withdrawals 
            WHERE user_id = ? AND status = 'pending'), 0) as user_pending
FROM earnings
WHERE user_id = ?

-- Available = total_earnings - all_withdrawals (completed + approved + pending)
```

---

## Testing Edge Cases

Before going live, test:

1. **Simultaneous approvals:** Two admins approve conflicting requests → second fails
2. **Insufficient balance:** Request > available → rejected at approval time
3. **Duplicate TxID:** Same bKash TxID entered twice → second fails (unique constraint)
4. **Account too new:** Day-old user requests withdrawal → rejected
5. **Rapid requests:** User submits 6 requests in 5 minutes → 6th fails (rate limit)
6. **Earnings arrive during approval:** User requests, earnings calculated, new earnings arrive, approval checks balance → should succeed
7. **bKash typo:** Admin enters wrong phone number → catches format error before saving
8. **Cancelled then re-request:** User cancels pending, resubmits same amount → should work (separate request)

---

## Operational Runbook (For Admins)

**Daily (or as requests come in):**
1. Go to `/admin/withdrawals?status=pending`
2. Review each request: amount, user account age, KYC status
3. Verify bKash number format looks correct
4. Click "Approve" or "Reject"
5. If approved, note in system
6. Manually send bKash transfer via operator dashboard
7. Get bKash TxID from receipt
8. Return to withdrawal record, click "Mark Completed", paste TxID
9. System sends SMS to user confirming receipt

**Red flags (investigate before approving):**
- New account (<7 days) requesting large amount
- Multiple requests from same user in one day
- Amount much larger than user's typical earnings
- bKash number doesn't match user's profile
- User with no share purchases (only task earnings)

---

**Version:** 1.0 | **Status:** Ready for implementation | **Date:** 2025-01-14
