-- =====================================================
-- Migration 010: Full Schema Setup
-- =====================================================
-- Purpose: Create all tables, indexes, and default data
-- Database: buildbarguna-invest-db (d6cd3372-559c-4653-ac2d-87510b29130d)
-- Run command: wrangler d1 execute buildbarguna-invest-db --file=./src/db/migrations/010_full_schema.sql
-- =====================================================

-- ============================================
-- CORE USER & AUTH TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  referral_code    TEXT UNIQUE,
  referred_by      TEXT,
  referrer_user_id INTEGER REFERENCES users(id),
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti        TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

-- ============================================
-- PROJECT & INVESTMENT TABLES
-- ============================================

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
  rate        INTEGER NOT NULL CHECK(rate >= 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, month)
);

CREATE TABLE IF NOT EXISTS earnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  month       TEXT NOT NULL,
  shares      INTEGER NOT NULL CHECK(shares > 0),
  rate        INTEGER NOT NULL CHECK(rate >= 0),
  amount      INTEGER NOT NULL CHECK(amount >= 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, project_id, month)
);

-- ============================================
-- TASK & POINTS SYSTEM
-- ============================================

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
  UNIQUE(user_id, task_id, task_date)
);

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
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'refunded')),
    description     TEXT,
    month_year      TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    metadata        TEXT
);

-- ============================================
-- REWARDS SYSTEM
-- ============================================

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

-- ============================================
-- REFERRAL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  trigger_event    TEXT NOT NULL DEFAULT 'first_investment',
  amount_paisa     INTEGER NOT NULL CHECK(amount_paisa > 0),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(referrer_user_id, referred_user_id, trigger_event)
);

-- ============================================
-- WITHDRAWAL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS withdrawals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount_paisa    INTEGER NOT NULL CHECK(amount_paisa >= 10000),
  bkash_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','approved','completed','rejected')),
  admin_note      TEXT,
  approved_by     INTEGER REFERENCES users(id),
  bkash_txid      TEXT UNIQUE,
  requested_at    TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at     TEXT,
  completed_at    TEXT,
  rejected_at     TEXT
);

-- Partial unique index: one pending withdrawal per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_user
  ON withdrawals(user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS withdrawal_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default withdrawal settings
INSERT OR IGNORE INTO withdrawal_settings (key, value) VALUES
  ('min_paisa',           '10000'),
  ('max_paisa',           '500000'),
  ('cooldown_days',       '7'),
  ('referral_bonus_paisa','5000');

-- ============================================
-- PROJECT FINANCE & PROFIT DISTRIBUTION
-- ============================================

CREATE TABLE IF NOT EXISTS project_transactions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('expense', 'revenue')),
    amount           INTEGER NOT NULL CHECK(amount > 0),
    category         TEXT NOT NULL,
    description      TEXT,
    transaction_date TEXT NOT NULL DEFAULT (date('now')),
    created_by       INTEGER NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transaction_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('expense', 'revenue')),
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS profit_distributions (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id               INTEGER NOT NULL REFERENCES projects(id),
    total_revenue            INTEGER NOT NULL DEFAULT 0,
    total_expense            INTEGER NOT NULL DEFAULT 0,
    net_profit               INTEGER NOT NULL DEFAULT 0,
    distributable_amount     INTEGER NOT NULL DEFAULT 0,
    company_share_percentage  INTEGER NOT NULL DEFAULT 30,
    investor_share_percentage INTEGER NOT NULL DEFAULT 70,
    period_start             TEXT,
    period_end               TEXT,
    status                   TEXT NOT NULL DEFAULT 'pending' 
        CHECK(status IN ('pending', 'approved', 'distributed', 'cancelled')),
    distributed_at           TEXT,
    created_by               INTEGER NOT NULL REFERENCES users(id),
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shareholder_profits (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id       INTEGER NOT NULL REFERENCES profit_distributions(id),
    project_id            INTEGER NOT NULL REFERENCES projects(id),
    user_id               INTEGER NOT NULL REFERENCES users(id),
    shares_held           INTEGER NOT NULL,
    total_shares          INTEGER NOT NULL,
    ownership_percentage  INTEGER NOT NULL DEFAULT 0,
    profit_amount         INTEGER NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'credited', 'withdrawn')),
    credited_at           TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- COMPANY EXPENSES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS company_expense_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS company_expenses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    amount           INTEGER NOT NULL CHECK(amount > 0),
    category_id      INTEGER REFERENCES company_expense_categories(id),
    category_name    TEXT NOT NULL,
    description      TEXT,
    expense_date     TEXT NOT NULL DEFAULT (date('now')),
    allocation_method TEXT NOT NULL DEFAULT 'by_project_value'
        CHECK(allocation_method IN ('by_project_value', 'by_revenue', 'equal', 'company_only')),
    is_allocated     INTEGER NOT NULL DEFAULT 0,
    notes            TEXT,
    created_by       INTEGER NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expense_allocations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id          INTEGER NOT NULL REFERENCES company_expenses(id),
    project_id          INTEGER NOT NULL REFERENCES projects(id),
    amount              INTEGER NOT NULL CHECK(amount >= 0),
    project_value_pct   INTEGER NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(expense_id, project_id)
);

