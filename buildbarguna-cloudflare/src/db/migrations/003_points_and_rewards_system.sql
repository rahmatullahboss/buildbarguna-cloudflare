-- =====================================================
-- Migration 003: Points & Rewards System
-- =====================================================
-- Adds:
-- - task_types: Configurable task types with point values
-- - user_points: User point balance tracking
-- - point_transactions: Point ledger (earn/redeem/expire/adjust)
-- - rewards: Reward catalog for redemption
-- - reward_redemptions: User reward redemption history
-- - Updates daily_tasks: Adds points, cooldown_seconds, daily_limit
-- =====================================================

-- 1. Task Types (Admin configurable - defines point values per type)
CREATE TABLE IF NOT EXISTS task_types (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL UNIQUE,  -- 'facebook_follow', 'instagram_follow', 'share', 'referral_signup'
    display_name      TEXT NOT NULL,         -- 'Facebook Follow', 'Instagram Follow', etc.
    base_points       INTEGER NOT NULL DEFAULT 0 CHECK(base_points >= 0),
    cooldown_seconds  INTEGER NOT NULL DEFAULT 30 CHECK(cooldown_seconds >= 0),
    daily_limit       INTEGER NOT NULL DEFAULT 10 CHECK(daily_limit >= 1),
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default task types
INSERT OR IGNORE INTO task_types (name, display_name, base_points, cooldown_seconds, daily_limit) VALUES
    ('facebook_follow', 'Facebook Follow', 5, 30, 20),
    ('facebook_share', 'Facebook Share', 10, 30, 10),
    ('instagram_follow', 'Instagram Follow', 5, 30, 20),
    ('instagram_share', 'Instagram Share', 10, 30, 10),
    ('referral_signup', 'Referral Signup', 50, 0, 100),
    ('youtube_subscribe', 'YouTube Subscribe', 5, 30, 20),
    ('telegram_join', 'Telegram Join', 5, 30, 20),
    ('other', 'Other Task', 5, 30, 20);

-- 2. User Points (Current balance)
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

-- 3. Point Transactions (Ledger - every point movement)
CREATE TABLE IF NOT EXISTS point_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    task_id         INTEGER REFERENCES daily_tasks(id),
    points          INTEGER NOT NULL,  -- positive for earned, negative for redeemed
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'refunded')),
    description     TEXT,
    month_year      TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),  -- For monthly tracking
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    metadata        TEXT  -- JSON for additional info (e.g., reward_id for redemptions)
);

-- 4. Rewards Catalog (Admin managed)
CREATE TABLE IF NOT EXISTS rewards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    points_required INTEGER NOT NULL CHECK(points_required > 0),
    quantity        INTEGER,  -- NULL = unlimited
    redeemed_count  INTEGER NOT NULL DEFAULT 0,
    image_url       TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Reward Redemptions (User redemption history)
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

-- 6. Update daily_tasks to add points and cooldown
-- First, add columns if they don't exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
ALTER TABLE daily_tasks ADD COLUMN points INTEGER NOT NULL DEFAULT 5;
ALTER TABLE daily_tasks ADD COLUMN cooldown_seconds INTEGER NOT NULL DEFAULT 30;
ALTER TABLE daily_tasks ADD COLUMN daily_limit INTEGER NOT NULL DEFAULT 20;
ALTER TABLE daily_tasks ADD COLUMN task_type_id INTEGER REFERENCES task_types(id);

-- 7. Update task_completions to add points_earned
ALTER TABLE task_completions ADD COLUMN points_earned INTEGER NOT NULL DEFAULT 0;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_month ON point_transactions(month_year);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_task_types_active ON task_types(is_active);

-- 9. Insert default rewards (sample)
INSERT OR IGNORE INTO rewards (name, description, points_required, quantity) VALUES
    ('৳50 Cash Withdrawal', 'Withdraw 50 Taka to your bKash account', 500, NULL),
    ('৳100 Cash Withdrawal', 'Withdraw 100 Taka to your bKash account', 1000, NULL),
    ('৳500 Cash Withdrawal', 'Withdraw 500 Taka to your bKash account', 5000, NULL),
    ('Free Share Certificate', 'Get a free share certificate (worth ৳1000)', 10000, 50),
    ('Premium Membership', 'Upgrade to premium membership for 1 month', 2000, NULL);

-- 10. Initialize user_points for existing users
INSERT OR IGNORE INTO user_points (user_id, available_points, lifetime_earned, lifetime_redeemed, monthly_earned, monthly_redeemed)
SELECT id, 0, 0, 0, 0, 0 FROM users;

-- 11. Trigger: Update user_points when point_transactions inserted
CREATE TRIGGER IF NOT EXISTS update_user_points_on_transaction
AFTER INSERT ON point_transactions
BEGIN
    -- Update available points and lifetime totals
    UPDATE user_points SET
        available_points = available_points + NEW.points,
        lifetime_earned = lifetime_earned + CASE WHEN NEW.points > 0 THEN NEW.points ELSE 0 END,
        lifetime_redeemed = lifetime_redeemed + CASE WHEN NEW.points < 0 THEN ABS(NEW.points) ELSE 0 END,
        monthly_earned = monthly_earned + CASE WHEN NEW.points > 0 AND NEW.month_year = current_month THEN NEW.points ELSE 0 END,
        monthly_redeemed = monthly_redeemed + CASE WHEN NEW.points < 0 AND NEW.month_year = current_month THEN ABS(NEW.points) ELSE 0 END,
        current_month = strftime('%Y-%m', 'now'),
        updated_at = datetime('now')
    WHERE user_id = NEW.user_id;
END;

-- 12. Trigger: Monthly reset of monthly_earned and monthly_redeemed
CREATE TRIGGER IF NOT EXISTS reset_monthly_points
AFTER UPDATE ON user_points
WHEN OLD.current_month != strftime('%Y-%m', 'now')
BEGIN
    UPDATE user_points SET
        monthly_earned = 0,
        monthly_redeemed = 0,
        current_month = strftime('%Y-%m', 'now'),
        updated_at = datetime('now')
    WHERE user_id = NEW.user_id;
END;
