## ADDED Requirements

### Requirement: Admin approval triggers certificate availability
The system SHALL make share certificates available for download only after admin approves the share purchase request.

#### Scenario: Certificate available after admin approval
- **WHEN** admin changes share purchase status from 'pending' to 'approved'
- **THEN** the certificate becomes available for download by the shareholder

#### Scenario: Certificate not available for pending purchases
- **WHEN** a share purchase has status 'pending'
- **THEN** no certificate download option is shown to the user

#### Scenario: Certificate not available for rejected purchases
- **WHEN** a share purchase has status 'rejected'
- **THEN** no certificate download option is shown to the user

#### Scenario: Admin approval timestamp tracking
- **WHEN** admin approves a share purchase
- **THEN** the system records the approval timestamp for certificate generation reference

### Requirement: Admin can approve share purchase with certificate generation
The system SHALL provide admin endpoint to approve share purchases which enables certificate generation.

#### Scenario: Admin approves share purchase
- **WHEN** admin sends POST request to approve share purchase with valid ID
- **THEN** the system updates status to 'approved', allocates shares, and enables certificate generation

#### Scenario: Admin approval validation
- **WHEN** admin attempts to approve a purchase
- **THEN** system validates that admin has proper permissions and purchase exists

#### Scenario: Duplicate approval prevention
- **WHEN** admin attempts to approve already approved purchase
- **THEN** system returns success without duplicate processing

### Requirement: Certificate generation audit trail
The system SHALL track when certificates are generated for audit purposes.

#### Scenario: Log certificate generation event
- **WHEN** a certificate is generated
- **THEN** the system logs the event with timestamp, purchase ID, and user ID for audit trail

#### Scenario: Track certificate generation count
- **WHEN** a certificate is generated
- **THEN** the system can track how many times a certificate has been downloaded (future enhancement)
