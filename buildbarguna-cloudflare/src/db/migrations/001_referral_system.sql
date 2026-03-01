-- Migration 001: Referral System
-- Run once on existing databases. Schema.sql handles fresh installs.

-- Add referrer_user_id FK column (integer, replaces string referred_by)
-- Note: ALTER TABLE ADD COLUMN is idempotent only on fresh DBs.
-- If column already exists from a previous run, this is a no-op via schema.sql.
-- For existing DBs run the ALTER TABLE command manually once:
--   wrangler d1 execute buildbarguna-invest-db --remote --command "ALTER TABLE users ADD COLUMN referrer_user_id INTEGER REFERENCES users(id)"

-- Index for fast referrer lookups
CREATE INDEX IF NOT EXISTS idx_users_referrer_user_id ON users(referrer_user_id);

-- Backfill referrer_user_id from existing referred_by string values
UPDATE users
SET referrer_user_id = (
  SELECT id FROM users referrer WHERE referrer.referral_code = users.referred_by
)
WHERE referred_by IS NOT NULL AND referrer_user_id IS NULL;

-- Referral bonuses table
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  trigger_event    TEXT NOT NULL DEFAULT 'first_investment',
  amount_paisa     INTEGER NOT NULL CHECK(amount_paisa > 0),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(referrer_user_id, referred_user_id, trigger_event)
);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);

-- Referral bonus setting (default ৳50)
INSERT OR IGNORE INTO withdrawal_settings (key, value) VALUES ('referral_bonus_paisa', '5000');
