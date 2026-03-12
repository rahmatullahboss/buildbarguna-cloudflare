-- Migration 030: Fix duplicate transaction categories
-- Problem: transaction_categories had no UNIQUE constraint on (name, type),
--          so INSERT OR IGNORE silently inserted duplicates on every schema/seed run.

-- Step 1: Remove duplicates — keep only the row with the lowest id per (name, type)
DELETE FROM transaction_categories 
WHERE id NOT IN (
  SELECT MIN(id) FROM transaction_categories GROUP BY name, type
);

-- Step 2: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_categories_name_type 
ON transaction_categories(name, type);
