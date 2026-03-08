## Context

BuildBarguna is a Bangladeshi group investment platform built on Cloudflare Workers + Hono backend with React frontend. The membership system currently has a critical bug where payment status is incorrectly set to `'paid'` on submission, bypassing admin verification. Additionally, the platform lacks a centralized membership management page and share certificate PDF download capabilities.

**Current State:**
- Member registration stores `payment_status = 'paid'` (line 196 in member.ts)
- No dedicated page for members to view/manage their membership
- Share certificate PDF generation exists only for membership certificates
- No download buttons for share certificates in portfolio/investments pages

**Constraints:**
- All monetary values stored as paisa (integer)
- Use existing PDF generation infrastructure (PDFKit)
- Follow existing API patterns (ok/err responses, Zod validation)
- Frontend uses TanStack Query for data fetching

## Goals / Non-Goals

**Goals:**
- Fix membership payment status to require admin verification
- Create membership management page for members
- Add share certificate PDF generation endpoint
- Add PDF download buttons across relevant pages (Portfolio, MyInvestments, Dashboard, Projects)
- Maintain consistent UX with existing certificate download flow

**Non-Goals:**
- Redesigning the existing membership registration form
- Adding new payment methods
- Creating bulk operations for share certificates
- Modifying admin panel functionality (beyond status fix)

## Decisions

### 1. Payment Status Fix

**Decision:** Change `payment_status` from `'paid'` to `'pending'` on submission.

**Rationale:** The current code at line 196 explicitly sets `paymentStatus = 'paid'` with a comment saying "ALL payments need admin verification" but contradicts itself. The correct flow is:
1. User submits registration with payment info
2. Status = `'pending'`
3. Admin verifies in AdminMembers panel
4. Status = `'verified'` (approved) or `'rejected'`

**Alternative considered:** Add a new `'submitted'` status - rejected because it adds complexity without value. The existing `pending/verified/rejected` flow is sufficient.

### 2. Membership Management Page Structure

**Decision:** Create new `/membership` route with:
- Status card showing registration details and payment status
- Download button (visible only when `payment_status === 'verified'`)
- Pending verification message with refresh option
- Link to registration form if not registered

**Rationale:** Centralizes membership management in one place. Similar pattern to `/portfolio` page structure.

### 3. Share Certificate PDF Design

**Decision:** Reuse existing PDF infrastructure with new `generateShareCertificate()` function.

**Certificate content:**
- Header with BBI logo and organization info
- Certificate ID (format: `BBI-SHARE-YYYY-NNNN`)
- Project name, share quantity, total amount
- Purchase date, payment method
- User name and ID
- Terms and conditions

**Rationale:** Consistency with member certificate design. PDFKit infrastructure already handles Bangla fonts.

### 4. Download Button Placement

**Decision:** Add download buttons in these locations:

| Page | Location | Visibility |
|------|----------|------------|
| Portfolio | Inside each project card expansion | All approved purchases |
| MyInvestments | Per purchase row | Status = 'approved' |
| Dashboard | Quick action card | If member exists |
| Projects | Post-purchase success message | Immediate download link |

**Rationale:** Provides multiple access points without overwhelming the UI. Only show when certificate is available.

### 5. API Endpoint Design

**Decision:** New endpoint `GET /api/shares/certificate/:purchaseId`

**Access control:**
- User can only download their own certificates
- Admins can download any certificate
- Purchase must have `status = 'approved'`

**Response:** PDF binary with appropriate headers

**Rationale:** Mirrors existing `/api/member/certificate/:formNumber` pattern.

## Risks / Trade-offs

**Risk: PDF generation latency**
→ Mitigation: PDFs are generated on-demand, not stored. Small file size (~50KB). Consider caching headers for repeated downloads.

**Risk: Users expect immediate certificate access**
→ Mitigation: Clear messaging in UI about verification wait time. Status refresh button on membership page.

**Risk: High download frequency**
→ Mitigation: No storage overhead since PDFs generated on-demand. Cloudflare Workers handles scaling.

**Trade-off: No certificate storage in R2**
→ Accepted: Storage cost savings vs slightly higher compute per download. PDF generation is fast (~100ms).

## Migration Plan

**Phase 1: Bug Fix (Immediate)**
1. Deploy fix for `payment_status = 'pending'`
2. Existing registrations with `payment_status = 'paid'` will need manual admin review

**Phase 2: Membership Page (Same deployment)**
1. Add new `/membership` route
2. Add navigation link
3. Add API function for frontend

**Phase 3: Share Certificates (Same deployment)**
1. Add `generateShareCertificate()` to PDF generator
2. Add `/api/shares/certificate/:purchaseId` endpoint
3. Update frontend pages with download buttons

**Rollback Strategy:**
- Bug fix is single-line change, easy to revert
- New page is additive, can be removed without affecting existing functionality
- New endpoint follows existing patterns, can be disabled if issues arise
