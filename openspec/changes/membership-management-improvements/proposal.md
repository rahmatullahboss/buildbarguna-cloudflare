## Why

Members are unable to manage their membership after registration - there's no dedicated page to view status or download certificates. Additionally, there's a critical bug where membership payments appear as "paid" instead of "pending" in admin panel, bypassing the verification workflow. Users also lack easy access to share purchase receipts across the app.

## What Changes

### Bug Fix
- Fix membership payment status defaulting to `'paid'` instead of `'pending'` - all payments should require admin verification before certificates are available

### New Features
- Create dedicated **Membership** page for members to:
  - View registration status and details
  - Download membership certificate (when verified)
  - See payment verification status
- Add PDF download buttons for share purchase receipts in:
  - Dashboard
  - Portfolio page
  - My Shares/Investments page
  - Project details page

## Capabilities

### New Capabilities
- `membership-dashboard`: Dedicated page for members to view and manage their membership status, download certificates, and track payment verification
- `share-receipt-download`: Ability to download PDF receipts for share purchases from multiple locations in the app

### Modified Capabilities
- None (no existing specs to modify)

## Impact

### Backend
- `src/routes/member.ts`: Fix payment status from `'paid'` to `'pending'`
- `src/routes/shares.ts`: Add receipt PDF generation endpoint (if not exists)

### Frontend
- New `Membership.tsx` page component
- Update `App.tsx` to add membership route
- Update `Layout.tsx` to add membership nav link
- Add download buttons to: `Dashboard.tsx`, `Portfolio.tsx`, `MyInvestments.tsx`, `ProjectDetail.tsx`

### Database
- No schema changes required

### Navigation
- Add "Membership" link to main navigation
