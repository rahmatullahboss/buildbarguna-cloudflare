-- Migration 027: Profit Distribution Redesign
-- 1. Add missing columns to profit_distributions
-- 2. Create company_fund_transactions table
-- 3. Fix re-distribution tracking

-- ──────────────────────────────────────────────────────────────
-- 1. Add columns to profit_distributions
-- ──────────────────────────────────────────────────────────────

-- company_share_amount: actual BDT going to company fund (was computed but never stored)
ALTER TABLE profit_distributions ADD COLUMN company_share_amount INTEGER NOT NULL DEFAULT 0;

-- total_distributed_amount: company + investors (full amount removed from available profit)
-- Previously only distributable_amount (investor pool) was tracked → re-distribution bug!
ALTER TABLE profit_distributions ADD COLUMN total_distributed_amount INTEGER NOT NULL DEFAULT 0;

-- notes: reason / description for this distribution batch
ALTER TABLE profit_distributions ADD COLUMN notes TEXT;

-- shareholders_count: snapshot of how many shareholders received profit
ALTER TABLE profit_distributions ADD COLUMN shareholders_count INTEGER NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- 2. Company Fund Table
-- Full accounting for company's share of profits
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_fund_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Source
    project_id      INTEGER REFERENCES projects(id),           -- which project generated this
    distribution_id INTEGER REFERENCES profit_distributions(id), -- which distribution batch

    -- Amount
    amount_paisa    INTEGER NOT NULL CHECK(amount_paisa != 0),  -- positive = credit, negative = debit
    transaction_type TEXT NOT NULL
        CHECK(transaction_type IN (
            'profit_share',    -- from project profit distribution
            'withdrawal',      -- admin withdrew from company fund
            'adjustment',      -- manual admin adjustment
            'expense'          -- company operating expense paid from fund
        )),

    -- Context
    description     TEXT NOT NULL,
    reference_type  TEXT,   -- 'profit_distribution', 'company_expense', etc.
    reference_id    INTEGER,

    -- Audit
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_company_fund_project ON company_fund_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_company_fund_distribution ON company_fund_transactions(distribution_id);
CREATE INDEX IF NOT EXISTS idx_company_fund_type ON company_fund_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_company_fund_date ON company_fund_transactions(created_at);

-- ──────────────────────────────────────────────────────────────
-- 3. Migrate existing distributions: populate the new columns
--    For old records: total_distributed_amount = distributable_amount + company share
--    We can calculate: if distributable_amount = investor_pool, and company_share_pct is stored:
--    net_profit * company_pct / 10000 ≈ company_share (but company_share_percentage is in basis points in existing rows)
--    Safest: set total_distributed_amount = net_profit for distributed batches (full amount removed)
-- ──────────────────────────────────────────────────────────────

UPDATE profit_distributions
SET 
    company_share_amount = CASE 
        WHEN status = 'distributed' AND net_profit > 0 
        THEN net_profit - distributable_amount
        ELSE 0
    END,
    total_distributed_amount = CASE 
        WHEN status = 'distributed' 
        THEN net_profit
        ELSE 0
    END
WHERE total_distributed_amount = 0 AND status = 'distributed';
