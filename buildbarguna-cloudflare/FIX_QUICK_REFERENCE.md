# Points System Fix - Quick Reference

## 🚀 Quick Fix (30 seconds)

```bash
# Option 1: Use npm script (recommended)
npm run db:migrate:015

# Option 2: Run the fix script
./scripts/fix-points-system.sh

# Option 3: Manual wrangler command
wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/015_add_missing_triggers.sql
```

---

## ✅ Verification

```bash
# Check triggers exist
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%user_points%';"

# Expected output:
# | name                             |
# |----------------------------------|
# | update_user_points_on_transaction|
# | reset_monthly_points             |
```

---

## 🧪 Test the Fix

```bash
# Test with a sample transaction
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year) 
   VALUES (1, 10, 'earned', 'Test', strftime('%Y-%m', 'now'));"

# Check points increased
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT available_points, lifetime_earned FROM user_points WHERE user_id = 1;"
```

---

## 📋 What Was Fixed

**Problem**: Database trigger `update_user_points_on_transaction` was missing

**Cause**: Migration 010 recreated all tables but didn't include triggers

**Solution**: Migration 015 creates the missing triggers

**Impact**: Points will now be awarded correctly when tasks are completed

---

## 📁 Files Changed

- ✅ `src/db/migrations/015_add_missing_triggers.sql` (NEW)
- ✅ `src/lib/migrations.ts` (modified)
- ✅ `package.json` (modified)
- ✅ `scripts/fix-points-system.sh` (NEW)
- ✅ `scripts/run-migration.sh` (modified)

---

## 🔍 Root Cause Details

See `POINTS_INVESTIGATION_SUMMARY.md` for full investigation report.

**TL;DR**: Migration 010 (`010_full_schema.sql`) recreated all database tables from scratch but forgot to include the trigger creation statements. The fix creates the missing triggers.

---

## 🆘 Troubleshooting

**Migration fails?**
```bash
# Check current migrations
npm run migration:status

# Check database exists
wrangler d1 list
```

**Still not working?**
1. Verify triggers exist (see verification above)
2. Check Worker logs for errors
3. Test task completion API directly with curl

**Need to rollback?**
```bash
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "DROP TRIGGER IF EXISTS update_user_points_on_transaction;"
```

---

## 📞 Support

For questions or issues, refer to:
- `POINTS_SYSTEM_FIX.md` - Detailed fix documentation
- `POINTS_INVESTIGATION_SUMMARY.md` - Full investigation report
- Worker logs in Cloudflare dashboard
