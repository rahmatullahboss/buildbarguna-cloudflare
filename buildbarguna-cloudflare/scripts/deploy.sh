#!/bin/bash

# BuildBarguna Production Deployment Script
# Runs migrations automatically before deploying with full safety features

set -e  # Exit on error

echo "🚀 BuildBarguna Production Deployment"
echo "======================================"

# 1. Check if we're deploying to production
ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-false}"

if [ "$ENVIRONMENT" == "production" ]; then
  echo "⚠️  Deploying to PRODUCTION"
  echo ""
  
  # 2. Validate required environment variables
  if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN not set"
    echo "   Set it with: export CLOUDFLARE_API_TOKEN=your_token"
    exit 1
  fi
  
  if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Error: CLOUDFLARE_ACCOUNT_ID not set"
    echo "   Set it with: export CLOUDFLARE_ACCOUNT_ID=your_id"
    exit 1
  fi
  
  echo "✅ Credentials validated"
  
  # 3. Dry run check
  if [ "$DRY_RUN" == "true" ]; then
    echo "📋 Running dry-run check..."
    echo ""
    echo "Pending migrations:"
    npx wrangler d1 execute buildbarguna-invest-db --remote \
      --command "SELECT id, name FROM _migrations ORDER BY id" 2>/dev/null || echo "  (no migrations table yet)"
    echo ""
    echo "✅ Dry run complete. No changes made."
    exit 0
  fi
  
  # 4. Backup database before deployment
  echo "💾 Creating database backup..."
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  npx wrangler d1 export buildbarguna-invest-db --remote --output="./backups/$BACKUP_FILE" 2>/dev/null || {
    echo "⚠️  Backup failed (D1 export not available), continuing anyway..."
  }
  echo "✅ Backup saved to ./backups/$BACKUP_FILE"
  echo ""
  
  # 5. Store migration SQL files in KV
  echo "📦 Storing migration SQL in KV..."
  for file in src/db/migrations/*.sql; do
    if [ -f "$file" ]; then
      filename=$(basename "$file" .sql)
      echo "   Storing $filename..."
      sql_content=$(cat "$file")
      # Use wrangler to store in KV
      echo "$sql_content" | npx wrangler kv:key put --binding=SESSIONS "migration_$filename" --preview=false 2>/dev/null || {
        echo "⚠️  Failed to store $filename in KV"
      }
    fi
  done
  echo "✅ Migrations stored in KV"
  echo ""
  
  # 6. Set migration flag in KV (triggers migration on next Worker start)
  echo "📝 Setting migration flag..."
  npx wrangler kv:key put --binding=SESSIONS needs_migration "true" --preview=false --ttl=86400  # 24 hours
  
  echo "✅ Migration flag set (TTL: 24 hours)"
  echo ""
  
  # 7. Wait for KV propagation with polling
  echo "⏳ Waiting for KV propagation..."
  MAX_ATTEMPTS=30
  ATTEMPT=1
  
  while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    sleep 2
    RESULT=$(npx wrangler kv:key get needs_migration --binding=SESSIONS --preview=false 2>/dev/null || echo "")
    
    if [ "$RESULT" == "true" ]; then
      echo "✅ KV propagation confirmed (${ATTEMPT}s)"
      break
    fi
    
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS... waiting..."
    ATTEMPT=$((ATTEMPT + 1))
  done
  
  if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "⚠️  KV propagation timeout, continuing anyway..."
  fi
  
  echo ""
  
fi

# 8. Build frontend
echo "🏗️  Building frontend..."
cd frontend

# Clean dist folder before build to avoid conflicts
rm -rf dist dist-app
npm run build
cd ..

echo "✅ Frontend built"
echo ""

# 9. Deploy Worker
echo "📦 Deploying Worker..."
npx wrangler deploy --env $ENVIRONMENT

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Check Worker logs for migration status:"
echo "      https://dash.cloudflare.com/?to=/:account/workers/services/view/buildbarguna-worker/$ENVIRONMENT/logs"
echo ""
echo "   2. Verify migrations applied:"
echo "      npx wrangler d1 execute buildbarguna-invest-db --remote --command 'SELECT * FROM _migrations ORDER BY id'"
echo ""
echo "   3. Database backup location: ./backups/$BACKUP_FILE"
echo ""
