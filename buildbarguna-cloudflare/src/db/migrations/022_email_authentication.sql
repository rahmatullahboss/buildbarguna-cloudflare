-- Migration 022: Email Authentication System
-- Adds email-based login, Google OAuth support, and password reset functionality

-- ============================================
-- 1. EMAIL AND GOOGLE ID COLUMNS
-- ============================================

-- Add email column (NULLable for backward compatibility)
-- Existing users can continue using phone-only login
-- Note: UNIQUE constraint added via index below (SQLite limitation)
ALTER TABLE users ADD COLUMN email TEXT;

-- Add Google ID column (NULLable)
-- For users who sign in with Google
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Add email verification status (DEFAULT 0 = not verified)
-- Optional feature for future email verification requirement
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- ============================================
-- 2. PASSWORD RESET TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for cleanup job (find expired tokens)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Index for cleanup of used tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used) WHERE used = 1;

-- ============================================
-- 3. USER INDEXES
-- ============================================

-- Unique index on email (only for non-NULL values, allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Index on email for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Unique index on google_id (only for non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;

-- Index on google_id for fast Google OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Composite index for email/phone login (covers both login methods)
CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email, phone);
-- 
-- Backward Compatibility:
-- - email column is NULLable, so existing phone-only users are unaffected
-- - google_id column is NULLable, only populated for Google Sign-In users
-- - email_verified defaults to 0 (not verified), can be enabled later
--
-- Security:
-- - password_reset_tokens table stores one-time use tokens
-- - Tokens have expiry time (15 minutes recommended)
-- - Used tokens are marked but kept for audit trail
--
-- Rollback:
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_users_email_phone;
-- DROP INDEX IF EXISTS idx_password_reset_tokens_user;
-- DROP INDEX IF EXISTS idx_password_reset_tokens_expires;
-- DROP INDEX IF EXISTS idx_users_google_id;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP TABLE IF EXISTS password_reset_tokens;
-- Note: Cannot drop columns in SQLite without recreating table
