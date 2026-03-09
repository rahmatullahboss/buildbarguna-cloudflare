-- Migration: 018_point_wallet_system
-- Description: Add point wallet, settlements, and withdrawals tables
-- Date: 2026-03-09
-- Feature: Epic 3 & 4 - Point Wallet System

-- ============================================================
-- POINT WALLETS
-- ============================================================
-- Stores settled points that can be withdrawn

CREATE TABLE IF NOT EXISTS point_wallets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id),
  balance           INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_added    INTEGER NOT NULL DEFAULT 0,
  lifetime_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_settled_at   TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_point_wallets_user ON point_wallets(user_id);

-- ============================================================
-- POINT SETTLEMENTS
-- ============================================================
-- Audit trail of monthly settlements

CREATE TABLE IF NOT EXISTS point_settlements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  month           TEXT NOT NULL,
  points_settled  INTEGER NOT NULL,
  from_balance    INTEGER NOT NULL,
  to_wallet       INTEGER NOT NULL,
  settled_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_point_settlements_user_month ON point_settlements(user_id, month);

-- ============================================================
-- POINT WITHDRAWALS
-- ============================================================
-- Withdrawal requests from wallet

CREATE TABLE IF NOT EXISTS point_withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_points   INTEGER NOT NULL CHECK(amount_points >= 200),
  amount_taka     INTEGER NOT NULL,
  bkash_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_point_withdrawals_user ON point_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_point_withdrawals_status ON point_withdrawals(status);

-- ============================================================
-- POINT SETTINGS
-- ============================================================
-- Configuration for point system

CREATE TABLE IF NOT EXISTS point_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO point_settings (key, value) VALUES
  ('min_cashout_points', '200'),
  ('points_to_taka_rate', '1');

-- ============================================================
-- ADD SETTLED_POINTS TO USER_POINTS (if not exists)
-- ============================================================
-- Track points that have been settled to wallet

ALTER TABLE user_points ADD COLUMN settled_points INTEGER NOT NULL DEFAULT 0;
