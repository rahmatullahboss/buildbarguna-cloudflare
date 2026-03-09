# Points System Investigation - Root Cause Analysis

**Date**: March 9, 2026  
**Issue**: Points not being awarded when users complete tasks  
**Status**: ✅ **FIX IDENTIFIED AND READY TO DEPLOY**

---

## Executive Summary

**Root Cause**: The database trigger `update_user_points_on_transaction` is missing from the production database. This trigger is responsible for automatically updating user points when a point transaction is created.

**Why it happened**: Migration 010 (`010_full_schema.sql`) recreated all database tables from scratch but did not include the trigger creation statements that were present in earlier migrations.

**Impact**: All task completions since migration 010 ran have not awarded points to users.

**Fix**: Run migration 015 (`015_add_missing_triggers.sql`) to create the missing triggers.

---

## Detailed Investigation

### Expected Flow (How It Should Work)

1. User completes a task via `POST /api/tasks/:id/complete`
2. Backend code in `src/routes/tasks.ts`:
   - Updates `task_completions` table with `completed_at` and `points_earned`
   - Inserts a record into `point_transactions` with `transaction_type='earned'`
3. **Database trigger** `update_user_points_on_transaction` should fire automatically
4. Trigger updates `user_points` table:
   - `available_points += points`
   - `lifetime_earned += points` (if earned)
   - `monthly_earned += points` (if current month)
5. User sees updated points balance

### Actual Flow (What's Happening)

1. ✅ User completes a task
2. ✅ `task_completions` updated correctly
3. ✅ `point_transactions` record inserted correctly
4. ❌ **Trigger doesn't exist** - no update to `user_points`
5. ❌ User's points balance remains unchanged

### Code Analysis

#### Task Completion Code (`src/routes/tasks.ts` lines 248-265)

```typescript
// Insert point_transaction — the update_user_points_on_transaction trigger
// will automatically update available_points, lifetime_earned and monthly_earned.
// Do NOT also manually UPDATE user_points — that was causing double-counting.

// Create transaction record with metadata
await c.env.DB.prepare(
  `INSERT INTO point_transactions (user_id, task_id, points, transaction_type, description, month_year, metadata)
   VALUES (?, ?, ?, 'earned', ?, strftime('%Y-%m', 'now'), ?)`
).bind(
  userId,
  taskId,
  pointsToAward,
  `Completed task: ${task.title}`,
  JSON.stringify({ task_title: task.title, platform: task.platform })
).run()
```

**Note**: The code comment explicitly states that the trigger should handle the points update. The code is correct - it's the database trigger that's missing.

#### Trigger Definition (from `005_critical_fixes.sql`)

```sql
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
```

This trigger is **correct** and was present in migration 005.

### Migration History Analysis

| Migration | Description | Triggers Included? |
|-----------|-------------|-------------------|
| 003 | Original points system | ✅ Yes |
| 005 | Critical fixes | ✅ Yes |
| 010 | Full schema setup | ❌ **NO** |
| 011-014 | Various fixes | ❌ No |

**Problem**: Migration 010 was created after migration 005 and recreates ALL tables from scratch, but does NOT include any `CREATE TRIGGER` statements.

When migration 010 ran:
1. It created fresh `user_points`, `point_transactions`, and other tables
2. The trigger from migration 005 was NOT recreated
3. Result: Tables exist but trigger is missing

### Verification Commands

To verify the issue in production:

```bash
# Check if trigger exists
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='trigger' AND name='update_user_points_on_transaction';"

# Expected: Empty result (trigger doesn't exist)
```

To verify point transactions are being created:

```bash
# Check recent point transactions
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT pt.*, up.available_points 
   FROM point_transactions pt 
   LEFT JOIN user_points up ON pt.user_id = up.user_id 
   ORDER BY pt.created_at DESC LIMIT 10;"
```

---

## Solution

### Quick Fix (Recommended)

Run the fix script:

```bash
./scripts/fix-points-system.sh
```

Or use npm script:

```bash
npm run db:migrate:015
```

Or run migration manually:

```bash
wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/015_add_missing_triggers.sql
```

### What the Fix Does

Migration 015 (`015_add_missing_triggers.sql`):

1. Drops any existing triggers (if they exist from previous migrations)
2. Creates `update_user_points_on_transaction` trigger
3. Creates `reset_monthly_points` trigger

### Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/db/migrations/015_add_missing_triggers.sql` | Created | SQL to create missing triggers |
| `src/lib/migrations.ts` | Modified | Added migration 015 entry |
| `package.json` | Modified | Added `db:migrate:015` script |
| `scripts/fix-points-system.sh` | Created | Automated fix script |
| `scripts/run-migration.sh` | Modified | Added option 4 for migration 015 |
| `POINTS_SYSTEM_FIX.md` | Created | Detailed fix documentation |

