## Why

Membership registration payments are being automatically marked as "paid" instead of "pending", bypassing admin verification. This is a critical bug that allows members to download certificates without payment verification. Additionally, users need a dedicated page to manage their membership and download certificates, plus share certificate PDF download options are missing across the platform.

## What Changes

### Bug Fix
- **Membership payment status**: Fix `payment_status` to be `'pending'` on submission (currently hardcoded to `'paid'`)
- Admin panel will correctly show new registrations in pending queue for verification

### New Features
- **Member Membership Page**: New page `/membership` where members can view their registration status, see payment verification status, and download certificates once approved
- **Share Certificate PDF Downloads**: Add PDF download buttons in:
  - Portfolio page (for each project holding)
  - My Investments page (share purchase history)
  - Projects page (after purchasing)
  - Dashboard (quick access)

## Capabilities

### New Capabilities
- `membership-management-page`: A dedicated page for members to view and manage their membership status, download certificates, and track payment verification
- `share-certificate-pdf`: PDF generation and download for share purchase certificates across multiple pages

### Modified Capabilities
- `member-registration`: Fix payment status to start as "pending" instead of "paid" to require admin verification before certificate access

## Impact

**Backend changes:**
- `src/routes/member.ts` - Fix `paymentStatus` assignment on line 196
- `src/routes/shares.ts` - Add share certificate PDF generation endpoint
- `src/lib/pdf/generator.ts` - Add share certificate PDF generator function

**Frontend changes:**
- New page: `src/pages/Membership.tsx` - Membership management page
- Modified: `src/pages/Portfolio.tsx` - Add download button for share certificates
- Modified: `src/pages/MyInvestments.tsx` - Add download button for share certificates
- Modified: `src/pages/Dashboard.tsx` - Add quick access to certificates
- Modified: `src/App.tsx` - Add new route
- Modified: `src/components/Layout.tsx` - Add navigation link
- Modified: `src/lib/api.ts` - Add API functions for new endpoints
