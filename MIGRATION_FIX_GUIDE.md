# Database Migration Guide - Fix Missing Tables

## Problem Summary

Your D1 database is missing critical tables and columns:
- `member_registrations` table
- `user_points` table
- `task_completions.points_earned` column
- Various supporting tables (rewards, badges, notifications, etc.)

This is causing 500 errors on these endpoints:
- `GET /api/member/status` - Missing `member_registrations` table
- `GET /api/tasks` - Missing `tc.points_earned` column
- `GET /api/points` - Missing `user_points` table

## Solution

A new consolidated migration has been created: **`009_missing_tables_fix.sql`**

This migration:
1. Creates all missing tables safely (using `IF NOT EXISTS`)
2. Adds all required indexes
3. Inserts default data (rewards, badge definitions)
4. Creates views for member payment management
5. Initializes user_points for existing users

## How to Run the Migration

### Option 1: Automatic (Worker Startup)

The migration system is designed to run automatically when the Worker starts. The migrations are loaded from KV storage.

**Steps:**
1. Upload the migration SQL to KV storage:
```bash
# Navigate to the project directory
cd buildbarguna-cloudflare

# Upload migration to KV (using wrangler)
wrangler kv:key put --binding=SESSIONS "migration_009_missing_tables_fix" --preview=false < src/db/migrations/009_missing_tables_fix.sql
```

2. Deploy the Worker:
```bash
wrangler deploy
```

3. The migration will run automatically on the next Worker startup.

### Option 2: Manual (Direct D1 Execution)

If you prefer to run the migration manually directly on the D1 database:

```bash
# Find your D1 database ID
wrangler d1 list

# Execute the migration
wrangler d1 execute <DATABASE_ID> --file=src/db/migrations/009_missing_tables_fix.sql
```

Replace `<DATABASE_ID>` with your actual D1 database UUID.

### Option 3: Via Worker API (Recommended for Production)

Create a temporary admin endpoint to trigger migrations:

1. Add this to your Worker (`src/index.ts` or a dedicated admin route):

```typescript
// Temporary migration endpoint - REMOVE AFTER RUNNING
app.get('/api/admin/run-migrations', authMiddleware, adminMiddleware, async (c) => {
  const result = await runMigrations(c.env)
  return c.json(result)
})
```

2. Deploy the Worker
3. Call the endpoint with admin credentials
4. **Important:** Remove this endpoint after migration completes

## Verify Migration Success

After running the migration, verify the tables were created:

```bash
# Check tables exist
wrangler d1 execute <DATABASE_ID> --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Verify member_registrations
wrangler d1 execute <DATABASE_ID> --command="SELECT COUNT(*) as count FROM member_registrations;"

# Verify user_points
wrangler d1 execute <DATABASE_ID> --command="SELECT COUNT(*) as count FROM user_points;"

# Verify task_completions has points_earned column
wrangler d1 execute <DATABASE_ID> --command="PRAGMA table_info(task_completions);"
```

## Test the API Endpoints

After migration, test the previously failing endpoints:

```bash
# Test member status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/member/status

# Test tasks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/tasks

# Test points
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/points
```

All should return 200 OK instead of 500 errors.

## Rollback (If Needed)

If you need to rollback migration 009:

```bash
wrangler d1 execute <DATABASE_ID> --command="
DROP VIEW IF EXISTS v_member_payments_pending;
DROP VIEW IF EXISTS v_member_payments_verified;
DROP TABLE IF EXISTS badge_definitions;
DROP TABLE IF EXISTS admin_actions;
DROP TABLE IF EXISTS data_exports;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS reward_redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS user_points;
DROP TABLE IF EXISTS member_registrations;
DELETE FROM _migrations WHERE id = 9;
"
```

## Files Changed

1. **Created:** `src/db/migrations/009_missing_tables_fix.sql`
   - Consolidated migration for all missing tables

2. **Modified:** `src/lib/migrations.ts`
   - Added migration 007, 008, and 009 definitions
   - Added rollback SQL for each migration

## Next Steps

1. ✅ Upload migration SQL to KV storage
2. ✅ Deploy the updated Worker
3. ✅ Verify migration ran successfully (check Worker logs)
4. ✅ Test the API endpoints
5. ✅ Monitor for any errors in Cloudflare dashboard

## Troubleshooting

### Migration Fails with Timeout
- Increase the `timeout_ms` in the migration definition
- Split the migration into smaller chunks

### Tables Still Missing After Migration
- Check Worker logs for migration errors
- Verify KV storage has the migration SQL: `wrangler kv:key get --binding=SESSIONS "migration_009_missing_tables_fix"`
- Try manual execution (Option 2 above)

### "Table Already Exists" Errors
- This is normal if some tables were partially created
- The migration uses `IF NOT EXISTS` to handle this
- Check `_migrations` table to see which migrations have been applied

---

**Created:** 2026-03-07
**Migration Version:** 009
**Status:** Ready for deployment
