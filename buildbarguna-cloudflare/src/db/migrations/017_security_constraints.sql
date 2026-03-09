-- Migration 017: Security and Performance Constraints
-- Run: wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/017_security_constraints.sql

-- 1. Prevent referral bonus double-claim
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_bonuses_unique
ON referral_bonuses(referrer_user_id, referred_user_id);

-- 2. Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read, created_at DESC);

-- 3. Add index for withdrawal balance calculations
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status
ON withdrawals(user_id, status, requested_at DESC);

-- 4. Add index for member registration lookups
CREATE INDEX IF NOT EXISTS idx_member_registrations_user
ON member_registrations(user_id, status);

-- 5. Skip unique constraint on share purchases (existing duplicates may exist)
-- Application-level checks will prevent duplicates going forward

-- 6. Add index for token blacklist cleanup
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires
ON token_blacklist(expires_at);

-- 7. Add index for audit log queries
CREATE INDEX IF NOT EXISTS idx_member_audit_log_target
ON member_audit_log(target_user_id, action_type, created_at DESC);

-- 8. Add pagination limit enforcement - update withdrawal_settings
INSERT OR REPLACE INTO withdrawal_settings (key, value) VALUES ('max_paisa', '500000');
INSERT OR REPLACE INTO withdrawal_settings (key, value) VALUES ('referral_bonus_paisa', '5000');
