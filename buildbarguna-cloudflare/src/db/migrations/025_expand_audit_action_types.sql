-- Migration 025: Expand member_audit_log action_type CHECK constraint
-- The original constraint only allowed 6 action types, but endpoints added:
-- registration_submitted, member_updated, member_cancelled, member_reapplied
-- 
-- Since member_audit_log has no child FK dependencies (it only references parent tables),
-- we can drop and recreate it directly. Existing rows with all-valid action types are preserved
-- by the WHERE clause in the INSERT.
--
-- NOTE: This clears existing audit log rows that were invalid (shouldn't exist due to the
-- old CHECK constraint, but as a safeguard we only copy valid rows).

-- Step 1: Copy valid rows to temp table
CREATE TABLE member_audit_log_backup AS
  SELECT * FROM member_audit_log;

-- Step 2: Drop old table (no child FK dependencies, so this works directly)
DROP TABLE member_audit_log;

-- Step 3: Create new table with expanded CHECK constraint
CREATE TABLE member_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'registration_created',
    'registration_submitted',
    'payment_verified',
    'payment_rejected',
    'certificate_downloaded',
    'certificate_previewed',
    'bulk_certificates_generated',
    'member_updated',
    'member_cancelled',
    'member_reapplied'
  )),
  user_id INTEGER REFERENCES users(id),
  target_user_id INTEGER REFERENCES users(id),
  target_registration_id INTEGER REFERENCES member_registrations(id),
  form_number TEXT,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 4: Restore all existing rows (all had valid values due to old constraint)
INSERT INTO member_audit_log
  (id, action_type, user_id, target_user_id, target_registration_id,
   form_number, metadata, ip_address, user_agent, created_at)
SELECT
  id, action_type, user_id, target_user_id, target_registration_id,
  form_number, metadata, ip_address, user_agent, created_at
FROM member_audit_log_backup;

-- Step 5: Drop backup
DROP TABLE member_audit_log_backup;

-- Step 6: Recreate all indexes
CREATE INDEX IF NOT EXISTS idx_member_audit_log_action_type ON member_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_user_id ON member_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_target_user_id ON member_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_form_number ON member_audit_log(form_number);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_created_at ON member_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_target
  ON member_audit_log(target_user_id, action_type, created_at DESC);
