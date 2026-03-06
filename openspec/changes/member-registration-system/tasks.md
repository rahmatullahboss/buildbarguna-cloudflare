## 1. Database Setup

- [x] 1.1 Create D1 database migration file for member_registrations table
- [x] 1.2 Define schema with all required fields (name_english, name_bangla, father_name, mother_name, date_of_birth, blood_group, skills_interests, present_address, permanent_address, facebook_id, mobile_whatsapp, emergency_contact, email, form_number, declaration_accepted, created_at)
- [x] 1.3 Add primary key and unique constraints
- [x] 1.4 Run migration on local D1 database
- [ ] 1.5 Run migration on production D1 database

## 2. Backend API Implementation

- [x] 2.1 Create registration route handler in src/routes/
- [x] 2.2 Implement POST /api/member/register endpoint with Zod validation
- [x] 2.3 Add authentication middleware check to ensure user is logged in
- [x] 2.4 Implement form number generation logic (sequential)
- [x] 2.5 Create database insertion logic for registration data
- [x] 2.6 Add error handling and validation response formatting
- [x] 2.7 Create GET /api/member/:formNumber/pdf endpoint for PDF generation

## 3. PDF Generation Utility

- [x] 3.1 Add pdfkit dependency to package.json
- [x] 3.2 Create PDF generation utility module in src/lib/pdf/
- [x] 3.3 Implement BBI logo embedding (base64)
- [x] 3.4 Create PDF layout matching reference design template
- [ ] 3.5 Add Bangla text rendering support
- [x] 3.6 Implement watermark functionality
- [x] 3.7 Add PDF streaming response for efficient delivery
- [ ] 3.8 Test PDF generation with sample data

## 4. Frontend Registration Form

- [x] 4.1 Create MemberRegistrationScreen widget in frontend/src/screens/
- [x] 4.2 Implement form UI with all fields from spec
- [x] 4.3 Add form validation logic (required fields, email format, mobile number)
- [x] 4.4 Implement declaration checkbox with terms display
- [x] 4.5 Add loading state during submission
- [x] 4.6 Implement success state with PDF download trigger
- [x] 4.7 Add error state handling and display
- [x] 4.8 Style form to match BBI branding

## 5. Navigation and Integration

- [x] 5.1 Add registration route to app navigation
- [x] 5.2 Create menu/button to access registration from dashboard
- [x] 5.3 Integrate with existing authentication system
- [x] 5.4 Add registration status tracking (prevent duplicate submissions)

## 6. Testing

- [x] 6.1 Write unit tests for form validation logic
- [x] 6.2 Write unit tests for PDF generation
- [x] 6.3 Write integration tests for API endpoints
- [x] 6.4 Test end-to-end registration flow
- [x] 6.5 Test PDF download functionality
- [x] 6.6 Test with various Bangla text inputs
- [x] 6.7 Perform mobile responsiveness testing

## 7. Deployment

- [x] 7.1 Deploy database migration to staging
- [ ] 7.2 Deploy backend changes to staging
- [ ] 7.3 Deploy frontend to staging
- [ ] 7.4 Test complete flow in staging environment
- [ ] 7.5 Deploy to production
- [ ] 7.6 Verify production deployment
