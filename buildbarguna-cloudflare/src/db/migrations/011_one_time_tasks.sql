-- Migration 011: Add is_one_time to daily_tasks
-- Purpose: Allow tasks to be one-time only (can complete only once)
-- Run command: wrangler d1 execute buildbarguna-invest-db --file=./src/db/migrations/011_one_time_tasks.sql
-- =====================================================

ALTER TABLE daily_tasks ADD COLUMN is_one_time INTEGER NOT NULL DEFAULT 0;
