-- Migration: Member Registration Payment System
-- Description: Adds payment support for member registration (৳100 fee)
-- Supports: bKash (01635222142) and Cash payments

-- Add payment columns to member_registrations
ALTER TABLE member_registrations ADD COLUMN payment_method TEXT CHECK(payment_method IN ('bkash', 'cash'));
ALTER TABLE member_registrations ADD COLUMN payment_amount INTEGER DEFAULT 10000;  -- 100 taka in paisa
ALTER TABLE member_registrations ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'verified', 'rejected'));
ALTER TABLE member_registrations ADD COLUMN bkash_number TEXT;  -- Customer bKash number
ALTER TABLE member_registrations ADD COLUMN bkash_trx_id TEXT;  -- bKash transaction ID
ALTER TABLE member_registrations ADD COLUMN payment_note TEXT;  -- Admin note for cash payments
ALTER TABLE member_registrations ADD COLUMN verified_by INTEGER REFERENCES users(id);  -- Admin who verified
ALTER TABLE member_registrations ADD COLUMN verified_at TEXT;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_status ON member_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_method ON member_registrations(payment_method);

-- Update existing registrations to have default payment amount
UPDATE member_registrations SET payment_amount = 10000 WHERE payment_amount IS NULL;

-- Create view for pending payment verifications
CREATE VIEW IF NOT EXISTS v_member_payments_pending AS
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
  u.name as user_name
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
WHERE mr.payment_status = 'pending'
ORDER BY mr.created_at DESC;

-- Create view for verified member payments
CREATE VIEW IF NOT EXISTS v_member_payments_verified AS
SELECT 
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.payment_method,
  mr.payment_amount,
  mr.bkash_trx_id,
  mr.verified_by,
  mr.verified_at,
  admin.name as verified_by_name
FROM member_registrations mr
LEFT JOIN users admin ON mr.verified_by = admin.id
WHERE mr.payment_status = 'verified'
ORDER BY mr.verified_at DESC;
