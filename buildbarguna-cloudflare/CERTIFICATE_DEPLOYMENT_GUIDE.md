# Share Certificate PDF System - Deployment Guide

## Overview

This document provides deployment instructions and API documentation for the Share Certificate PDF generation system.

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Worker API      │────▶│  PDF Generator  │
│  (React + Vite) │     │  (Hono + D1)     │     │  (pdf-lib)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                         ┌──────────────────┐
                         │  D1 Database     │
                         │  (share_purchases)│
                         └──────────────────┘
```

## Features

- **World-class certificate design** with decorative borders, BBI logo, and professional typography
- **Bangla language support** using Noto Sans Bengali font
- **On-demand generation** - no storage required, generated fresh on each download
- **Authorization** - users can only download their own certificates
- **Admin override** - admins can download any certificate
- **Audit logging** - all certificate generations are logged

## API Documentation

### GET `/api/shares/certificate/:purchase_id`

Download a share certificate PDF for an approved purchase.

**Authentication:** Required (Bearer token)

**Authorization:**
- Regular users: Can only download their own certificates
- Admin users: Can download any certificate

**Path Parameters:**
- `purchase_id` (number) - The ID of the share purchase (must be positive integer)

**Query Parameters:** None

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="BBI_Share_Certificate_BBI-SHARE-YYYY-NNNN.pdf"
Content-Length: <size_in_bytes>
X-Content-Type-Options: nosniff
```

**Response Body:** Binary PDF data (Uint8Array)

**Certificate ID Format:** `BBI-SHARE-YYYY-NNNN`
- `YYYY` - Year of purchase
- `NNNN` - Sequential number (4 digits, zero-padded)

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | "Invalid purchase ID" | Purchase ID is not a valid positive integer |
| 404 | "Purchase not found" | Purchase ID doesn't exist |
| 403 | "Access denied" | User trying to download another user's certificate |
| 403 | "Certificate only available for approved purchases" | Purchase status is not 'approved' |
| 500 | "Failed to generate certificate" | PDF generation error |

### GET `/api/shares/certificate/:purchase_id/preview`

Preview certificate metadata without downloading the PDF.

**Authentication:** Required (Bearer token)

**Authorization:** Same as download endpoint

**Response:** JSON object with certificate metadata
```json
{
  "success": true,
  "data": {
    "certificate_id": "BBI-SHARE-2025-0001",
    "project_name": "Solar Energy Project",
    "share_quantity": 100,
    "total_amount_paisa": 5000000,
    "purchase_date": "2025-03-09T10:30:00.000Z",
    "user_name": "Mohammad Rahman"
  }
}
```

**Example Request:**
```javascript
const token = localStorage.getItem('token')
const response = await fetch('/api/shares/certificate/123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

if (response.ok) {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `BBI_Share_Certificate_${certificateId}.pdf`
  link.click()
  window.URL.revokeObjectURL(url)
}
```

## Certificate Design Elements

### Visual Elements

1. **Background:** Cream color (#FFFEF5)
2. **Border:** Decorative gold borders with corner ornaments
3. **Logo:** BBI logo at top center (65x65px)
4. **Header:** Organization name, address, contact info
5. **Title:** "SHARE CERTIFICATE" in dark gold
6. **Certificate ID:** Unique identifier in format BBI-SHARE-YYYY-NNNN

### Content Sections

1. **Header Section**
   - BBI Logo
   - Organization: "Build Barguna Initiative (BBI)"
   - Address: "Barguna Sadar, Barguna, Bangladesh"
   - Contact: Email and mobile number

2. **Certificate Body**
   - Intro: "This is to certify that"
   - Shareholder name (supports Bangla)
   - Project name
   - Share quantity
   - Total investment amount
   - Payment method
   - Form number (if available)

3. **Footer Section**
   - Purchase date
   - Investor signature area
   - Authorized signature area
   - Official seal placeholder

### Typography

- **English:** Helvetica (regular, bold, italic)
- **Bangla:** Noto Sans Bengali (bundled with Worker)
- **Fallback:** Latin-only if Bangla font fails to load

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] Verify `pdf-lib` and `@pdf-lib/fontkit` are in dependencies
- [ ] Ensure Noto Sans Bengali font is in `src/lib/pdf/fonts/`
- [ ] Verify wrangler.toml has module rules for `.ttf` files
- [ ] Test certificate generation locally with sample data
- [ ] Verify D1 database has `share_purchases` table

### 2. Deploy to Cloudflare Workers

```bash
# Build the project
npm run build

# Deploy to staging (optional)
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

### 3. Post-Deployment Verification

1. **Test Certificate Generation:**
   ```bash
   # Login as user
   # Buy shares in a project
   # Login as admin
   # Approve the share purchase
   # Login as user again
   # Go to My Investments
   # Click "সার্টিফিকেট ডাউনলোড করুন"
   ```

2. **Verify Authorization:**
   - User can download own certificate ✓
   - User cannot download another user's certificate ✓
   - Admin can download any certificate ✓
   - Non-approved purchases show 403 ✓

3. **Check Logs:**
   ```bash
   wrangler tail buildbarguna-worker
   # Look for: [CERTIFICATE] Generated certificate BBI-SHARE-...
   ```

### 4. Rollback Plan

If issues occur:
```bash
# List versions
wrangler versions list

# Rollback to previous version
wrangler versions deploy <previous-version-id>
```

## Monitoring

### Key Metrics to Track

1. **Certificate Generation Count**
   - Log query: `"[CERTIFICATE] Generated certificate"`
   - Expected: < 1 second generation time

2. **Error Rate**
   - Log query: `"[CERTIFICATE] Error generating"`
   - Alert if > 1% of requests

3. **Font Loading**
   - Log query: `"[PDF] Failed to embed"`
   - Should be 0 in production

### Dashboard Queries

```sql
-- Certificate generations per day
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as generations
FROM logs
WHERE message LIKE '%[CERTIFICATE] Generated certificate%'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30
```

## Troubleshooting

### Issue: Bangla text shows garbled characters

**Cause:** Bangla font failed to load

**Solution:**
1. Check wrangler.toml has module rules for `.ttf`
2. Verify font file exists at `src/lib/pdf/fonts/NotoSansBengali.ttf`
3. Check logs for font loading errors
4. Rebuild and redeploy

### Issue: Certificate generation timeout

**Cause:** Large PDF or slow font loading

**Solution:**
1. Check Worker timeout settings (default 10s)
2. Optimize font loading (bundle instead of fetch)
3. Add timeout handling with user-friendly error

### Issue: 403 for approved purchase

**Cause:** Authorization check failing

**Solution:**
1. Verify user is logged in
2. Check purchase status is 'approved' in database
3. Verify token is valid and not expired

## Security Considerations

1. **Authorization:** Strict user/admin separation
2. **No Storage:** Certificates generated on-demand, not stored
3. **Audit Logging:** All generations logged with user ID and timestamp
4. **Rate Limiting:** Consider adding rate limiting for download endpoint (future enhancement)

## Future Enhancements

- [ ] QR code verification system
- [ ] Email delivery of certificates
- [ ] Bulk certificate generation
- [ ] Certificate preview modal
- [ ] Download analytics and tracking
- [ ] Custom certificate templates per project
- [ ] Digital signature integration

## Support

For issues or questions:
- Check logs: `wrangler tail buildbarguna-worker`
- Review error messages in browser console
- Verify database state in D1 dashboard
- Contact: bbi.official2025@gmail.com

---

**Last Updated:** March 9, 2026  
**Version:** 1.0.0  
**Author:** Build Barguna Development Team
