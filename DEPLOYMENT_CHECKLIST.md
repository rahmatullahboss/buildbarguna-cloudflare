# BBI Platform - Deployment Checklist

## Pre-Deployment

### 1. Environment Setup
- [ ] Cloudflare CLI installed (`npm install -g wrangler`)
- [ ] Logged into Cloudflare (`wrangler login`)
- [ ] Node.js 18+ installed
- [ ] All dependencies installed (`npm install` in buildbarguna-cloudflare)

### 2. R2 Bucket Setup
```bash
# Create R2 bucket
wrangler r2 bucket create buildbarguna-storage

# Verify bucket created
wrangler r2 bucket list
```
- [ ] R2 bucket `buildbarguna-storage` created

### 3. Upload BBI Logo (Optional but Recommended)
```bash
# Download Noto Sans Bengali fonts
# Upload logo to R2
wrangler r2 object put assets/bbi-logo.jpg --file=./path/to/bbi-logo.jpg

# Verify upload
wrangler r2 object get assets/bbi-logo.jpg
```
- [ ] BBI logo uploaded to R2 at `assets/bbi-logo.jpg`

### 4. Bangla Font Setup
```bash
# Create fonts directory
mkdir -p src/lib/pdf/fonts

# Download Noto Sans Bengali fonts from Google Fonts
# Place in src/lib/pdf/fonts/
```
- [ ] `NotoSansBengali-Regular.ttf` placed in `src/lib/pdf/fonts/`
- [ ] `NotoSansBengali-Bold.ttf` placed in `src/lib/pdf/fonts/`

### 5. Secrets Configuration
```bash
# Set required secrets
wrangler secret put JWT_SECRET
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET_NAME
wrangler secret put R2_PUBLIC_URL
```
- [ ] All secrets configured

---

## Database Migration

### Option A: Automatic (Recommended)
Migrations run automatically on first request after deployment.

### Option B: Manual Execution
```bash
# Run migrations manually
wrangler d1 execute buildbarguna-invest-db --file=./src/db/migrations/011_member_schema_fixes.sql
wrangler d1 execute buildbarguna-invest-db --file=./src/db/migrations/012_member_payment_views.sql
wrangler d1 execute buildbarguna-invest-db --file=./src/db/migrations/013_member_audit_logging.sql

# Verify migrations
wrangler d1 execute buildbarguna-invest-db --command="SELECT * FROM _migrations ORDER BY id DESC LIMIT 10;"
```
- [ ] Migrations executed successfully
- [ ] Views created: `v_member_payments_pending`, `v_member_payments_verified`, `v_member_payments_all`
- [ ] Table created: `member_audit_log`

---

## Backend Deployment

### 1. Build & Deploy
```bash
cd buildbarguna-cloudflare

# Deploy Worker
wrangler deploy

# Verify deployment
wrangler deployments list
```
- [ ] Worker deployed successfully
- [ ] No deployment errors

### 2. Health Check
```bash
# Check Worker health
curl https://buildbarguna-worker.workers.dev/api/health

# Check migration status
curl https://buildbarguna-worker.workers.dev/api/health/migrations
```
- [ ] Health endpoint returns 200 OK
- [ ] Migrations show as applied

### 3. API Endpoint Testing
```bash
# Test member routes (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://buildbarguna-worker.workers.dev/api/member/status

# Test admin routes (requires admin token)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://buildbarguna-worker.workers.dev/api/member/admin/payments
```
- [ ] Member status endpoint works
- [ ] Admin payment list endpoint works

---

## Frontend Deployment

### 1. Build
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```
- [ ] Build completes without errors
- [ ] Output in `dist/` directory

### 2. Deploy
```bash
# Deploy to Cloudflare Pages (if using Pages)
wrangler pages deploy dist --project-name=buildbarguna

