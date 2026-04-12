CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  phone            TEXT,                              -- Now optional (was NOT NULL UNIQUE)
  email            TEXT,                              -- NEW: Email for login (optional)
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  referral_code    TEXT,
  referred_by      TEXT,                              -- legacy: kept for migration compatibility
  referrer_user_id INTEGER REFERENCES users(id),     -- FK to referrer (preferred over referred_by string)
  google_id        TEXT,                              -- NEW: For Google Sign-In
  email_verified   INTEGER DEFAULT 0,                 -- NEW: Email verification status
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Unique indexes for users (allow NULLs, but enforce uniqueness when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique ON users(referral_code) WHERE referral_code IS NOT NULL;

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
  idempotency_key TEXT UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_share_purchases_idempotency 
ON share_purchases(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS task_types (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL UNIQUE,
    display_name      TEXT NOT NULL,
    base_points       INTEGER NOT NULL DEFAULT 0 CHECK(base_points >= 0),
    cooldown_seconds  INTEGER NOT NULL DEFAULT 30 CHECK(cooldown_seconds >= 0),
    daily_limit       INTEGER NOT NULL DEFAULT 10 CHECK(daily_limit >= 1),
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  platform        TEXT CHECK(platform IN ('facebook','youtube','telegram','other')),
  points          INTEGER NOT NULL DEFAULT 5,
  cooldown_seconds INTEGER NOT NULL DEFAULT 30,
  daily_limit     INTEGER NOT NULL DEFAULT 20,
  is_one_time     INTEGER NOT NULL DEFAULT 0,
  task_type_id    INTEGER REFERENCES task_types(id),
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
  points_earned INTEGER NOT NULL DEFAULT 0,
  completion_time_seconds INTEGER,
  is_flagged    INTEGER DEFAULT 0,
  flag_reason   TEXT,
  is_one_time   INTEGER DEFAULT 0,
  UNIQUE(user_id, task_id, task_date)
);

-- Task start sessions - tracks when user starts a task (for cooldown)
CREATE TABLE IF NOT EXISTS task_start_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  task_id       INTEGER NOT NULL REFERENCES daily_tasks(id),
  clicked_at    TEXT NOT NULL,
  session_date  TEXT NOT NULL,
  UNIQUE(user_id, task_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_task_start_sessions_user_date ON task_start_sessions(user_id, session_date);

CREATE TABLE IF NOT EXISTS user_points (
    user_id           INTEGER PRIMARY KEY REFERENCES users(id),
    available_points  INTEGER NOT NULL DEFAULT 0 CHECK(available_points >= 0),
    lifetime_earned   INTEGER NOT NULL DEFAULT 0,
    lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
    monthly_earned    INTEGER NOT NULL DEFAULT 0,
    monthly_redeemed  INTEGER NOT NULL DEFAULT 0,
    current_month     TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    task_id         INTEGER REFERENCES daily_tasks(id),
    points          INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'refunded', 'withdrawn')),
    description     TEXT,
    month_year      TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    metadata        TEXT
);

CREATE TABLE IF NOT EXISTS rewards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    points_required INTEGER NOT NULL CHECK(points_required > 0),
    quantity        INTEGER,
    redeemed_count  INTEGER NOT NULL DEFAULT 0,
    image_url       TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    reward_id       INTEGER NOT NULL REFERENCES rewards(id),
    points_spent    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'approved', 'fulfilled', 'rejected', 'cancelled')),
    admin_note      TEXT,
    fulfilled_at    TEXT,
    redeemed_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
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

-- Password reset tokens for email-based password recovery
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

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

-- Unique index: prevents duplicate task completions per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_user_task_date ON task_completions(user_id, task_id, task_date);

-- Unique index: prevents duplicate point_transactions for same task per day
-- This is critical for preventing double points bug in race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_user_task_date 
ON point_transactions(user_id, task_id, date(created_at))
WHERE task_id IS NOT NULL AND transaction_type = 'earned';

