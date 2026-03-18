-- =====================================================
-- Migration 033: Fix project status CHECK constraint
-- =====================================================
-- Problem: Original CHECK(status IN ('draft','active','closed')) blocks 'completed' status
-- Fix: Recreate projects table with updated CHECK constraint that includes 'completed'
-- =====================================================

-- 1. Create new table with corrected CHECK constraint
CREATE TABLE IF NOT EXISTS projects_new (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  description      TEXT,
  image_url        TEXT,
  total_capital    INTEGER NOT NULL,
  total_shares     INTEGER NOT NULL,
  share_price      INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed','completed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  location         TEXT,
  category         TEXT,
  start_date       TEXT,
  expected_end_date TEXT,
  completed_at     TEXT,
  progress_pct     INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Copy all existing data
INSERT INTO projects_new (id, title, description, image_url, total_capital, total_shares, share_price, status, created_at, location, category, start_date, expected_end_date, completed_at, progress_pct, updated_at)
SELECT id, title, description, image_url, total_capital, total_shares, share_price, status, created_at,
       location, category, start_date, expected_end_date, completed_at,
       COALESCE(progress_pct, 0),
       COALESCE(updated_at, datetime('now'))
FROM projects;

-- 3. Drop the old table
DROP TABLE projects;

-- 4. Rename new table to projects
ALTER TABLE projects_new RENAME TO projects;

-- 5. Recreate indexes (foreign keys from other tables referencing projects(id) will still work since the id column is preserved)

SELECT 'Migration 033 completed - status CHECK now includes completed!' as status;
