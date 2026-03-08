## 1. Bug Fix - Payment Status

- [x] 1.1 Fix payment status initialization in `src/routes/member.ts` (change line 196 from `'paid'` to `'pending'`)
- [x] 1.2 Verify the fix by checking that new registrations appear in admin pending queue
- [x] 1.3 Test membership submission flow end-to-end

## 2. Membership Management Page - Backend

- [x] 2.1 Add `GET /api/member/my-registration` endpoint to fetch current user's registration details
- [x] 2.2 Ensure endpoint returns all necessary fields (form_number, name, payment_status, created_at, verified_at, payment_note)
- [x] 2.3 Add proper authorization check (user can only see their own registration)

## 3. Membership Management Page - Frontend

- [x] 3.1 Create `src/pages/Membership.tsx` component with status card layout
- [x] 3.2 Add API function `memberApi.getMyRegistration()` in `src/lib/api.ts`
- [x] 3.3 Implement status display (pending/verified/rejected) with appropriate styling
- [x] 3.4 Add download certificate button (visible only for verified members)
- [x] 3.5 Add refresh status button with loading state
- [x] 3.6 Add route in `src/App.tsx` for `/membership`
- [x] 3.7 Add navigation link in `src/components/Layout.tsx`

## 4. Share Certificate PDF - Backend

- [x] 4.1 Add `generateShareCertificate()` function in `src/lib/pdf/generator.ts`
- [x] 4.2 Define share certificate interface with required fields (certificate_id, project_name, share_quantity, total_amount, purchase_date, user_name, payment_method)
- [x] 4.3 Implement PDF layout with BBI header, certificate details, and signature section
- [x] 4.4 Add `GET /api/shares/certificate/:purchaseId` endpoint in `src/routes/shares.ts`
- [x] 4.5 Implement access control (owner or admin only)
- [x] 4.6 Add status check (only approved purchases can generate certificates)
- [x] 4.7 Generate unique certificate ID in format `BBI-SHARE-YYYY-NNNN`

## 5. Share Certificate PDF - Frontend API

- [x] 5.1 Add `sharesApi.downloadCertificate(purchaseId)` function in `src/lib/api.ts`
- [x] 5.2 Add `sharesApi.previewCertificate(purchaseId)` function for inline preview
- [x] 5.3 Implement proper token handling for PDF requests

## 6. Portfolio Page - Download Buttons

- [x] 6.1 Add download button inside expanded project card section
- [x] 6.2 Fetch approved share purchases for each project
- [x] 6.3 Display download button for each approved purchase with certificate link
- [x] 6.4 Handle download loading state and errors

## 7. My Investments Page - Download Buttons

- [x] 7.1 Read current `src/pages/MyInvestments.tsx` to understand structure
- [x] 7.2 Add download certificate column or button for each approved purchase row
- [x] 7.3 Disable/hide button for pending purchases

## 8. Dashboard - Quick Access Card

- [x] 8.1 Read current `src/pages/Dashboard.tsx` to understand layout
- [x] 8.2 Add membership status card showing registration status
- [x] 8.3 Add quick download link for verified members
- [x] 8.4 Add link to membership page for non-members

## 9. Testing

- [ ] 9.1 Test membership registration with pending status
- [ ] 9.2 Test admin verification flow for memberships
- [ ] 9.3 Test certificate download after verification
- [ ] 9.4 Test share certificate download from each page
- [ ] 9.5 Test access control (users can't download others' certificates)
- [ ] 9.6 Test PDF generation with Bangla text (if applicable)

## 10. Documentation

- [ ] 10.1 Update API documentation with new endpoints
- [ ] 10.2 Add user-facing help text about verification wait times
