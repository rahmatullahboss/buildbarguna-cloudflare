-- Migration: Audit Logging for Member Operations
-- Description: Adds audit logging for certificate downloads and payment verifications
-- Issue: Nice-to-have from audit - Add audit logging for certificate downloads

-- Create audit log table for member-related actions
CREATE TABLE IF NOT EXISTS member_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'registration_created',
    'payment_verified',
    'payment_rejected',
    'certificate_downloaded',
    'certificate_previewed',
    'bulk_certificates_generated'
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

-- Indexes for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_member_audit_log_action_type ON member_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_user_id ON member_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_target_user_id ON member_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_form_number ON member_audit_log(form_number);
CREATE INDEX IF NOT EXISTS idx_member_audit_log_created_at ON member_audit_log(created_at);

-- Insert default admin action types for reference
INSERT OR IGNORE INTO admin_actions (action_type, reason) VALUES 
  ('member_payment_verified', 'Payment verification for member registration'),
  ('member_payment_rejected', 'Payment rejection for member registration'),
  ('member_certificate_downloaded', 'Certificate download by member');