# Or deploy to your hosting provider
```
- [ ] Frontend deployed successfully

### 3. Verify Frontend
- [ ] Login page loads
- [ ] Member registration form accessible
- [ ] Admin dashboard accessible (for admin users)
- [ ] Admin members page at `/admin/members` loads

---

## Post-Deployment Verification

### Backend API Tests

#### Member Registration Flow
- [ ] `POST /api/member/register` - Create new registration
- [ ] `GET /api/member/status` - Check registration status
- [ ] Registration appears in admin pending list

#### Admin Payment Verification
- [ ] `GET /api/member/admin/payments?status=pending` - View pending payments
- [ ] `POST /api/admin/members/:id/verify` with `approve` - Approve payment
- [ ] `POST /api/admin/members/:id/verify` with `reject` - Reject payment
- [ ] Verified member appears in verified list

#### Certificate Operations
- [ ] `GET /api/member/certificate/:formNumber` - Download certificate
- [ ] `GET /api/member/certificate/:formNumber/preview` - Preview certificate
- [ ] `POST /api/admin/certificates/bulk` - Bulk generate certificates
- [ ] Certificates stored in R2

#### Audit Logging
- [ ] Check `member_audit_log` table for entries
- [ ] Verify certificate downloads are logged
- [ ] Verify payment verifications are logged

### Frontend UI Tests

#### Member Flow
- [ ] User can access registration form
- [ ] Form validation works
- [ ] Registration submission successful
- [ ] Status page shows correct status
- [ ] Download certificate button appears after verification
- [ ] Certificate downloads successfully

#### Admin Flow
- [ ] Admin can access `/admin/members`
- [ ] Pending payments tab shows pending registrations
- [ ] Approve button works
- [ ] Reject button asks for reason
- [ ] Verified tab shows verified members
- [ ] Download/Preview buttons work
- [ ] All Members tab shows paginated list
- [ ] Bulk certificate generation works

### Database Verification

```bash
# Check member registrations
wrangler d1 execute buildbarguna-invest-db \
  --command="SELECT id, form_number, name_english, payment_status, created_at FROM member_registrations ORDER BY created_at DESC LIMIT 10;"

# Check views
wrangler d1 execute buildbarguna-invest-db \
  --command="SELECT * FROM v_member_payments_pending LIMIT 5;"

wrangler d1 execute buildbarguna-invest-db \
  --command="SELECT * FROM v_member_payments_verified LIMIT 5;"

# Check audit log
wrangler d1 execute buildbarguna-invest-db \
  --command="SELECT * FROM member_audit_log ORDER BY created_at DESC LIMIT 10;"
```
- [ ] Member registrations table has correct schema
- [ ] Views return correct data
- [ ] Audit log entries are created

---

## Monitoring Setup

### 1. Worker Logs
- [ ] Enable Worker Logs in Cloudflare Dashboard
- [ ] Verify logs appear for API requests
- [ ] Set up log alerts for errors

### 2. Analytics
- [ ] Check Worker Analytics for traffic patterns
- [ ] Monitor D1 database queries
- [ ] Track R2 storage usage

### 3. Error Tracking
- [ ] Set up error alerts in Cloudflare Dashboard
- [ ] Monitor 5xx error rates
- [ ] Track certificate generation failures

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

### 2. Database Rollback
```bash
# Migrations have down scripts
wrangler d1 execute buildbarguna-invest-db --command="DROP TABLE IF EXISTS member_audit_log;"
wrangler d1 execute buildbarguna-invest-db --command="DROP VIEW IF EXISTS v_member_payments_pending;"
wrangler d1 execute buildbarguna-invest-db --command="DROP VIEW IF EXISTS v_member_payments_verified;"
```

### 3. Frontend Rollback
```bash
# Redeploy previous version
wrangler pages deploy dist --project-name=buildbarguna
```

---

## Success Criteria

Deployment is successful when:

- [ ] All API endpoints respond correctly
- [ ] Member registration flow works end-to-end
- [ ] Admin can verify/reject payments
- [ ] Certificates generate and download correctly
- [ ] Audit logs are created for all actions
- [ ] Frontend UI functions without errors
- [ ] No console errors in browser
- [ ] No errors in Worker logs
- [ ] Database migrations applied successfully
- [ ] R2 bucket configured and accessible

---

## Support Contacts

- **Cloudflare Docs:** https://developers.cloudflare.com/
- **Worker Dashboard:** https://dash.cloudflare.com/?to=/:account/workers
- **D1 Dashboard:** https://dash.cloudflare.com/?to=/:account/d1
- **R2 Dashboard:** https://dash.cloudflare.com/?to=/:account/r2

---

## Deployment Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Pre-deployment setup | 30 min | DevOps |
| Database migration | 10 min | DevOps |
| Backend deployment | 10 min | DevOps |
| Frontend deployment | 15 min | DevOps |
| Testing & verification | 45 min | QA |
| **Total** | **~2 hours** | |

---

## Post-Deployment Tasks

- [ ] Monitor error rates for first 24 hours
- [ ] Check certificate generation success rate
- [ ] Review audit logs for completeness
- [ ] Gather user feedback on registration flow
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned

---

**Deployment Approved By:** _________________  
**Date:** _________________  
**Status:** ☐ Ready ☐ In Progress ☐ Completed ☐ Rolled Back
