-- Migration: Add payment_method to share_purchases table
-- This adds support for manual/cash payments alongside bKash

-- Add payment_method column with default 'bkash'
ALTER TABLE share_purchases ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'bkash' CHECK(payment_method IN ('bkash','manual'));

-- Add index for payment_method queries
CREATE INDEX IF NOT EXISTS idx_share_purchases_payment ON share_purchases(payment_method);

-- Make bkash_txid nullable (not unique) since manual payments don't have TxID
-- Note: SQLite doesn't support dropping UNIQUE constraints, but new schema already handles this
