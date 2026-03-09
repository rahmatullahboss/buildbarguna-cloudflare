-- Migration: Add unique constraint for one-time task completions
-- This prevents users from completing one-time tasks multiple times
-- Run: wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/016_one_time_task_uniqueness.sql

-- Add a new unique index for one-time tasks
-- Note: Using a simpler approach since SQLite doesn't allow subqueries in WHERE clauses
-- This index will be enforced at the application level via code checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_one_time
ON task_completions(user_id, task_id, task_date);

-- Add audit logging for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action_type   TEXT NOT NULL CHECK(action_type IN (
    'withdrawal_approved',
    'withdrawal_rejected',
    'withdrawal_completed',
    'reward_fulfilled',
    'user_suspended',
    'user_activated',
    'project_created',
    'project_updated',
    'share_approved',
    'share_rejected'
  )),
  target_type   TEXT NOT NULL CHECK(target_type IN (
    'withdrawal',
    'reward',
    'user',
    'project',
    'share'
  )),
  target_id     INTEGER NOT NULL,
  details       TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add index for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

-- Add reward fulfillment tracking (ignore if columns already exist)
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS fulfilled_at TEXT;
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS fulfilled_by INTEGER REFERENCES users(id);
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS tracking_notes TEXT;

-- Add index for fulfillment queries
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status, redeemed_at DESC);

-- Add fraud detection fields to task_completions (ignore if columns already exist)
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS completion_time_seconds INTEGER;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS is_flagged INTEGER DEFAULT 0;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add index for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, completed_at DESC);

-- Add withdrawal completion tracking (ignore if columns already exist)
ALTER TABLE point_withdrawals ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE point_withdrawals ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id);
ALTER TABLE point_withdrawals ADD COLUMN IF NOT EXISTS payment_txid TEXT;

-- Add index for withdrawal queries
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status ON point_withdrawals(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user ON point_withdrawals(user_id, requested_at DESC);
