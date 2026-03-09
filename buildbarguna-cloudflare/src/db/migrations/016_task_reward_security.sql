-- Migration 016: Task & Reward Security Enhancements
-- Run: wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/016_task_reward_security.sql

-- Add audit logging for admin actions (create table if not exists)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action_type   TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     INTEGER NOT NULL,
  details       TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status ON point_withdrawals(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user ON point_withdrawals(user_id, requested_at DESC);
