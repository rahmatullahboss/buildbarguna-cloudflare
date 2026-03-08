## MODIFIED Requirements

### Requirement: Payment status initialization
The system SHALL set membership payment status to 'pending' upon registration submission.

#### Scenario: New registration pending status
- **WHEN** a user submits a membership registration with payment information
- **THEN** the system creates a record with `payment_status = 'pending'`
- **AND** the record appears in the admin's pending verification queue

#### Scenario: Admin verifies payment
- **WHEN** an admin approves a pending membership
- **THEN** the system updates `payment_status = 'verified'`
- **AND** the member can download their certificate

#### Scenario: Admin rejects payment
- **WHEN** an admin rejects a pending membership
- **THEN** the system updates `payment_status = 'rejected'`
- **AND** the rejection reason is stored and visible to the member
