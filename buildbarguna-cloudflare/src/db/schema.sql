CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  referral_code    TEXT UNIQUE,
  referred_by      TEXT,                              -- legacy: kept for migration compatibility
  referrer_user_id INTEGER REFERENCES users(id),     -- FK to referrer (preferred over referred_by string)
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT,
  total_capital INTEGER NOT NULL,
  total_shares  INTEGER NOT NULL,
  share_price   INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS share_purchases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  quantity      INTEGER NOT NULL CHECK(quantity > 0),
  total_amount  INTEGER NOT NULL,
  bkash_txid    TEXT,
  payment_method TEXT NOT NULL DEFAULT 'bkash' CHECK(payment_method IN ('bkash','manual')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  admin_note    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_shares (
  user_id       INTEGER NOT NULL REFERENCES users(id),
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  quantity      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS profit_rates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  month       TEXT NOT NULL,
  rate        INTEGER NOT NULL CHECK(rate >= 0),  -- basis points, never negative
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, month)
);

CREATE TABLE IF NOT EXISTS earnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  month       TEXT NOT NULL,
  shares      INTEGER NOT NULL CHECK(shares > 0),
  rate        INTEGER NOT NULL CHECK(rate >= 0),  -- basis points, never negative
  amount      INTEGER NOT NULL CHECK(amount >= 0), -- paisa, never negative
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, project_id, month)
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  platform        TEXT CHECK(platform IN ('facebook','youtube','telegram','other')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_completions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  task_id       INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at    TEXT,
  completed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  task_date     TEXT NOT NULL,
  UNIQUE(user_id, task_id, task_date)
);

-- Referral bonuses: credited when referred user gets first investment approved
CREATE TABLE IF NOT EXISTS referral_bonuses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  trigger_event    TEXT NOT NULL DEFAULT 'first_investment',
  amount_paisa     INTEGER NOT NULL CHECK(amount_paisa > 0),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(referrer_user_id, referred_user_id, trigger_event)
);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti        TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_paisa    INTEGER NOT NULL CHECK(amount_paisa >= 10000),  -- minimum ৳100
  bkash_number    TEXT NOT NULL,                                   -- 01[3-9]\d{8}
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','approved','completed','rejected')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),                    -- admin user id
  bkash_txid      TEXT UNIQUE,                                     -- set on completion
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at     TEXT,                                            -- when admin approved
  completed_at    TEXT,                                            -- when bKash sent
  rejected_at     TEXT                                             -- when rejected
);

