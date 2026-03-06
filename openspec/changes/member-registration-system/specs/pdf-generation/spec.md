## ADDED Requirements

### Requirement: System generates PDF certificate
The system SHALL generate a PDF membership certificate matching the BBI Member Registration Form design after successful registration.

#### Scenario: PDF generation after registration
- **WHEN** a registration is successfully saved to the database
- **THEN** the system generates a PDF certificate with all submitted information

#### Scenario: PDF includes BBI branding
- **WHEN** the PDF is generated
- **THEN** it includes the BBI logo, organization name, address, email, and mobile number at the top

#### Scenario: PDF includes all member data
- **WHEN** the PDF is generated
- **THEN** it displays all submitted member information in the appropriate fields

#### Scenario: PDF includes declaration section
- **WHEN** the PDF is generated
- **THEN** it includes the undertaking & declaration text with bullet points

#### Scenario: PDF includes signature lines
- **WHEN** the PDF is generated
- **THEN** it shows signature lines for Authority's Signature and Applicant's Signature at the bottom

### Requirement: User can download PDF
The system SHALL automatically trigger PDF download after successful registration.

#### Scenario: Automatic download trigger
- **WHEN** registration and PDF generation complete successfully
- **THEN** the system automatically initiates PDF download to user's device

#### Scenario: PDF file naming
- **WHEN** the PDF is downloaded
- **THEN** the filename follows the format: `BBI_Member_Form{formNumber}_{name}.pdf`

### Requirement: PDF maintains design fidelity
The system SHALL generate PDFs that match the provided reference design template.

#### Scenario: PDF layout matches template
- **WHEN** the PDF is viewed
- **THEN** the layout matches the reference image with proper spacing and field alignment

#### Scenario: PDF includes watermark
- **WHEN** the PDF is generated
- **THEN** it includes the BBI logo as a watermark in the background

#### Scenario: PDF supports Bangla text
- **WHEN** the member's Bangla name contains Unicode characters
- **THEN** the PDF renders Bangla text correctly
