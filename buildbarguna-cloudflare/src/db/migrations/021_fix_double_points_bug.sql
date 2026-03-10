-- Migration 021: Fix double points bug
-- Adds unique constraint to prevent duplicate point_transactions for same task
-- This prevents race conditions where points are added twice

-- Create unique index on point_transactions for task_id per user per day
-- This ensures each task completion only creates one transaction
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_user_task_date 
ON point_transactions(user_id, task_id, date(created_at))
WHERE task_id IS NOT NULL AND transaction_type = 'earned';

-- Note: We use date(created_at) instead of a separate date column
-- This allows the same task to be completed on different days
-- but prevents multiple transactions for the same task on the same day
