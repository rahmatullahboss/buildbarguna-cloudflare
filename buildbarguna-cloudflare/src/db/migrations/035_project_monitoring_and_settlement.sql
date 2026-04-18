-- 035_project_monitoring_and_settlement.sql
-- Add project member assignments and immutable closeout settlement ledger.

CREATE TABLE IF NOT EXISTS project_members (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id            INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_label            TEXT,
    status                TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'inactive', 'removed')),
    assigned_by           INTEGER REFERENCES users(id),
    assigned_at           TEXT NOT NULL DEFAULT (datetime('now')),
    removed_by            INTEGER REFERENCES users(id),
    removed_at            TEXT,
    notes                 TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_active_unique
  ON project_members(project_id, user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS project_closeout_runs (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id                  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mode                        TEXT NOT NULL CHECK(mode IN ('completed', 'closed')),
    status                      TEXT NOT NULL DEFAULT 'completed'
        CHECK(status IN ('pending', 'completed', 'reversed')),
    net_profit_paisa            INTEGER NOT NULL DEFAULT 0,
    capital_refund_total_paisa  INTEGER NOT NULL DEFAULT 0,
    final_profit_pool_paisa     INTEGER NOT NULL DEFAULT 0,
    shareholders_count          INTEGER NOT NULL DEFAULT 0,
    executed_by                 INTEGER NOT NULL REFERENCES users(id),
    executed_at                 TEXT NOT NULL DEFAULT (datetime('now')),
    notes                       TEXT,
    created_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_closeout_runs_project ON project_closeout_runs(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_closeout_runs_project_completed
  ON project_closeout_runs(project_id) WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS project_settlement_entries (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id              INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closeout_run_id         INTEGER NOT NULL REFERENCES project_closeout_runs(id) ON DELETE CASCADE,
    entry_type              TEXT NOT NULL
        CHECK(entry_type IN ('principal_refund', 'final_profit_payout', 'closeout_adjustment')),
    amount_paisa            INTEGER NOT NULL,
    shares_held_snapshot    INTEGER NOT NULL DEFAULT 0,
    total_shares_snapshot   INTEGER NOT NULL DEFAULT 0,
    ownership_bps_snapshot  INTEGER NOT NULL DEFAULT 0,
    project_status_snapshot TEXT,
    source_reference_type   TEXT,
    source_reference_id     INTEGER,
    claim_status            TEXT NOT NULL DEFAULT 'claimable'
        CHECK(claim_status IN ('claimable', 'reserved', 'withdrawn', 'reversed')),
    withdrawal_id           INTEGER REFERENCES withdrawals(id) ON DELETE SET NULL,
    notes                   TEXT,
    created_by              INTEGER REFERENCES users(id),
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_settlement_entries_project
  ON project_settlement_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_settlement_entries_user
  ON project_settlement_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_project_settlement_entries_run
  ON project_settlement_entries(closeout_run_id);
CREATE INDEX IF NOT EXISTS idx_project_settlement_entries_claim_status
  ON project_settlement_entries(claim_status);
