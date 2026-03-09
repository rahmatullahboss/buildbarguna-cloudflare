-- Migration: 017_task_system
-- Description: Add task_start_sessions table for timer-based task verification
-- Date: 2026-03-09
-- Feature: Epic 1 - Member Task System

-- ============================================================
-- TASK START SESSIONS
-- ============================================================
-- Tracks when user starts a task and validates timer completion

CREATE TABLE IF NOT EXISTS task_start_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  task_id       INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  session_date  TEXT NOT NULL DEFAULT (date('now')),
  UNIQUE(user_id, task_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_task_start_sessions_user_date 
  ON task_start_sessions(user_id, session_date);

CREATE INDEX IF NOT EXISTS idx_task_start_sessions_task_date 
  ON task_start_sessions(task_id, session_date);
