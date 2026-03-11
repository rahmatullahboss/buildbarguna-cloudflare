-- Migration 023 (corrected): Make users.phone column nullable for Google OAuth support
-- Google users don't have a phone number, so phone must be nullable
-- SQLite doesn't support ALTER COLUMN, so we recreate the table
-- D1 does not support BEGIN/COMMIT but does support PRAGMA defer_foreign_keys

-- Defer FK checks to end of transaction (D1 compatible approach)
PRAGMA defer_foreign_keys=ON;

-- Step 1: Create new users table with phone as nullable
CREATE TABLE users_new (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  phone             TEXT UNIQUE,
  password_hash     TEXT NOT NULL DEFAULT '',
  role              TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  referral_code     TEXT UNIQUE,
  referred_by       TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  referrer_user_id  INTEGER,
  email             TEXT,
  google_id         TEXT,
  email_verified    INTEGER DEFAULT 0
);

-- Step 2: Copy all existing data
INSERT INTO users_new (id, name, phone, password_hash, role, referral_code, referred_by, is_active, created_at, referrer_user_id, email, google_id, email_verified)
SELECT                 id, name, phone, password_hash, role, referral_code, referred_by, is_active, created_at, referrer_user_id, email, google_id, email_verified
FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email, phone);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
