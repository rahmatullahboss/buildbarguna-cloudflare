-- Migration 028: Profit Distribution System Enhancements
-- Based on BMAD domain research findings
-- 1. Period lock-out unique constraint (prevent double-distribution)
-- 2. Financial audit log table (immutable append-only)
-- 3. Per-project default company share percentage
-- 4. Dual-admin withdrawal approval columns

-- ──────────────────────────────────────────────────────────────
-- 1. Period Lock-out: DB-level unique constraint
-- Only one 'distributed' record per project+period combination
-- ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_distribution_period 
ON profit_distributions(project_id, period_start, period_end) 
WHERE status = 'distributed' AND period_start IS NOT NULL AND period_end IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 2. Financial Audit Log — immutable, append-only
-- Records ALL financial state changes for compliance
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- What changed
    entity_type     TEXT NOT NULL
        CHECK(entity_type IN (
            'profit_distribution',
            'company_fund',
            'user_balance',
            'shareholder_profit'
        )),
    entity_id       INTEGER NOT NULL,
    
    -- Action performed
    action          TEXT NOT NULL
        CHECK(action IN (
            'create', 'distribute', 'cancel',
            'credit', 'debit', 'withdraw',
            'approve', 'reject', 'adjust'
        )),
    
    -- Snapshot data (JSON)
    old_values      TEXT,   -- JSON: state before action (NULL for 'create')
    new_values      TEXT,   -- JSON: state after action
    
    -- Context
    amount_paisa    INTEGER,            -- amount involved (for quick filtering)
    description     TEXT,               -- human-readable description
    
    -- Actor
    actor_id        INTEGER NOT NULL REFERENCES users(id),
    
    -- Timestamp (immutable — no updated_at!)
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fal_entity ON financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fal_action ON financial_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_fal_actor ON financial_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_fal_date ON financial_audit_log(created_at);

-- ──────────────────────────────────────────────────────────────
-- 3. Per-project default company share percentage
-- Stored in basis points: 3000 = 30%
-- ──────────────────────────────────────────────────────────────

ALTER TABLE projects ADD COLUMN default_company_share_pct INTEGER NOT NULL DEFAULT 3000;

-- ──────────────────────────────────────────────────────────────
-- 4. Dual-admin withdrawal approval columns
-- Withdrawals/expenses now require a second admin to approve
-- ──────────────────────────────────────────────────────────────

ALTER TABLE company_fund_transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'
    CHECK(status IN ('pending_approval', 'approved', 'rejected', 'completed'));

ALTER TABLE company_fund_transactions ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE company_fund_transactions ADD COLUMN approved_at TEXT;
ALTER TABLE company_fund_transactions ADD COLUMN rejection_reason TEXT;

-- Existing profit_share records are 'completed' (auto-approved on distribution)
-- Only manual withdrawals/expenses will go through approval flow
