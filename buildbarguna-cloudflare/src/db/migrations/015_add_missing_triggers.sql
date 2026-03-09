-- ============================================
-- Migration: 015_add_missing_triggers
-- Description: Add missing triggers for points system that were omitted from migration 010
-- Date: 2026-03-09
-- Issue: Points not being awarded because trigger update_user_points_on_transaction was missing
-- ============================================

-- Drop existing triggers if they exist (from previous migrations)
DROP TRIGGER IF EXISTS update_user_points_on_transaction;
DROP TRIGGER IF EXISTS reset_monthly_points;
DROP TRIGGER IF EXISTS reset_monthly_points_fixed;

-- ============================================
-- 1. Trigger: Update user_points when point_transactions inserted
-- This is the CRITICAL trigger that awards points when tasks are completed
-- ============================================
CREATE TRIGGER update_user_points_on_transaction
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

-- ============================================
-- 2. Trigger: Monthly reset of monthly_earned and monthly_redeemed
-- Automatically resets monthly counters when month changes
-- Note: Simplified version without last_reset_month column
-- ============================================
CREATE TRIGGER reset_monthly_points
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

-- ============================================
-- Validation: Test the trigger works correctly
-- ============================================
-- After this migration, test with:
-- 1. INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year) VALUES (1, 10, 'earned', 'Test', strftime('%Y-%m', 'now'));
-- 2. SELECT * FROM user_points WHERE user_id = 1;
-- 3. Verify available_points increased by 10