CREATE INDEX IF NOT EXISTS idx_users_phone                ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code        ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_user_id     ON users(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email                ON users(email);           -- NEW: For email login
CREATE INDEX IF NOT EXISTS idx_users_google_id            ON users(google_id);       -- NEW: For Google OAuth
CREATE INDEX IF NOT EXISTS idx_users_email_phone          ON users(email, phone);    -- NEW: For combined login lookup
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

-- Prevent duplicate categories with same name+type
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_categories_name_type 
ON transaction_categories(name, type);

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

-- ============================================
-- COMPANY EXPENSES SYSTEM
-- ============================================

-- কোম্পানি খরচ ক্যাটাগরি
CREATE TABLE IF NOT EXISTS company_expense_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
);

-- কোম্পানি খরচ মূল টেবিল
CREATE TABLE IF NOT EXISTS company_expenses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    amount           INTEGER NOT NULL CHECK(amount > 0),  -- paisa
    category_id      INTEGER REFERENCES company_expense_categories(id),
    category_name    TEXT NOT NULL,  -- denormalized for easier querying
    description      TEXT,
    expense_date     TEXT NOT NULL DEFAULT (date('now')),
    allocation_method TEXT NOT NULL DEFAULT 'by_project_value'
        CHECK(allocation_method IN ('by_project_value', 'by_revenue', 'equal', 'company_only')),
    is_allocated     INTEGER NOT NULL DEFAULT 0,  -- 1 = distributed to projects
    notes            TEXT,
    created_by       INTEGER NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- প্রজেক্ট অ্যালোকেশন (কোম্পানি খরচ কীভাবে ভাগ করা হয়েছে)
CREATE TABLE IF NOT EXISTS expense_allocations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id          INTEGER NOT NULL REFERENCES company_expenses(id),
    project_id          INTEGER NOT NULL REFERENCES projects(id),
    amount              INTEGER NOT NULL CHECK(amount >= 0),  -- paisa (pro-rated)
    project_value_pct   INTEGER NOT NULL,  -- basis points (how much % of project value was used)
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(expense_id, project_id)
);

-- ডিফল্ট কোম্পানি খরচ ক্যাটাগরি
INSERT OR IGNORE INTO company_expense_categories (name, description) VALUES
    ('অফিস ভাড়া', 'অফিস স্পেসের মাসিক ভাড়া'),
    ('কর্মচারী বেতন', 'স্টাফ এবং ম্যানেজমেন্টের বেতন'),
    ('ইউটিলিটি', 'বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেট বিল'),
    ('মার্কেটিং', 'বিজ্ঞাপন ও প্রচারণা খরচ'),
    ('অফিস সরঞ্জাম', 'কম্পিউটার, প্রিন্টার, ফার্নিচার'),
    ('ভ্রমণ', 'ব্যবসায়িক ভ্রমণ ও যাতায়াত'),
    ('লিগ্যাল ফি', 'আইনি পরামর্শ ও ফি'),
    ('ব্যাংক চার্জ', 'ব্যাংক ট্রান্সফার ও সার্ভিস চার্জ'),
    ('সফটওয়্যার ও সাবস্ক্রিপশন', 'টুল ও সার্ভিস সাবস্ক্রিপশন'),
    ('অন্যান্য', 'বিভিন্ন সাধারণ খরচ');

-- ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_company_expenses_date       ON company_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_allocated   ON company_expenses(is_allocated);
CREATE INDEX IF NOT EXISTS idx_company_expenses_creator     ON company_expenses(created_by);

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
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense  ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_project  ON expense_allocations(project_id);

-- ইনডেক্স
CREATE INDEX IF NOT EXISTS idx_project_transactions_project   ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type      ON project_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date       ON project_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_project    ON profit_distributions(project_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_status     ON profit_distributions(status);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_user        ON shareholder_profits(user_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_distribution ON shareholder_profits(distribution_id);
