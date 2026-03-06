-- Migration: Member Registration System
-- Description: Adds member_registrations table for BBI member registration with PDF certificate support

CREATE TABLE IF NOT EXISTS member_registrations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  form_number           TEXT UNIQUE NOT NULL,  -- Sequential form number (e.g., BBI-2026-0001)
  
  -- Personal Information
  name_english          TEXT NOT NULL,
  name_bangla           TEXT,
  father_name           TEXT NOT NULL,
  mother_name           TEXT NOT NULL,
  date_of_birth         TEXT NOT NULL,
  blood_group           TEXT,
  
  -- Contact Information
  present_address       TEXT NOT NULL,
  permanent_address     TEXT NOT NULL,
  facebook_id           TEXT,
  mobile_whatsapp       TEXT NOT NULL,
  emergency_contact     TEXT,
  email                 TEXT,
  
  -- Additional Fields
  skills_interests      TEXT,
  declaration_accepted  INTEGER NOT NULL DEFAULT 0 CHECK(declaration_accepted IN (0, 1)),
  
  -- Metadata
  user_id               INTEGER NOT NULL REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Ensure one registration per user
  UNIQUE(user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_member_registrations_user ON member_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_member_registrations_form_number ON member_registrations(form_number);
CREATE INDEX IF NOT EXISTS idx_member_registrations_created_at ON member_registrations(created_at);
