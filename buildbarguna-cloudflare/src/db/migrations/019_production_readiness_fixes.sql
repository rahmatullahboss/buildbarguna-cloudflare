-- Migration 019: Production Readiness Fixes
-- Date: 2026-03-09
-- Purpose: Add idempotency support, composite indexes, and withdrawal cooldown enforcement

-- 1. Add idempotency_key column to share_purchases
ALTER TABLE share_purchases ADD COLUMN idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_share_purchases_idempotency ON share_purchases(user_id, idempotency_key);

-- 2. Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_share_purchases_user_status_created 
  ON share_purchases(user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status_requested 
  ON withdrawals(user_id, status, requested_at);

CREATE INDEX IF NOT EXISTS idx_earnings_user_project_month 
  ON earnings(user_id, project_id, month);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_task_date 
  ON task_completions(user_id, task_id, task_date);

-- 3. Add withdrawal cooldown enforcement trigger
-- Prevent multiple pending withdrawals per user (already has partial unique index, but let's enforce in trigger too)
CREATE TRIGGER IF NOT EXISTS enforce_withdrawal_cooldown
BEFORE INSERT ON withdrawals
WHEN NEW.status = 'pending'
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM withdrawals 
      WHERE user_id = NEW.user_id 
      AND status = 'pending'
    ) THEN RAISE(ABORT, 'আপনার ইতিমধ্যে একটি অপেক্ষমাণ উত্তোলন অনুরোধ আছে')
  END;
END;

-- 4. Add trigger to prevent withdrawal if within cooldown period
-- Checks if last completed/rejected withdrawal was within 7 days
CREATE TRIGGER IF NOT EXISTS enforce_withdrawal_cooldown_period
BEFORE INSERT ON withdrawals
WHEN NEW.status = 'pending'
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM withdrawals 
      WHERE user_id = NEW.user_id 
      AND status IN ('completed', 'rejected')
      AND datetime(rejected_at) > datetime('now', '-7 days')
      OR datetime(completed_at) > datetime('now', '-7 days')
    ) THEN RAISE(ABORT, '৭ দিনের কোলডাউন পিরিয়ড পার না হওয়া পর্যন্ত নতুন উত্তোলন অনুরোধ দেওয়া যাবে না')
  END;
END;

-- 5. Add audit logging table for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'share_purchase', 'withdrawal', 'user', 'project', etc.
  target_id INTEGER,
  target_user_id INTEGER, -- If action affects another user
  old_values TEXT, -- JSON of old values (for updates)
  new_values TEXT, -- JSON of new values
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at);

-- 6. Add fraud detection columns to referral_bonuses
ALTER TABLE referral_bonuses ADD COLUMN ip_address TEXT;
ALTER TABLE referral_bonuses ADD COLUMN device_fingerprint TEXT;
ALTER TABLE referral_bonuses ADD COLUMN fraud_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_fraud ON referral_bonuses(fraud_score);

-- 7. Add trigger to detect self-referrals (same phone pattern)
CREATE TRIGGER IF NOT EXISTS detect_self_referral
AFTER INSERT ON users
WHEN NEW.referrer_user_id IS NOT NULL
BEGIN
  -- Check if referrer and referred have similar phone numbers (potential self-referral)
  UPDATE referral_bonuses SET fraud_score = fraud_score + 10
  WHERE referrer_user_id = NEW.referrer_user_id
  AND EXISTS (
    SELECT 1 FROM users u1, users u2
    WHERE u1.id = NEW.referrer_user_id
    AND u2.id = NEW.id
    AND substr(u1.phone, 1, 6) = substr(u2.phone, 1, 6) -- Same operator + prefix
  );
END;

-- 8. Add cron execution log table
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL, -- 'earnings_distribution', 'token_blacklist_cleanup'
  status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  details TEXT, -- JSON with additional info
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cron_log_job ON cron_execution_log(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_log_status ON cron_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_cron_log_created ON cron_execution_log(created_at);

-- 9. Add request timeout settings (for monitoring)
INSERT OR IGNORE INTO withdrawal_settings (key, value) VALUES
  ('request_timeout_ms', '30000'),  -- 30 second timeout
  ('max_pending_per_user', '3');    -- Max 3 pending share purchases

-- 10. Update migration tracking
INSERT OR IGNORE INTO _migrations (id, name, applied_at) 
VALUES (19, 'production_readiness_fixes', datetime('now'));
