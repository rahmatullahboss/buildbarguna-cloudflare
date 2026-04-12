-- =====================================================
-- Migration 034: Project Compliance & Governance
-- =====================================================

CREATE TABLE IF NOT EXISTS project_compliance_profiles (
  project_id                          INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  contract_type                       TEXT NOT NULL DEFAULT 'musharakah'
    CHECK(contract_type IN ('musharakah', 'mudarabah', 'other')),
  shariah_screening_status            TEXT NOT NULL DEFAULT 'pending'
    CHECK(shariah_screening_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  ops_reconciliation_status           TEXT NOT NULL DEFAULT 'pending'
    CHECK(ops_reconciliation_status IN ('pending', 'completed', 'blocked')),
  loss_settlement_status              TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK(loss_settlement_status IN ('not_applicable', 'pending_review', 'resolved', 'blocked')),
  prohibited_activities_screened      INTEGER NOT NULL DEFAULT 0,
  asset_backing_confirmed             INTEGER NOT NULL DEFAULT 0,
  profit_ratio_disclosed              INTEGER NOT NULL DEFAULT 0,
  loss_sharing_clause_confirmed       INTEGER NOT NULL DEFAULT 0,
  principal_risk_notice_confirmed     INTEGER NOT NULL DEFAULT 0,
  use_of_proceeds                     TEXT,
  profit_loss_policy                  TEXT,
  principal_risk_notice               TEXT,
  shariah_notes                       TEXT,
  ops_notes                           TEXT,
  loss_settlement_notes               TEXT,
  external_reviewer_name              TEXT,
  approved_by                         INTEGER REFERENCES users(id),
  approved_at                         TEXT,
  updated_by                          INTEGER REFERENCES users(id),
  updated_at                          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_compliance_shariah_status
  ON project_compliance_profiles(shariah_screening_status);

CREATE INDEX IF NOT EXISTS idx_project_compliance_ops_status
  ON project_compliance_profiles(ops_reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_project_compliance_loss_status
  ON project_compliance_profiles(loss_settlement_status);
