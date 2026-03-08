-- ============================================
-- Migration: 014_membership_edit_cancel_reapply
-- Description: Add membership status, cancellation and reapplication support
-- Date: 2026-03-08
-- ============================================

-- 1. Add status column to track active/cancelled state
-- Note: Default to 'active' for existing records
ALTER TABLE member_registrations ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'rejected'));

-- 2. Add cancellation tracking columns
ALTER TABLE member_registrations ADD COLUMN cancelled_at TEXT;
ALTER TABLE member_registrations ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
ALTER TABLE member_registrations ADD COLUMN cancellation_reason TEXT;

-- 3. Add column to link new registration to previous one (for reapplication)
ALTER TABLE member_registrations ADD COLUMN previous_registration_id INTEGER REFERENCES member_registrations(id);

-- 4. Update existing records to have active status
UPDATE member_registrations SET status = 'active' WHERE status IS NULL;

-- 5. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_member_registrations_status ON member_registrations(status);
CREATE INDEX IF NOT EXISTS idx_member_registrations_cancelled_at ON member_registrations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_member_registrations_previous ON member_registrations(previous_registration_id);

-- 6. Create view for cancelled members (for admin)
CREATE VIEW IF NOT EXISTS v_member_cancelled AS
SELECT 
    mr.*,
    u.name as user_name,
    u.phone as user_phone,
    cancelled_user.name as cancelled_by_name
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
LEFT JOIN users cancelled_user ON mr.cancelled_by = cancelled_user.id
WHERE mr.status = 'cancelled';

-- 7. Create view for members who can reapply (cancelled members)
CREATE VIEW IF NOT EXISTS v_member_can_reapply AS
SELECT 
    mr.*,
    u.name as user_name,
    u.phone as user_phone
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
WHERE mr.status = 'cancelled';
