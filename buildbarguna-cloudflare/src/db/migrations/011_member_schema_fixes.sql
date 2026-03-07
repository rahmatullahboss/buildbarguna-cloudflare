-- Migration: Member Registration Schema Fixes
-- Description: Adds missing payment status fields to member_registrations table
-- Issue: 3.3 - Payment status fields missing in member_registrations table schema

-- Add payment_status column if not exists (for existing databases)
-- Note: Migration 008 already adds these, but this ensures consistency
ALTER TABLE member_registrations ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'verified', 'rejected'));
ALTER TABLE member_registrations ADD COLUMN verified_by INTEGER REFERENCES users(id);
ALTER TABLE member_registrations ADD COLUMN verified_at TEXT;

-- Update existing registrations to have proper payment status
UPDATE member_registrations SET payment_status = 'pending' WHERE payment_status IS NULL;
UPDATE member_registrations SET payment_amount = 10000 WHERE payment_amount IS NULL;

-- Create indexes for efficient payment lookups
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_status ON member_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_method ON member_registrations(payment_method);
CREATE INDEX IF NOT EXISTS idx_member_registrations_verified_by ON member_registrations(verified_by);
