-- Migration 024: Add user_balances table for explicit withdrawal tracking
-- This ensures money is explicitly deducted when admin approves withdrawal requests
-- Previously balance was calculated dynamically, which lacked audit trail

-- Create user_balances table to track explicit user balance
-- This provides:
-- 1. Explicit deduction when admin approves
-- 2. Audit trail for all balance changes
-- 3. Prevents race conditions

CREATE TABLE IF NOT EXISTS user_balances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id),
  total_earned_paisa    INTEGER NOT NULL DEFAULT 0 CHECK(total_earned_paisa >= 0),
  total_withdrawn_paisa INTEGER NOT NULL DEFAULT 0 CHECK(total_withdrawn_paisa >= 0),
  reserved_paisa       INTEGER NOT NULL DEFAULT 0 CHECK(reserved_paisa >= 0),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_user_balances_user ON user_balances(user_id);

-- Create audit log table for balance changes
CREATE TABLE IF NOT EXISTS balance_audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_paisa    INTEGER NOT NULL CHECK(amount_paisa != 0),
  change_type     TEXT NOT NULL CHECK(change_type IN ('earn', 'withdraw_reserve', 'withdraw_release', 'withdraw_complete', 'withdraw_reject', 'adjustment')),
  reference_type  TEXT,
  reference_id    INTEGER,
  admin_id        INTEGER REFERENCES users(id),
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_balance_audit_user ON balance_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_audit_reference ON balance_audit_log(reference_type, reference_id);
