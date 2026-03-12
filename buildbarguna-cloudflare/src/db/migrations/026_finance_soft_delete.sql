-- Migration 026: Add soft-delete support for project_transactions (H2 fix)
-- Finance transactions should never be hard-deleted for audit trail compliance

ALTER TABLE project_transactions ADD COLUMN deleted_at TEXT DEFAULT NULL;

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_project_transactions_deleted_at 
ON project_transactions(deleted_at);
