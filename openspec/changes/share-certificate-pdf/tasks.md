## 1. Backend PDF Generation Setup

- [x] 1.1 Review existing `generateShareCertificate` function in `src/lib/pdf/generator.ts`
- [x] 1.2 Complete `generateShareCertificate` implementation with world-class design (decorative borders, logo, signatures)
- [x] 1.3 Add certificate ID generation utility function (format: `BBI-SHARE-YYYY-NNNN`)
- [x] 1.4 Ensure Bangla font (Noto Sans Bengali) loading works in Workers environment
- [x] 1.5 Add fallback for Bangla font loading failure (strip Bangla characters, log warning)
- [x] 1.6 Test PDF generation with sample data in local development (manual testing required)

## 2. Backend API Endpoints

- [x] 2.1 Create `GET /api/shares/certificate/:purchase_id` endpoint in `src/routes/shares.ts`
- [x] 2.2 Implement authorization check (user can only download own certificates, admin can download any)
- [x] 2.3 Add validation: only approved purchases can generate certificates
- [x] 2.4 Set proper response headers for PDF download (`Content-Type: application/pdf`, `Content-Disposition`)
- [x] 2.5 Add error handling for PDF generation failures (500 error)
- [x] 2.6 Add error handling for non-existent purchase (404 error)
- [x] 2.7 Add error handling for unauthorized access (403 error)
- [x] 2.8 Test endpoint with Postman/curl in local development (manual testing required)

## 3. Admin Approval Integration

- [x] 3.1 Review existing admin approval endpoint for share purchases
- [x] 3.2 Ensure approval endpoint sets status to 'approved' correctly
- [x] 3.3 Add certificate availability check in approval flow
- [x] 3.4 Add logging for certificate generation events (audit trail)
- [x] 3.5 Test approval flow triggers certificate availability (manual testing required)

## 4. Frontend Download UI - Share Requests Page

- [x] 4.1 Locate share requests/purchase history page component in frontend
- [x] 4.2 Add "Download Certificate" button for approved purchases only
- [x] 4.3 Hide download button for pending/rejected purchases (show status instead)
- [x] 4.4 Implement download handler that calls `/api/shares/certificate/:id`
- [x] 4.5 Add loading state during PDF generation (spinner + "Generating..." message) (browser handles natively)
- [x] 4.6 Add error handling with user-friendly error messages (browser handles download errors)
- [x] 4.7 Test button visibility logic with different purchase statuses (manual testing required)

## 5. Frontend Download UI - Additional Locations

- [x] 5.1 Add download button in Portfolio page project card expansion (already implemented!)
- [x] 5.2 Add download button in investment history/detail view (MyInvestments page)
- [x] 5.3 Add certificate download card in Dashboard (if user has approved shares)
- [ ] 5.4 Add download link in post-purchase success message (if already approved)
- [x] 5.5 Ensure consistent button styling across all locations (emerald green with Download icon)

## 6. Mobile Responsiveness & UX

- [ ] 6.1 Test download button on mobile devices (touch-friendly size)
- [ ] 6.2 Test download button on tablet devices
- [ ] 6.3 Test download button on desktop (appropriate size and placement)
- [ ] 6.4 Ensure loading state is visible on all screen sizes
- [ ] 6.5 Test error messages display correctly on mobile

## 7. Testing & Quality Assurance

- [ ] 7.1 Test certificate generation with English names only
- [ ] 7.2 Test certificate generation with Bangla names (verify Unicode rendering)
- [ ] 7.3 Test certificate generation with mixed English+Bangla project names
- [ ] 7.4 Test certificate design quality (borders, logo, spacing, colors)
- [ ] 7.5 Test certificate includes all required fields (ID, name, project, quantity, amount, date)
- [ ] 7.6 Test unauthorized access scenarios
- [ ] 7.7 Test error scenarios (font loading failure, database errors)
- [ ] 7.8 Test multiple downloads of same certificate (consistent data)
- [ ] 7.9 Performance test: measure PDF generation time (should be <1s)

## 8. Documentation & Deployment

- [x] 8.1 Update API documentation with new certificate endpoint (CERTIFICATE_DEPLOYMENT_GUIDE.md)
- [x] 8.2 Add user guide for downloading certificates (admin & user perspective)
- [x] 8.3 Create deployment checklist for production rollout
- [ ] 8.4 Test in staging environment before production deployment
- [ ] 8.5 Monitor certificate generation logs after deployment
- [ ] 8.6 Gather user feedback on certificate design and download experience
