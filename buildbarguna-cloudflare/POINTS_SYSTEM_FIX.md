# Points System Fix - Migration 015

## Problem Summary

**Issue**: Points are not being awarded when users complete tasks.

**Root Cause**: The database trigger `update_user_points_on_transaction` is missing from the production database.

### Technical Details

The points system relies on a database trigger to automatically update user points when a point transaction is created:

1. Task completion flow (`POST /api/tasks/:id/complete`):
   - Updates `task_completions` with `completed_at` and `points_earned`
   - Inserts a record into `point_transactions` with `transaction_type='earned'`
   - **Expected**: Trigger `update_user_points_on_transaction` fires and updates `user_points`
   - **Actual**: Trigger doesn't exist, so `user_points` is never updated

2. Why the trigger is missing:
   - Migration 005 (`005_critical_fixes.sql`) correctly created the trigger
   - Migration 010 (`010_full_schema.sql`) was created later and recreates ALL tables from scratch
   - Migration 010 does NOT include any `CREATE TRIGGER` statements
   - When migration 010 ran, it created the tables but the trigger was never recreated

## Solution

### Option 1: Direct SQL Fix (Immediate)

Run this SQL directly on the production database to create the missing triggers:

```bash
wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/015_add_missing_triggers.sql
```

Or execute directly via command:

```bash
wrangler d1 execute buildbarguna-invest-db --remote --command "
DROP TRIGGER IF EXISTS update_user_points_on_transaction;
DROP TRIGGER IF EXISTS reset_monthly_points;
DROP TRIGGER IF EXISTS reset_monthly_points_fixed;

CREATE TRIGGER update_user_points_on_transaction
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

CREATE TRIGGER reset_monthly_points
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
"
```

### Option 2: Migration System Fix (Proper)

The migration file has already been created: `src/db/migrations/015_add_missing_triggers.sql`

To properly deploy via the migration system:

1. **Store migration SQL in KV**:
```bash
# Read the SQL file and store in KV
SQL=$(cat src/db/migrations/015_add_missing_triggers.sql)
wrangler kv:key put --namespace-id=0e5da409471743769c5e0fe9d2752bd8 "migration_015_add_missing_triggers" "$SQL"
```

2. **Set migration flag**:
```bash
wrangler kv:key put --namespace-id=0e5da409471743769c5e0fe9d2752bd8 "needs_migration" "true"
```

3. **Deploy the worker** (migration will run automatically on startup):
```bash
npm run deploy
```

### Option 3: Add NPM Script (Recommended)

Add this script to `package.json`:

```json
"db:migrate:015": "wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/015_add_missing_triggers.sql"
```

Then run:
```bash
npm run db:migrate:015
```

## Verification

After applying the fix, verify it works:

### 1. Check trigger exists:
```bash
wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%user_points%';"
```

Expected output:
```
| name                             |
|----------------------------------|
| update_user_points_on_transaction|
| reset_monthly_points             |
```

### 2. Test point awarding:
```bash
# Get a user ID first
wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT id, name FROM users LIMIT 1;"

# Check current points
wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT * FROM user_points WHERE user_id = 1;"

# Create a test transaction
wrangler d1 execute buildbarguna-invest-db --remote --command "INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year) VALUES (1, 10, 'earned', 'Test transaction', strftime('%Y-%m', 'now'));"

# Check points increased
wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT available_points, lifetime_earned FROM user_points WHERE user_id = 1;"
```

### 3. Test task completion (via API):
```bash
# Get today's date
TODAY=$(date +%Y-%m-%d)

# Get a task ID
TASK_ID=1

# Get auth token (login first)

# Complete the task
curl -X POST "https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Check points
curl "https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/points" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Changed

1. **New File**: `src/db/migrations/015_add_missing_triggers.sql`
   - Contains the SQL to create missing triggers

2. **Modified**: `src/lib/migrations.ts`
   - Added migration 015 entry to the MIGRATIONS array

## Prevention

To prevent this issue in the future:

1. **Always include triggers in full schema migrations**: When creating a migration that recreates tables, ensure all triggers, views, and indexes are also recreated.

2. **Add migration validation**: Add a test that verifies critical triggers exist after migrations run.

3. **Consider a schema validation endpoint**: Add an admin endpoint that checks for required database objects.

## Related Files

- `src/db/migrations/005_critical_fixes.sql` - Original trigger creation
- `src/db/migrations/010_full_schema.sql` - Migration that omitted triggers
- `src/routes/tasks.ts` - Task completion logic (lines 248-265)
- `src/lib/migrations.ts` - Migration runner configuration
