## ADDED Requirements

### Requirement: Share certificate PDF generation with world-class design
The system SHALL generate professional PDF share certificates using pdf-lib with world-class design including decorative borders, BBI logo, bilingual support (English & Bangla), and all critical shareholder information.

#### Scenario: Generate certificate for approved share purchase
- **WHEN** admin approves a share purchase request
- **THEN** the system can generate a professional PDF certificate with certificate ID, shareholder name (English + Bangla if available), project name, share quantity, total amount, purchase date, and official signature areas

#### Scenario: Certificate includes professional design elements
- **WHEN** a share certificate is generated
- **THEN** it includes cream background (#FFFEF5), gold decorative borders, BBI logo at top center, organization details, and official seal placeholder

#### Scenario: Certificate unique identifier format
- **WHEN** a share certificate is generated
- **THEN** it includes a unique certificate ID in format `BBI-SHARE-YYYY-NNNN` where YYYY is year and NNNN is sequential number

#### Scenario: Bangla text support in certificate
- **WHEN** shareholder name or project name contains Bangla characters
- **THEN** the certificate renders Bangla text correctly using Noto Sans Bengali font

#### Scenario: Fallback for Bangla font loading failure
- **WHEN** Bangla font fails to load
- **THEN** the system strips Bangla characters and generates certificate with Latin text only, logging a warning

### Requirement: On-demand certificate generation (no storage)
The system SHALL generate certificates on-demand for each download request without storing PDFs in R2 or any persistent storage.

#### Scenario: Generate certificate on download request
- **WHEN** user requests certificate download
- **THEN** the system generates PDF in real-time and streams to user without saving to disk

#### Scenario: No R2 storage for certificates
- **WHEN** a certificate is generated
- **THEN** it is NOT stored in R2 bucket or any file system

#### Scenario: Fresh data on each download
- **WHEN** user downloads certificate multiple times
- **THEN** each download reflects current data (project name, share quantity) at time of download

### Requirement: Certificate includes all critical information
The system SHALL include all essential elements of a professional share certificate matching major corporate standards.

#### Scenario: Certificate header section
- **WHEN** certificate is generated
- **THEN** it displays BBI logo, organization name "Build Barguna Initiative (BBI)", address, email, and mobile number at top

#### Scenario: Certificate title and ID
- **WHEN** certificate is generated
- **THEN** it shows "SHARE CERTIFICATE" title and unique certificate number below the header

#### Scenario: Shareholder details section
- **WHEN** certificate is generated
- **THEN** it displays shareholder name prominently in center with both English and Bangla (if available)

#### Scenario: Share purchase details
- **WHEN** certificate is generated
- **THEN** it includes project name, share quantity, total amount in BDT, and purchase date

#### Scenario: Official signature section
- **WHEN** certificate is generated
- **THEN** it shows signature lines for "Authorized Signature" and "Member Signature" with official seal area

#### Scenario: Verification date
- **WHEN** certificate is generated
- **THEN** it includes "Issued on: [date]" at bottom