-- Partial unique index: one pending withdrawal per user at a time
-- (UNIQUE constraint won't work here — it would block multiple rejected entries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_user
  ON withdrawals(user_id) WHERE status = 'pending';

-- Withdrawal settings: key-value store for configurable limits
CREATE TABLE IF NOT EXISTS withdrawal_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings (INSERT OR IGNORE — won't overwrite admin changes)
INSERT OR IGNORE INTO withdrawal_settings (key, value) VALUES
  ('min_paisa',           '10000'),   -- ৳100 minimum
  ('max_paisa',           '500000'),  -- ৳5,000 maximum per request
  ('cooldown_days',       '7'),       -- 7 days between requests
  ('referral_bonus_paisa','5000');    -- ৳50 referral bonus on first investment

CREATE INDEX IF NOT EXISTS idx_share_purchases_user       ON share_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_share_purchases_status     ON share_purchases(status);
CREATE INDEX IF NOT EXISTS idx_share_purchases_project    ON share_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_share_purchases_payment   ON share_purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_user_shares_project        ON user_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user              ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_month             ON earnings(month);
CREATE INDEX IF NOT EXISTS idx_earnings_user_month        ON earnings(user_id, month);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_date ON task_completions(task_id, task_date);
CREATE INDEX IF NOT EXISTS idx_users_phone                ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code        ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_user_id     ON users(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_profit_rates_month         ON profit_rates(month);
CREATE INDEX IF NOT EXISTS idx_profit_rates_project_month ON profit_rates(project_id, month);
CREATE INDEX IF NOT EXISTS idx_earnings_project           ON earnings(project_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user_project      ON earnings(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_user           ON user_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user           ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status         ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_requested ON withdrawals(user_id, requested_at);

-- ============================================
-- PROJECT FINANCE & PROFIT DISTRIBUTION TABLES
-- ============================================

-- ১. প্রজেক্ট ফাইনান্সিয়াল ট্রানজেকশন (খরচ ও আয়)
CREATE TABLE IF NOT EXISTS project_transactions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('expense', 'revenue')),
    amount           INTEGER NOT NULL CHECK(amount > 0),  -- paisa
    category         TEXT NOT NULL,
    description      TEXT,
    transaction_date TEXT NOT NULL DEFAULT (date('now')),
    created_by       INTEGER NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ২. ক্যাটাগরি টেবিল (খরচ/আয়ের ধরন)
CREATE TABLE IF NOT EXISTS transaction_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('expense', 'revenue')),
    is_active   INTEGER NOT NULL DEFAULT 1
);

-- ৩. প্রফিট ডিস্ট্রিবিউশন ব্যাচ
CREATE TABLE IF NOT EXISTS profit_distributions (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id               INTEGER NOT NULL REFERENCES projects(id),
    total_revenue            INTEGER NOT NULL DEFAULT 0,    -- paisa
    total_expense            INTEGER NOT NULL DEFAULT 0,    -- paisa
    net_profit               INTEGER NOT NULL DEFAULT 0,    -- paisa
    distributable_amount     INTEGER NOT NULL DEFAULT 0,    -- paisa
    company_share_percentage  INTEGER NOT NULL DEFAULT 30,   -- basis points (30% = 3000)
    investor_share_percentage INTEGER NOT NULL DEFAULT 70,   -- basis points (70% = 7000)
    period_start             TEXT,
    period_end               TEXT,
    status                   TEXT NOT NULL DEFAULT 'pending' 
        CHECK(status IN ('pending', 'approved', 'distributed', 'cancelled')),
    distributed_at           TEXT,
    created_by               INTEGER NOT NULL REFERENCES users(id),
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ৪. শেয়ারহোল্ডার প্রফিট রেকর্ড
CREATE TABLE IF NOT EXISTS shareholder_profits (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id       INTEGER NOT NULL REFERENCES profit_distributions(id),
    project_id            INTEGER NOT NULL REFERENCES projects(id),
    user_id               INTEGER NOT NULL REFERENCES users(id),
    shares_held           INTEGER NOT NULL,
    total_shares          INTEGER NOT NULL,
    ownership_percentage  INTEGER NOT NULL DEFAULT 0,  -- basis points
    profit_amount         INTEGER NOT NULL DEFAULT 0,  -- paisa
    status                TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'credited', 'withdrawn')),
    credited_at           TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ডিফল্ট ক্যাটাগরি
INSERT OR IGNORE INTO transaction_categories (name, type) VALUES
    ('নির্মাণ সামগ্রী', 'expense'),
    ('শ্রমিক বেতন', 'expense'),
    ('পরিবহন', 'expense'),
    ('ইউটিলিটি বিল', 'expense'),
    ('সরকারি ফি/ট্যাক্স', 'expense'),
    ('ম্যানেজমেন্ট ফি', 'expense'),
    ('অন্যান্য খরচ', 'expense'),
    ('ইউনিট বিক্রি', 'revenue'),
    ('ভাড়া আয়', 'revenue'),
    ('সার্ভিস চার্জ', 'revenue'),
    ('অন্যান্য আয়', 'revenue');

-- ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_project_transactions_project   ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type      ON project_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date       ON project_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_project    ON profit_distributions(project_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_status     ON profit_distributions(status);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_user        ON shareholder_profits(user_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_distribution ON shareholder_profits(distribution_id);
