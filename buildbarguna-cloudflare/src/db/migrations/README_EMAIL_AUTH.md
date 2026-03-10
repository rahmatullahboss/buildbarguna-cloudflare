# Email Authentication Migration Guide

## Overview

This migration adds email-based authentication, Google OAuth support, and password reset functionality to the BuildBarguna platform.

**Migration File:** `src/db/migrations/022_email_authentication.sql`  
**Date Created:** March 10, 2026  
**Status:** Ready for production deployment

---

## What Changes

### New Columns in `users` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `email` | TEXT | YES | NULL | User's email address (optional, unique when present) |
| `google_id` | TEXT | YES | NULL | Google OAuth ID (for Google Sign-In) |
| `email_verified` | INTEGER | YES | 0 | Email verification status (0 = not verified, 1 = verified) |

### New Table: `password_reset_tokens`

| Column | Type | Description |
|--------|------|-------------|
| `token` | TEXT | Primary key, unique reset token |
| `user_id` | INTEGER | Foreign key to users table |
| `expires_at` | INTEGER | Unix timestamp when token expires |
| `used` | INTEGER | Flag (0 = unused, 1 = used) |
| `created_at` | TEXT | ISO timestamp when token was created |

### New Indexes

```sql
-- Unique constraints (allow NULLs)
idx_users_email_unique        -- Unique email (when present)
idx_users_google_id_unique    -- Unique Google ID (when present)
idx_users_phone_unique        -- Unique phone (when present)
idx_users_referral_code_unique -- Unique referral code (when present)

-- Performance indexes
idx_users_email               -- Fast email login lookups
idx_users_google_id           -- Fast Google OAuth lookups
idx_users_email_phone         -- Combined login lookup
idx_password_reset_tokens_expires  -- Token cleanup
idx_password_reset_tokens_user     -- User's reset tokens
```

---

## Backward Compatibility

✅ **Fully backward compatible**

- Existing users can continue using phone-only login
- `email` and `google_id` columns are NULLable
- No existing data is modified
- Old API endpoints continue working

---

## Migration Steps

### Local Development

```bash
# 1. Navigate to project directory
cd buildbarguna-cloudflare

# 2. Run migration on local database
wrangler d1 execute buildbarguna-invest-db --local --file=src/db/migrations/022_email_authentication.sql

# 3. Verify migration
wrangler d1 execute buildbarguna-invest-db --local --command "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='users';"
```

### Production Deployment

```bash
# 1. Backup database (recommended)
wrangler d1 execute buildbarguna-invest-db --remote --command ".backup backup_before_email_auth.sql"

# 2. Run migration on production
wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/022_email_authentication.sql

# 3. Verify migration
wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT COUNT(*) FROM users;"
wrangler d1 execute buildbarguna-invest-db --remote --command "PRAGMA table_info(users);"
```

---

## Verification Queries

```sql
-- Check new columns exist
PRAGMA table_info(users);

-- Check new table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens';

-- Check new indexes
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users';

-- Count users (should remain unchanged)
SELECT COUNT(*) FROM users;
```

---

## Rollback Plan

⚠️ **Important:** SQLite doesn't support dropping columns directly. Full rollback requires:

1. Create new table without new columns
2. Copy data from migrated table
3. Drop migrated table
4. Rename new table to original name

```sql
-- Rollback script (use with caution)
-- This is destructive - backup first!

BEGIN TRANSACTION;

-- 1. Create backup table (old schema)
CREATE TABLE IF NOT EXISTS users_backup (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member',
  referral_code    TEXT UNIQUE,
  referred_by      TEXT,
  referrer_user_id INTEGER REFERENCES users(id),
  is_active        INTEGER DEFAULT 1,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- 2. Copy data (email/google_id users will lose data)
INSERT INTO users_backup SELECT 
  id, name, phone, password_hash, role, referral_code,
  referred_by, referrer_user_id, is_active, created_at
FROM users;

-- 3. Drop migrated table
DROP TABLE users;

-- 4. Rename backup to original
ALTER TABLE users_backup RENAME TO users;

-- 5. Drop new indexes
DROP INDEX IF EXISTS idx_users_email_unique;
DROP INDEX IF EXISTS idx_users_google_id_unique;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_email_phone;

-- 6. Drop new table
DROP TABLE IF EXISTS password_reset_tokens;

COMMIT;
```

---

## Security Considerations

### Email Uniqueness

- Enforced via partial unique index: `WHERE email IS NOT NULL`
- Allows multiple users with NULL email (phone-only users)
- Prevents duplicate email addresses

### Password Reset Tokens

- Tokens are single-use (marked as `used=1` after redemption)
- Tokens expire after 15 minutes (recommended)
- Rate limiting: max 3 requests per hour per email

### Google OAuth

- Google ID stored securely (never exposed to client)
- JWT tokens include Google authentication status
- Account linking requires existing authentication

---

## API Changes

This migration enables the following new API endpoints:

```
POST /api/auth/register          # Now accepts email (required) + phone (optional)
POST /api/auth/login             # Now accepts email OR phone
POST /api/auth/forgot-password   # NEW: Request password reset
POST /api/auth/reset-password    # NEW: Complete password reset
GET  /api/auth/google            # NEW: Google OAuth redirect
GET  /api/auth/google/callback   # NEW: Google OAuth callback
```

---

## Frontend Changes Required

After migration, update frontend components:

1. **Login.tsx** - Add email input field, Google Sign-In button
2. **Register.tsx** - Add email field (required), make phone optional
3. **ForgotPassword.tsx** - New page for password reset request
4. **ResetPassword.tsx** - New page for password completion
5. **api.ts** - Update API functions for new endpoints

---

## Troubleshooting

### Migration Fails with "UNIQUE constraint failed"

**Cause:** Existing duplicate emails in database

**Solution:**
```sql
-- Find duplicates
SELECT email, COUNT(*) as cnt FROM users WHERE email IS NOT NULL GROUP BY email HAVING cnt > 1;

-- Fix duplicates (append user ID)
UPDATE users SET email = email || '-' || id WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) as rn
    FROM users WHERE email IS NOT NULL
  ) WHERE rn > 1
);
```

### Migration Fails with "column already exists"

**Cause:** Migration already partially applied

**Solution:** Check which columns exist and manually skip those steps

```sql
PRAGMA table_info(users);
-- Check which columns exist, then edit migration file
```

---

## Support

For issues or questions:
- Check migration logs: `wrangler tail buildbarguna-worker`
- Review error messages in Cloudflare Dashboard
- Contact development team

---

## Changelog

- **v1.0.0** (March 10, 2026) - Initial migration created
  - Email authentication support
  - Google OAuth integration
  - Password reset system
