# Quick Migration Commands

## Fastest Way - Run Migration Now

```bash
# Navigate to project directory
cd buildbarguna-cloudflare

# Run migration directly on D1
wrangler d1 execute <YOUR_DATABASE_ID> --file=src/db/migrations/009_missing_tables_fix.sql
```

## Find Your Database ID

```bash
# List all D1 databases
wrangler d1 list

# Or get it automatically (requires jq)
wrangler d1 list --json | jq -r '.[] | select(.name | contains("buildbarguna")) | .uuid'
```

## Verify Migration Worked

```bash
# Check if tables exist
wrangler d1 execute <DATABASE_ID> --command="
  SELECT name FROM sqlite_master WHERE type='table' 
  AND name IN ('member_registrations', 'user_points', 'point_transactions');
"

# Count records in new tables
wrangler d1 execute <DATABASE_ID> --command="
  SELECT 'member_registrations' as table_name, COUNT(*) as count FROM member_registrations
  UNION ALL
  SELECT 'user_points', COUNT(*) FROM user_points
  UNION ALL
  SELECT 'point_transactions', COUNT(*) FROM point_transactions;
"
```

## Test Previously Failing Endpoints

```bash
# Test member status endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/member/status

# Test tasks endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/tasks

# Test points endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://buildbarguna-worker.rahmatullahzisan01.workers.dev/api/points
```

## Rollback (If Needed)

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

## Check Migration Status

```bash
# See which migrations have been applied
wrangler d1 execute <DATABASE_ID> --command="
  SELECT id, name, applied_at FROM _migrations ORDER BY id;
"
```

## Upload to KV (For Automatic Migration)

```bash
# Store migration SQL in KV
wrangler kv:key put --binding=SESSIONS "migration_009_missing_tables_fix" \
  --preview=false < src/db/migrations/009_missing_tables_fix.sql

# Verify it was stored
wrangler kv:key get --binding=SESSIONS "migration_009_missing_tables_fix" | head -20
```

## Deploy Worker

```bash
# Deploy with new migrations
wrangler deploy

# Or deploy with specific environment
wrangler deploy --env production
```

## Monitor Migration

```bash
# Watch Worker logs in real-time
wrangler tail

# Or with filters
wrangler tail --filter error
```

---

**Quick Reference Created:** 2026-03-07  
**Migration File:** `src/db/migrations/009_missing_tables_fix.sql`
