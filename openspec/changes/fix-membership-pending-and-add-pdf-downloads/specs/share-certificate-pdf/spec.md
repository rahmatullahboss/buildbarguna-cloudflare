## ADDED Requirements

### Requirement: Share certificate PDF generation
The system SHALL generate PDF certificates for approved share purchases.

#### Scenario: Generate certificate for approved purchase
- **WHEN** a share purchase has `status = 'approved'`
- **THEN** the system can generate a PDF certificate containing project name, share quantity, total amount, purchase date, and user details

#### Scenario: Certificate unique identifier
- **WHEN** a share certificate is generated
- **THEN** it includes a unique certificate ID in format `BBI-SHARE-YYYY-NNNN`

### Requirement: Share certificate download endpoint
The system SHALL provide an API endpoint for downloading share certificates.

#### Scenario: User downloads own certificate
- **WHEN** a user requests `GET /api/shares/certificate/:purchaseId` for their own approved purchase
- **THEN** the system returns a PDF file with appropriate headers

#### Scenario: Admin downloads any certificate
- **WHEN** an admin requests `GET /api/shares/certificate/:purchaseId`
- **THEN** the system returns the PDF certificate regardless of ownership

#### Scenario: Unauthorized download attempt
- **WHEN** a user requests a certificate for another user's purchase
- **THEN** the system returns 403 Forbidden

#### Scenario: Download for non-approved purchase
- **WHEN** a certificate is requested for a purchase with `status != 'approved'`
- **THEN** the system returns 403 Forbidden with message "Certificate only available for approved purchases"

### Requirement: Download buttons in UI
The system SHALL display share certificate download buttons in multiple locations.

#### Scenario: Download in Portfolio page
- **WHEN** a user expands a project card in Portfolio
- **THEN** a download button appears if the user has approved shares in that project

#### Scenario: Download in My Investments page
- **WHEN** a user views their investment history
- **THEN** each row with approved status shows a download button

#### Scenario: Download in Dashboard
- **WHEN** a user has approved share purchases
- **THEN** the Dashboard shows a quick-access card with certificate download option

#### Scenario: Download after purchase
- **WHEN** a user completes a share purchase (approved immediately or later)
- **THEN** the success message includes a download certificate link (if approved)