-- ============================================
-- MEMBER REGISTRATION
-- ============================================

CREATE TABLE IF NOT EXISTS member_registrations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  form_number           TEXT UNIQUE NOT NULL,
  name_english          TEXT NOT NULL,
  name_bangla           TEXT,
  father_name           TEXT NOT NULL,
  mother_name           TEXT NOT NULL,
  date_of_birth         TEXT NOT NULL,
  blood_group           TEXT,
  present_address       TEXT NOT NULL,
  permanent_address     TEXT NOT NULL,
  facebook_id           TEXT,
  mobile_whatsapp       TEXT NOT NULL,
  emergency_contact     TEXT,
  email                 TEXT,
  skills_interests      TEXT,
  declaration_accepted  INTEGER NOT NULL DEFAULT 0 CHECK(declaration_accepted IN (0, 1)),
  payment_method        TEXT CHECK(payment_method IN ('bkash', 'cash')),
  payment_amount        INTEGER DEFAULT 10000,
  payment_status        TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'verified', 'rejected')),
  bkash_number          TEXT,
  bkash_trx_id          TEXT,
  payment_note          TEXT,
  verified_by           INTEGER REFERENCES users(id),
  verified_at           TEXT,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

-- ============================================
-- BADGE & NOTIFICATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL CHECK(badge_type IN (
        'first_task', '10_tasks', '50_tasks', '100_tasks',
        'first_reward', 'top_earner', 'consistent_performer',
        'referral_master', 'perfect_month'
    )),
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT,
    UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS badge_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_type TEXT NOT NULL UNIQUE,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN (
        'points_earned', 'reward_redeemed', 'redemption_approved',
        'redemption_rejected', 'reward_fulfilled', 'task_completed',
        'fraud_alert', 'redemption_pending'
    )),
    title TEXT NOT NULL,
    message TEXT,
    reference_id INTEGER,
    reference_type TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- AUDIT & RATE LIMITING
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL CHECK(endpoint IN (
        'leaderboard', 'export', 'task_completion', 'reward_redeem',
        'points_history', 'notifications'
    )),
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, endpoint, window_start)
);

CREATE TABLE IF NOT EXISTS data_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    action_type TEXT NOT NULL,
    target_id INTEGER,
    target_type TEXT,
    reason TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default transaction categories
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

-- Default company expense categories
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

-- Default badge definitions
INSERT OR IGNORE INTO badge_definitions (badge_type, badge_name, badge_description, requirement_type, requirement_value) VALUES
    ('first_task', 'First Steps', 'Completed your first task', 'task_completion', 1),
    ('10_tasks', 'Getting Started', 'Completed 10 tasks', 'task_completion', 10),
    ('50_tasks', 'Dedicated Member', 'Completed 50 tasks', 'task_completion', 50),
    ('100_tasks', 'Task Master', 'Completed 100 tasks', 'task_completion', 100),
    ('first_reward', 'Reward Winner', 'Redeemed your first reward', 'reward_redemption', 1),
    ('top_earner', 'Top Earner', 'Earned 10000 points', 'points_earned', 10000),
    ('consistent_performer', 'Consistent Performer', 'Completed tasks 7 days in a row', 'streak_days', 7),
    ('referral_master', 'Referral Master', 'Referred 10 members', 'referrals', 10),
    ('perfect_month', 'Perfect Month', 'Completed 100 tasks in a month', 'monthly_tasks', 100);

