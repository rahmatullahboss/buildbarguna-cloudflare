-- Migration 031: FULL DATA CLEANUP — Fresh Start
-- Deletes ALL profit, financial, share, and project data
-- User accounts, categories, tasks/points system are preserved
-- Run: npx wrangler d1 execute buildbarguna-invest-db --remote --file=./src/db/migrations/031_cleanup_all_data.sql

-- ═══════════════════════════════════════════
-- STEP 1: Child tables first (foreign key order)
-- ═══════════════════════════════════════════

DELETE FROM shareholder_profits;
DELETE FROM financial_audit_log;
DELETE FROM balance_audit_log;
DELETE FROM earnings;
DELETE FROM company_fund_transactions;
DELETE FROM profit_distributions;
DELETE FROM expense_allocations;
DELETE FROM company_expenses;
DELETE FROM project_transactions;
DELETE FROM user_shares;
DELETE FROM share_purchases;
DELETE FROM profit_rates;
DELETE FROM withdrawals;

-- ═══════════════════════════════════════════
-- STEP 2: Projects table
-- ═══════════════════════════════════════════

DELETE FROM projects;

-- ═══════════════════════════════════════════
-- STEP 3: Reset user balances to zero
-- ═══════════════════════════════════════════

UPDATE user_balances SET 
  total_earned_paisa = 0, 
  total_withdrawn_paisa = 0, 
  reserved_paisa = 0, 
  updated_at = datetime('now');

-- ═══════════════════════════════════════════
-- VERIFICATION: Check all tables are empty
-- ═══════════════════════════════════════════

SELECT 'projects' as tbl, COUNT(*) as cnt FROM projects
UNION ALL SELECT 'profit_distributions', COUNT(*) FROM profit_distributions
UNION ALL SELECT 'shareholder_profits', COUNT(*) FROM shareholder_profits
UNION ALL SELECT 'earnings', COUNT(*) FROM earnings
UNION ALL SELECT 'user_shares', COUNT(*) FROM user_shares
UNION ALL SELECT 'share_purchases', COUNT(*) FROM share_purchases
UNION ALL SELECT 'project_transactions', COUNT(*) FROM project_transactions
UNION ALL SELECT 'company_fund_transactions', COUNT(*) FROM company_fund_transactions
UNION ALL SELECT 'withdrawals', COUNT(*) FROM withdrawals;

SELECT '✅ Cleanup complete!' as status;
