-- Migration: 016_member_updated_at_column
-- Description: Add updated_at column to member_registrations table for member edit functionality
-- Date: 2026-03-09

-- Add updated_at column (nullable, no default since D1 doesn't support non-constant defaults)
ALTER TABLE member_registrations ADD COLUMN updated_at TEXT;

-- Backfill existing rows with current timestamp
UPDATE member_registrations SET updated_at = datetime('now') WHERE updated_at IS NULL;

-- Note: The application code handles setting updated_at on each update using:
-- updates.push('updated_at = datetime("now")')