-- Default rewards
INSERT OR IGNORE INTO rewards (name, description, points_required, quantity) VALUES
    ('৳50 Cash Withdrawal', 'Withdraw 50 Taka to your bKash account', 500, NULL),
    ('৳100 Cash Withdrawal', 'Withdraw 100 Taka to your bKash account', 1000, NULL),
    ('৳500 Cash Withdrawal', 'Withdraw 500 Taka to your bKash account', 5000, NULL),
    ('Free Share Certificate', 'Get a free share certificate (worth ৳1000)', 10000, 50),
    ('Premium Membership', 'Upgrade to premium membership for 1 month', 2000, NULL);

-- ============================================
-- INDEXES
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_user_id ON users(referrer_user_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_profit_rates_month ON profit_rates(month);
CREATE INDEX IF NOT EXISTS idx_profit_rates_project_month ON profit_rates(project_id, month);
CREATE INDEX IF NOT EXISTS idx_earnings_project ON earnings(project_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_month ON earnings(month);
CREATE INDEX IF NOT EXISTS idx_earnings_user_month ON earnings(user_id, month);
CREATE INDEX IF NOT EXISTS idx_earnings_user_project ON earnings(user_id, project_id);

-- Share purchase indexes
CREATE INDEX IF NOT EXISTS idx_share_purchases_user ON share_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_share_purchases_status ON share_purchases(status);
CREATE INDEX IF NOT EXISTS idx_share_purchases_project ON share_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_share_purchases_payment ON share_purchases(payment_method);

-- User shares indexes
CREATE INDEX IF NOT EXISTS idx_user_shares_project ON user_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_user ON user_shares(user_id);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_date ON task_completions(task_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_types_active ON task_types(is_active);

-- Points indexes
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_month ON point_transactions(month_year);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_month ON point_transactions(user_id, month_year);

-- Rewards indexes
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred ON referral_bonuses(referred_user_id);

-- Withdrawal indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_requested ON withdrawals(user_id, requested_at);

-- Project transactions indexes
CREATE INDEX IF NOT EXISTS idx_project_transactions_project ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type ON project_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date ON project_transactions(transaction_date);

-- Profit distribution indexes
CREATE INDEX IF NOT EXISTS idx_profit_distributions_project ON profit_distributions(project_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_status ON profit_distributions(status);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_user ON shareholder_profits(user_id);
CREATE INDEX IF NOT EXISTS idx_shareholder_profits_distribution ON shareholder_profits(distribution_id);

-- Company expenses indexes
CREATE INDEX IF NOT EXISTS idx_company_expenses_date ON company_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_allocated ON company_expenses(is_allocated);
CREATE INDEX IF NOT EXISTS idx_company_expenses_creator ON company_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_project ON expense_allocations(project_id);

-- Member registration indexes
CREATE INDEX IF NOT EXISTS idx_member_registrations_user ON member_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_member_registrations_form_number ON member_registrations(form_number);
CREATE INDEX IF NOT EXISTS idx_member_registrations_created_at ON member_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_status ON member_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_member_registrations_payment_method ON member_registrations(payment_method);

-- Badge & notification indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_id, target_type);

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW IF NOT EXISTS v_member_payments_pending AS
SELECT
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.name_bangla,
  mr.payment_method,
  mr.payment_amount,
  mr.bkash_number,
  mr.bkash_trx_id,
  mr.payment_note,
  mr.created_at,
  u.phone as user_phone,
  u.name as user_name
FROM member_registrations mr
JOIN users u ON mr.user_id = u.id
WHERE mr.payment_status = 'pending'
ORDER BY mr.created_at DESC;

CREATE VIEW IF NOT EXISTS v_member_payments_verified AS
SELECT
  mr.id,
  mr.form_number,
  mr.name_english,
  mr.payment_method,
  mr.payment_amount,
  mr.bkash_trx_id,
  mr.verified_by,
  mr.verified_at,
  admin.name as verified_by_name
FROM member_registrations mr
LEFT JOIN users admin ON mr.verified_by = admin.id
WHERE mr.payment_status = 'verified'
ORDER BY mr.verified_at DESC;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Migration 010 completed successfully!' as status;
SELECT COUNT(*) as total_tables FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
