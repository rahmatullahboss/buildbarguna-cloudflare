## ADDED Requirements

### Requirement: Share certificate download endpoint
The system SHALL provide a RESTful API endpoint for downloading share certificates as PDF files.

#### Scenario: User downloads own certificate
- **WHEN** authenticated user sends GET request to `/api/shares/certificate/:purchase_id` for their own approved purchase
- **THEN** system returns PDF file with Content-Type `application/pdf` and filename `BBI_Share_Certificate_{certificate_id}.pdf`

#### Scenario: Admin downloads any certificate
- **WHEN** admin user sends GET request to `/api/shares/certificate/:purchase_id`
- **THEN** system returns PDF certificate regardless of purchase ownership

#### Scenario: Unauthorized access to another user's certificate
- **WHEN** non-admin user requests certificate for another user's purchase
- **THEN** system returns 403 Forbidden with error message "Access denied"

#### Scenario: Download for non-approved purchase
- **WHEN** user requests certificate for purchase with status != 'approved'
- **THEN** system returns 403 Forbidden with message "Certificate only available for approved purchases"

#### Scenario: Download for non-existent purchase
- **WHEN** user requests certificate for purchase ID that doesn't exist
- **THEN** system returns 404 Not Found with message "Purchase not found"

#### Scenario: PDF generation error handling
- **WHEN** PDF generation fails due to technical error
- **THEN** system returns 500 Internal Server Error with message "Failed to generate certificate"

### Requirement: Certificate data endpoint
The system SHALL provide endpoint to fetch certificate metadata before download.

#### Scenario: Get certificate preview data
- **WHEN** user requests certificate preview data
- **THEN** system returns certificate ID, project name, share quantity, purchase date, and user name

#### Scenario: Preview data authorization
- **WHEN** user requests preview for another user's purchase
- **THEN** system returns 403 Forbidden (same authorization as download)

### Requirement: Certificate generation endpoint integration
The system SHALL integrate certificate generation with existing share purchase approval flow.

#### Scenario: Certificate available immediately after approval
- **WHEN** admin approves a share purchase via existing endpoint
- **THEN** certificate becomes immediately available for download

#### Scenario: Certificate generation uses latest data
- **WHEN** certificate is requested
- **THEN** system fetches latest user and project data from database at generation time
