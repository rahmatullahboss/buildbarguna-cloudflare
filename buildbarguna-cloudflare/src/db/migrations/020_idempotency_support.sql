-- Migration 020: Add idempotency support for share purchases
-- Adds idempotency_key column to prevent duplicate purchases from network retries

-- Add idempotency_key column to share_purchases (nullable initially)
ALTER TABLE share_purchases ADD COLUMN idempotency_key TEXT;

-- Create index for faster idempotency lookups
CREATE INDEX IF NOT EXISTS idx_share_purchases_idempotency 
ON share_purchases(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add updated_at trigger for share_purchases (if not exists)
DROP TRIGGER IF EXISTS update_share_purchases_updated_at;
CREATE TRIGGER update_share_purchases_updated_at
AFTER UPDATE ON share_purchases
BEGIN
  UPDATE share_purchases SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Note: UNIQUE constraint not added to existing table to avoid migration issues
-- Application-level validation ensures uniqueness for new records
