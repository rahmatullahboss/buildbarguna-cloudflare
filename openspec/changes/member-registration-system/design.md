## Context

Build Barguna Initiative (BBI) needs a digital member registration system to replace manual paperwork. The system will allow logged-in users to register as company members through a Flutter frontend, with automatic PDF certificate generation upon successful registration. The backend uses Cloudflare Workers with Hono framework and D1 database, while the frontend is built with Flutter.

The reference PDF design includes fields for personal information, contact details, skills, and a declaration section with BBI branding.

## Goals / Non-Goals

**Goals:**
- Create a member registration form accessible only to authenticated users
- Store member registration data in D1 database
- Generate PDF certificates matching the provided design template
- Enable automatic PDF download after successful registration
- Integrate with existing authentication system
- Support both English and Bangla name fields

**Non-Goals:**
- Admin approval workflow (registrations are auto-approved)
- Payment integration for membership fees
- Physical card printing
- Member search or directory functionality
- Email notifications (future enhancement)

## Decisions

### 1. PDF Generation Approach
**Decision:** Use server-side PDF generation with `pdfkit` in Cloudflare Workers
**Rationale:** 
- Consistent PDF output across all platforms
- Reduces client-side complexity
- Better control over branding and formatting
- Works within Cloudflare Workers limitations

**Alternatives considered:**
- Client-side PDF generation in Flutter: Rejected due to complexity and inconsistent rendering
- Pre-generated templates with fill-in: Rejected due to inflexibility

### 2. Database Schema Design
**Decision:** Single `member_registrations` table with all fields
**Rationale:** 
- Simple query pattern (one registration per member)
- All data needed at once for PDF generation
- Easy to extend with additional fields later

### 3. PDF Trigger Mechanism
**Decision:** Generate PDF immediately after successful registration
**Rationale:** 
- Provides instant gratification to users
- Reduces support requests about certificate access
- Simplifies the flow (no separate download step)

### 4. Image Storage for PDF
**Decision:** Embed BBI logo as base64 in Worker, store registration metadata only
**Rationale:** 
- Reduces storage requirements
- Faster PDF generation (no R2 lookup needed)
- Logo is static and small

## Risks / Trade-offs

**PDF Generation Performance** → Mitigation: Cache logo in memory, use efficient PDF library
**Large File Size** → Mitigation: Optimize image compression, limit PDF metadata
**Cloudflare Workers Memory Limits** → Mitigation: Stream PDF generation, avoid loading all data at once
**Font Support for Bangla** → Mitigation: Use Unicode-compatible fonts, test with various Bangla characters
**Database Storage Growth** → Mitigation: Implement data retention policy in future, monitor storage usage

## Migration Plan

1. Create D1 database migration for `member_registrations` table
2. Add PDF generation utility to Cloudflare Workers
3. Create registration API endpoints
4. Build Flutter registration form UI
5. Test end-to-end flow with sample data
6. Deploy to staging environment
7. Test PDF generation and download
8. Deploy to production

**Rollback Strategy:**
- Remove API endpoints from Worker
- Delete `member_registrations` table from D1
- Remove Flutter registration screen from frontend

## Open Questions

- Should we add member ID generation (sequential vs UUID)?
- Do we need to store the generated PDF or regenerate on demand?
- Should there be a membership expiry/renewal system?
- Do we need admin dashboard to view registrations?
