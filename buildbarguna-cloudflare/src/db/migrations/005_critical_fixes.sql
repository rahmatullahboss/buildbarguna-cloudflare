-- =====================================================
-- Migration 005: Critical Fixes for Points System
-- =====================================================
-- Fixes:
-- 12. Add last_reset_month column to user_points (recreate table)
-- 13. Add ON DELETE CASCADE to notifications foreign key
-- 15. Add completion_time validation check
-- 8. Add badge_definitions table for data-driven badges
-- =====================================================

-- Drop dependent objects first
DROP TRIGGER IF EXISTS update_user_points_on_transaction;
DROP TRIGGER IF EXISTS reset_monthly_points_fixed;
DROP VIEW IF EXISTS v_user_redemption_eligibility;

-- 12. Recreate user_points with last_reset_month column
-- SQLite doesn't support adding columns with defaults, so we recreate
CREATE TABLE IF NOT EXISTS user_points_new (
    user_id           INTEGER PRIMARY KEY REFERENCES users(id),
    available_points  INTEGER NOT NULL DEFAULT 0 CHECK(available_points >= 0),
    lifetime_earned   INTEGER NOT NULL DEFAULT 0,
    lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
    monthly_earned    INTEGER NOT NULL DEFAULT 0,
    monthly_redeemed  INTEGER NOT NULL DEFAULT 0,
    current_month     TEXT NOT NULL DEFAULT (strftime('%Y-%m', 'now')),
    last_reset_month  TEXT,
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy existing data
INSERT INTO user_points_new 
SELECT user_id, available_points, lifetime_earned, lifetime_redeemed, monthly_earned, monthly_redeemed, current_month, NULL, updated_at 
FROM user_points;

-- Drop old table and rename
DROP TABLE IF EXISTS user_points;
ALTER TABLE user_points_new RENAME TO user_points;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);

-- 13. Recreate notifications with ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS notifications_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT,
    reference_id    INTEGER,
    reference_type  TEXT,
    is_read         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO notifications_new SELECT * FROM notifications;
DROP TABLE IF EXISTS notifications;
ALTER TABLE notifications_new RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 15. Recreate task_completions with validation
CREATE TABLE IF NOT EXISTS task_completions_new (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                   INTEGER NOT NULL REFERENCES users(id),
    task_id                   INTEGER NOT NULL REFERENCES daily_tasks(id),
    clicked_at                TEXT,
    completed_at              TEXT NOT NULL DEFAULT (datetime('now')),
    task_date                 TEXT NOT NULL,
    points_earned             INTEGER NOT NULL DEFAULT 0,
    completion_time_seconds   INTEGER CHECK(completion_time_seconds >= 0 OR completion_time_seconds IS NULL),
    ab_test_group             TEXT,
    UNIQUE(user_id, task_id, task_date)
);

-- Copy data - handle case where completion_time_seconds may not exist
INSERT INTO task_completions_new (id, user_id, task_id, clicked_at, completed_at, task_date, points_earned)
SELECT id, user_id, task_id, clicked_at, completed_at, task_date, points_earned
FROM task_completions;

DROP TABLE IF EXISTS task_completions;
ALTER TABLE task_completions_new RENAME TO task_completions;

CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_date ON task_completions(task_id, task_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_task_date ON task_completions(user_id, task_id, task_date);

-- 8. Create badge_definitions table for data-driven badges
CREATE TABLE IF NOT EXISTS badge_definitions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_type      TEXT NOT NULL UNIQUE,
    badge_name      TEXT NOT NULL,
    badge_description TEXT,
    threshold_value INTEGER,
    threshold_type  TEXT CHECK(threshold_type IN ('task_completions', 'points_earned', 'rewards_redeemed', 'days_streak', NULL)),
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default badge definitions
INSERT OR IGNORE INTO badge_definitions (badge_type, badge_name, badge_description, threshold_value, threshold_type) VALUES
    ('first_task', 'First Steps', 'Completed your first task', 1, 'task_completions'),
    ('10_tasks', 'Getting Started', 'Completed 10 tasks', 10, 'task_completions'),
    ('50_tasks', 'Dedicated Member', 'Completed 50 tasks', 50, 'task_completions'),
    ('100_tasks', 'Task Master', 'Completed 100 tasks', 100, 'task_completions'),
    ('first_reward', 'Reward Winner', 'Redeemed your first reward', 1, 'rewards_redeemed'),
    ('consistent_performer', 'Consistent Performer', 'Completed tasks 7 days in a row', 7, 'days_streak');

CREATE INDEX IF NOT EXISTS idx_badge_definitions_type ON badge_definitions(badge_type);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_active ON badge_definitions(is_active);

-- Recreate the triggers with proper table references
CREATE TRIGGER IF NOT EXISTS update_user_points_on_transaction
AFTER INSERT ON point_transactions
BEGIN
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

CREATE TRIGGER IF NOT EXISTS reset_monthly_points_fixed
AFTER UPDATE ON user_points
WHEN OLD.current_month != strftime('%Y-%m', 'now') 
     AND (OLD.last_reset_month IS NULL OR OLD.last_reset_month != strftime('%Y-%m', 'now'))
BEGIN
    UPDATE user_points SET
        monthly_earned = 0,
        monthly_redeemed = 0,
        current_month = strftime('%Y-%m', 'now'),
        last_reset_month = strftime('%Y-%m', 'now'),
        updated_at = datetime('now')
    WHERE user_id = NEW.user_id;
END;

-- Recreate the view
CREATE VIEW IF NOT EXISTS v_user_redemption_eligibility AS
SELECT 
    up.user_id,
    up.available_points,
    r.id as reward_id,
    r.points_required,
    CASE WHEN up.available_points >= r.points_required THEN 1 ELSE 0 END as is_eligible
FROM user_points up
CROSS JOIN rewards r
WHERE r.is_active = 1 AND (r.quantity IS NULL OR r.redeemed_count < r.quantity);
