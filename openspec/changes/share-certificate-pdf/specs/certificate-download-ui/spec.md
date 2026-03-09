## ADDED Requirements

### Requirement: Download button appears only for approved purchases
The system SHALL display share certificate download buttons in the frontend only when the share purchase status is 'approved'.

#### Scenario: Download button visible for approved purchase
- **WHEN** user views their share purchase requests list
- **THEN** each purchase with status 'approved' shows a "Download Certificate" button

#### Scenario: Download button hidden for pending purchase
- **WHEN** user views their share purchase requests list
- **THEN** purchases with status 'pending' do NOT show download button, only "Pending" status indicator

#### Scenario: Download button hidden for rejected purchase
- **WHEN** user views their share purchase requests list
- **THEN** purchases with status 'rejected' do NOT show download button, only "Rejected" status with admin note

### Requirement: PDF download with loading state
The system SHALL provide smooth download experience with loading indicator while PDF is being generated.

#### Scenario: Download button click initiates download
- **WHEN** user clicks "Download Certificate" button
- **THEN** system shows loading spinner and calls certificate generation endpoint

#### Scenario: Loading state during generation
- **WHEN** PDF is being generated (takes ~500ms-1s)
- **THEN** user sees loading indicator with "Generating certificate..." message

#### Scenario: Successful download completion
- **WHEN** PDF generation completes
- **THEN** browser automatically downloads PDF file with filename format `BBI_Share_Certificate_{certificate_id}.pdf`

#### Scenario: Error handling for failed download
- **WHEN** certificate generation fails
- **THEN** system shows error message "Failed to generate certificate. Please try again or contact support."

### Requirement: Certificate download in share requests page
The system SHALL provide certificate download functionality in the user's share purchase requests page.

#### Scenario: Download button in requests list
- **WHEN** user navigates to "My Share Requests" page
- **THEN** each approved purchase row shows a "Download Certificate" button

#### Scenario: Download from request detail view
- **WHEN** user views details of an approved share purchase
- **THEN** a prominent "Download Certificate" button is displayed

### Requirement: Mobile-responsive download UI
The system SHALL provide responsive download button that works on all device sizes.

#### Scenario: Download button on mobile
- **WHEN** user accesses share requests page on mobile device
- **THEN** download button is properly sized and touch-friendly

#### Scenario: Download button on desktop
- **WHEN** user accesses share requests page on desktop
- **THEN** download button is prominently displayed with appropriate size
