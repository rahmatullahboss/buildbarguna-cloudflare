-- Migration 029: Cash Withdrawal + Remove Max Limit
-- Add withdrawal_method column to support cash withdrawals
-- Update max_paisa to remove practical withdrawal limit

-- Add withdrawal_method column (bkash or cash)
ALTER TABLE withdrawals ADD COLUMN withdrawal_method TEXT NOT NULL DEFAULT 'bkash' CHECK(withdrawal_method IN ('bkash', 'cash'));

-- Remove practical withdrawal limit by setting it very high (₹1,00,000 = 10000000 paisa)
UPDATE withdrawal_settings SET value = '10000000' WHERE key = 'max_paisa';

-- If max_paisa doesn't exist, insert it
INSERT OR IGNORE INTO withdrawal_settings (key, value) VALUES ('max_paisa', '10000000');
