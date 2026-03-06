# Database Migration System

## Overview

This system automatically runs database migrations when the Worker deploys to production.

## How It Works

1. **Deploy Script** (`scripts/deploy.sh`):
   - Sets `needs_migration = true` in KV storage
   - Builds frontend
   - Deploys Worker

2. **Migration Runner** (`src/lib/migrations.ts`):
   - Checks KV for `needs_migration` flag on first request
   - If `true`, runs all pending migrations
   - Records applied migrations in `_migrations` table
   - Sets flag to `false` for 1 hour

3. **Migration Files** (`src/db/migrations/*.sql`):
   - Sequential numbered migrations (001, 002, 003...)
   - Each migration is idempotent (safe to run multiple times)
   - Failed migrations stop the deployment

## Usage

### Deploy to Production (with auto-migration)

```bash
npm run deploy:prod
```

This will:
1. Set migration flag in KV
2. Build frontend
3. Deploy Worker
4. Worker automatically runs migrations on first request

### Deploy to Staging (no migration)

```bash
npm run deploy:staging
```

### Manual Migration (if needed)

```bash
# Run specific migration
npm run db:migrate:prod

# Or with wrangler directly
npx wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/005_critical_fixes.sql
```

## Monitoring

### Check Migration Status

```bash
# Check if migration flag is set
npx wrangler kv:key get needs_migration --binding=SESSIONS

# View applied migrations
npx wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT * FROM _migrations ORDER BY id"
```

### View Logs

```bash
# Real-time logs during deployment
npx wrangler tail

# Or in Cloudflare Dashboard
https://dash.cloudflare.com/?to=/:account/workers/services/view/buildbarguna-worker/production/logs
```

## Creating New Migrations

1. Create new SQL file in `src/db/migrations/`:
   ```bash
   touch src/db/migrations/006_new_feature.sql
   ```

2. Add migration to `src/lib/migrations.ts`:
   ```typescript
   const MIGRATIONS: Migration[] = [
     // ... existing migrations
     {
       id: 6,
       name: '006_new_feature',
       sql: ''
     }
   ]
   ```

3. Test locally first:
   ```bash
   npm run db:migrate:local
   ```

4. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

## Rollback Strategy

If a migration fails in production:

1. **Don't panic** - The Worker continues running with old schema
2. **Check logs** - See what failed
3. **Fix migration** - Create a new migration that fixes the issue
4. **Deploy fix** - Use `npm run deploy:prod` again

**Important:** Never delete or modify already-applied migrations. Always create new migrations to fix issues.

## Safety Features

- ✅ Migrations run in transactions (where supported)
- ✅ Failed migrations don't break the Worker
- ✅ Migration status tracked in `_migrations` table
- ✅ Only runs once per deployment (1 hour TTL)
- ✅ Errors logged to Cloudflare Logs

## Troubleshooting

### Migration Failed

```bash
# Check error logs
npx wrangler tail

# Check which migrations applied
npx wrangler d1 execute buildbarguna-invest-db --remote --command "SELECT * FROM _migrations"

# Manually run failed migration
npx wrangler d1 execute buildbarguna-invest-db --remote --file=src/db/migrations/XXX_failed.sql
```

### Worker Returns 503

If migrations fail catastrophically:

```bash
# Reset migration flag
npx wrangler kv:key put needs_migration "true" --binding=SESSIONS

# Redeploy
npm run deploy:prod
```

### Check Database Schema

```bash
# List all tables
npx wrangler d1 execute buildbarguna-invest-db --remote --command ".tables"

# Check specific table
npx wrangler d1 execute buildbarguna-invest-db --remote --command "PRAGMA table_info(user_points)"
```
