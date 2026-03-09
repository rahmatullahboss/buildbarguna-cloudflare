# Production Deployment Guide - Quick Reference

**Date:** March 9, 2026  
**Status:** ✅ Ready for Production

---

## Quick Start (5 Minutes)

### 1. Configure Secrets
```bash
cd buildbarguna-cloudflare

# Required secret (mandatory)
wrangler secret put JWT_SECRET
# Enter a secure random string (min 32 characters)
```

### 2. Run Database Migration
```bash
# Apply production readiness fixes
wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --file=./src/db/migrations/019_production_readiness_fixes.sql
```

### 3. Deploy Worker
```bash
npm run deploy
```

### 4. Verify Deployment
```bash
# Check health
curl https://buildbarguna-worker.workers.dev/api/health/ready

# Expected response:
# {"success":true,"status":"healthy","checks":{"secrets":"ok","database":"ok","kv":"ok"}}

# Check migration status
curl https://buildbarguna-worker.workers.dev/api/health/migrations
```

---

## Detailed Deployment Steps

### Pre-Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Logged into Cloudflare (`wrangler login`)
- [ ] JWT_SECRET configured
- [ ] Database backup created (optional but recommended)

### Step 1: Database Migration

```bash
# Check current migration status
wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="SELECT * FROM _migrations ORDER BY id DESC LIMIT 10;"

# Apply new migration
wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --file=./src/db/migrations/019_production_readiness_fixes.sql

# Verify migration applied
wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="SELECT * FROM _migrations ORDER BY id DESC LIMIT 5;"
```

### Step 2: Deploy Worker

```bash
cd buildbarguna-cloudflare

# Build frontend first
npm run build

# Deploy
npm run deploy

# Or manually:
wrangler deploy
```

### Step 3: Post-Deployment Verification

```bash
# 1. Health check
curl https://buildbarguna-worker.workers.dev/api/health/ready

# 2. Migration status
curl https://buildbarguna-worker.workers.dev/api/health/migrations

# 3. Test registration rate limiting (should fail after 3 attempts)
curl -X POST https://buildbarguna-worker.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"01712345678","password":"test123"}'

# 4. Check Worker logs
wrangler tail buildbarguna-worker

# 5. Verify security headers
curl -I https://buildbarguna-worker.workers.dev/api/health
# Should see: Content-Security-Policy, X-Frame-Options, etc.
```

---

## Rollback Plan

If deployment fails:

### 1. Rollback Worker
```bash
# List versions
wrangler versions list

# Rollback to previous version
wrangler versions rollback VERSION_ID
```

### 2. Database Rollback (if needed)
```bash
# Remove new tables/triggers
wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="DROP TABLE IF EXISTS admin_audit_log;"

wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="DROP TABLE IF EXISTS cron_execution_log;"

wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="DROP TRIGGER IF EXISTS enforce_withdrawal_cooldown;"

wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="DROP TRIGGER IF EXISTS enforce_withdrawal_cooldown_period;"

wrangler d1 execute buildbarguna-invest-db \
  --remote \
  --command="DROP TRIGGER IF EXISTS detect_self_referral;"
```

---

## Monitoring Setup

### 1. Enable Worker Logs
- Go to Cloudflare Dashboard → Workers → buildbarguna-worker → Logs
- Enable logging
- Set up log alerts for errors

### 2. Monitor Cron Jobs
```bash
# Check last cron execution
curl https://buildbarguna-worker.workers.dev/api/health/migrations

# Or query KV directly (advanced)
wrangler kv:key get --namespace-id=0e5da409471743769c5e0fe9d2752bd8 last_cron_execution
```

### 3. Set Up Alerts
- **Error Rate:** Alert if > 1% of requests fail
- **Cron Duration:** Alert if cron takes > 30 seconds
- **Health Check:** Alert if `/api/health/ready` returns unhealthy

---

## Testing Checklist

### Functional Tests

- [ ] User can register (and rate limit works after 3 attempts)
- [ ] User can login (and rate limit works after 5 failed attempts)
- [ ] Share purchase with idempotency key prevents duplicates
- [ ] Withdrawal request validates amount correctly
- [ ] Withdrawal cooldown enforced (try 2 requests within 7 days)
- [ ] Admin audit log entries created for admin actions

### Security Tests

- [ ] Security headers present in responses
- [ ] CSP prevents loading scripts from unauthorized domains
- [ ] X-Frame-Options prevents clickjacking
- [ ] Rate limiting prevents brute force attacks

### Performance Tests

- [ ] Health check responds in < 200ms
- [ ] Project listing responds in < 100ms
- [ ] Cron job completes in < 15 seconds

---

## Troubleshooting

### Issue: Migration fails

**Error:** "table _migrations already exists"
- **Solution:** Migration already applied, skip this step

**Error:** "UNIQUE constraint failed"
- **Solution:** Migration already in progress or applied

### Issue: Health check shows "unhealthy"

**Missing secrets:**
```bash
wrangler secret list
# Add missing secrets
wrangler secret put SECRET_NAME
```

**Database connection failed:**
```bash
# Check database exists
wrangler d1 info buildbarguna-invest-db
```

### Issue: Cron job not running

**Check cron trigger:**
```bash
wrangler cron list buildbarguna-worker
# Should show: 0 18 1 * * (1st of every month at 6 PM UTC)
```

**Recreate cron trigger:**
```bash
wrangler cron create buildbarguna-worker --schedule "0 18 1 * *"
```

---

## Success Criteria

Deployment is successful when:

- ✅ Health endpoint returns `{"status":"healthy"}`
- ✅ All migrations applied successfully
- ✅ Worker deployed without errors
- ✅ Security headers present in responses
- ✅ Rate limiting works on auth endpoints
- ✅ Cron job scheduled correctly
- ✅ No errors in Worker logs

---

## Post-Deployment Tasks

### Day 1
- [ ] Monitor error rates for 24 hours
- [ ] Check cron execution logs
- [ ] Verify rate limiting is working
- [ ] Review audit log entries

### Week 1
- [ ] Analyze withdrawal patterns for fraud
- [ ] Review referral bonuses for self-referrals
- [ ] Check performance metrics
- [ ] Gather user feedback

### Month 1
- [ ] Review cron execution success rate
- [ ] Analyze error patterns
- [ ] Plan next sprint improvements
- [ ] Update documentation

---

## Support Contacts

- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Worker Logs:** https://dash.cloudflare.com/?to=/:account/workers
- **D1 Dashboard:** https://dash.cloudflare.com/?to=/:account/d1
- **R2 Dashboard:** https://dash.cloudflare.com/?to=/:account/r2

---

**Deployment Approved By:** _________________  
**Date:** _________________  
**Status:** ☐ Ready ☐ In Progress ☐ Completed ☐ Rolled Back
