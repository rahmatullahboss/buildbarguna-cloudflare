-- Migration: Member Payment Views
-- Description: Creates database views for pending and verified member payments
-- Issue: 3.2 - Database views v_member_payments_pending and v_member_payments_verified not created
-- Related: Issue 3.6 - Member routes not exported/registered

-- Drop existing views if they exist (for clean recreation)
DROP VIEW IF EXISTS v_member_payments_pending;
DROP VIEW IF EXISTS v_member_payments_verified;

-- View for pending payment verifications (admin dashboard)
CREATE VIEW v_member_payments_pending AS
SELECT
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.name_bangla,
  mr.payment_method,
  mr.payment_amount,
  mr.bkash_number,
  mr.bkash_trx_id,
  mr.payment_note,
  mr.created_at,
  u.phone as user_phone,
  u.name as user_name,
  u.id as user_id
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
WHERE mr.payment_status = 'pending'
ORDER BY mr.created_at DESC;

-- View for verified member payments (audit trail)
CREATE VIEW v_member_payments_verified AS
SELECT
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.name_bangla,
  mr.payment_method,
  mr.payment_amount,
  mr.bkash_trx_id,
  mr.verified_by,
  mr.verified_at,
  admin.name as verified_by_name,
  admin.phone as verified_by_phone
FROM member_registrations mr
LEFT JOIN users admin ON mr.verified_by = admin.id
WHERE mr.payment_status = 'verified'
ORDER BY mr.verified_at DESC;

-- Additional view for all payment records (comprehensive admin view)
CREATE VIEW v_member_payments_all AS
SELECT
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.name_bangla,
  mr.payment_method,
  mr.payment_amount,
  mr.payment_status,
  mr.bkash_number,
  mr.bkash_trx_id,
  mr.payment_note,
  mr.verified_by,
  mr.verified_at,
  mr.created_at,
  u.phone as user_phone,
  u.name as user_name,
  admin.name as verified_by_name
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
LEFT JOIN users admin ON mr.verified_by = admin.id
ORDER BY mr.created_at DESC;