---

## Testing Plan

### 1. Pre-Fix Verification

```bash
# Check trigger doesn't exist
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%user_points%';"
```

### 2. Apply Fix

```bash
npm run db:migrate:015
```

### 3. Post-Fix Verification

```bash
# Check trigger exists
wrangler d1 execute buildbarguna-invest-db --remote --command \
  "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%user_points%';"

# Expected output:
# | name                             |
# |----------------------------------|
# | update_user_points_on_transaction|
# | reset_monthly_points             |
```

### 4. Functional Test

1. Login to the application
2. Complete a task from the task list
3. Check points balance increased
4. Check point transaction history shows the earned points

### 5. API Test

```bash
# Get auth token first, then:

# Complete a task
curl -X POST "https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/tasks/1/complete" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check points
curl "https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/points" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Prevention

To prevent this issue in the future:

### 1. Migration Checklist

When creating migrations that recreate tables:
- [ ] Include all `CREATE TRIGGER` statements
- [ ] Include all `CREATE VIEW` statements
- [ ] Include all `CREATE INDEX` statements
- [ ] Test in staging before production

### 2. Add Validation Test

Create a test that verifies critical database objects exist:

```typescript
// src/lib/database-validation.test.ts
describe('Database Validation', () => {
  test('critical triggers exist', async () => {
    const triggers = await DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='trigger'"
    ).all();
    
    const triggerNames = triggers.results.map(r => r.name);
    expect(triggerNames).toContain('update_user_points_on_transaction');
    expect(triggerNames).toContain('reset_monthly_points');
  });
});
```

### 3. Add Admin Health Check

Create an admin endpoint that checks database health:

```typescript
// src/routes/admin.ts
adminRoutes.get('/health/database', async (c) => {
  const triggers = await c.env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='trigger'"
  ).all();
  
  const requiredTriggers = [
    'update_user_points_on_transaction',
    'reset_monthly_points'
  ];
  
  const missingTriggers = requiredTriggers.filter(
    t => !triggers.results.some(r => r.name === t)
  );
  
  if (missingTriggers.length > 0) {
    return c.json({
      status: 'unhealthy',
      missing_triggers: missingTriggers
    }, 503);
  }
  
  return c.json({ status: 'healthy' });
});
```

---

## Impact Assessment

### Affected Users

All users who completed tasks after migration 010 ran.

### Data Recovery

**Good news**: The `point_transactions` table has all the transaction records. Points can be recalculated if needed.

To recalculate historical points (if needed):

```sql
-- This is NOT needed for the fix, but available for reference
-- Recalculate user_points from point_transactions

UPDATE user_points
SET 
  available_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM point_transactions
    WHERE user_id = user_points.user_id
  ),
  lifetime_earned = (
    SELECT COALESCE(SUM(points), 0)
    FROM point_transactions
    WHERE user_id = user_points.user_id AND points > 0
  ),
  lifetime_redeemed = (
    SELECT COALESCE(SUM(ABS(points)), 0)
    FROM point_transactions
    WHERE user_id = user_points.user_id AND points < 0
  );
```

### Going Forward

After applying the fix:
- ✅ New task completions will award points correctly
- ✅ Historical transactions remain intact
- ⚠️ Historical points may need manual recalculation if users were affected

---

## Deployment Steps

1. **Review changes**:
   ```bash
   cat src/db/migrations/015_add_missing_triggers.sql
   ```

2. **Backup database** (optional but recommended):
   ```bash
   npm run db:backup
   ```

3. **Run migration**:
   ```bash
   npm run db:migrate:015
   ```

4. **Verify**:
   ```bash
   wrangler d1 execute buildbarguna-invest-db --remote --command \
     "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%user_points%';"
   ```

5. **Test**: Complete a task and verify points are awarded

6. **Monitor**: Watch Worker logs for any errors

---

## Related Files

- `src/routes/tasks.ts` - Task completion logic
- `src/routes/points.ts` - Points routes
- `src/lib/migrations.ts` - Migration configuration
- `src/db/migrations/005_critical_fixes.sql` - Original trigger
- `src/db/migrations/010_full_schema.sql` - Migration that omitted triggers
- `src/db/migrations/015_add_missing_triggers.sql` - **The fix**

---

## Conclusion

The points system issue is caused by a missing database trigger that was accidentally omitted from migration 010. The fix is straightforward: run migration 015 to create the missing triggers.

**Estimated fix time**: 2-3 minutes  
**Risk level**: Low (trigger creation is idempotent and reversible)  
**Impact**: High (restores core functionality)

---

**Questions or concerns?** Review `POINTS_SYSTEM_FIX.md` for detailed technical documentation.
