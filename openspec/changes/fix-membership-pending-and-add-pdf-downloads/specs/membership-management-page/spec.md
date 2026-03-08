## ADDED Requirements

### Requirement: Membership status display
The system SHALL display the member's registration status on a dedicated membership management page.

#### Scenario: Registered member views status
- **WHEN** a registered user navigates to `/membership`
- **THEN** the system displays their registration details including form number, name, payment status, and registration date

#### Scenario: Non-registered user views page
- **WHEN** a user without membership registration navigates to `/membership`
- **THEN** the system displays a message prompting them to register with a link to the registration page

### Requirement: Certificate download access control
The system SHALL only allow certificate download when payment is verified.

#### Scenario: Verified member downloads certificate
- **WHEN** a member with `payment_status = 'verified'` clicks the download button
- **THEN** the system generates and downloads the membership certificate PDF

#### Scenario: Pending member attempts download
- **WHEN** a member with `payment_status = 'pending'` views the membership page
- **THEN** the download button is disabled or hidden
- **AND** a message explains that verification is pending

#### Scenario: Rejected payment notification
- **WHEN** a member with `payment_status = 'rejected'` views the membership page
- **THEN** the system displays the rejection reason (if provided by admin)
- **AND** provides instructions to contact support

### Requirement: Status refresh capability
The system SHALL allow members to refresh their membership status.

#### Scenario: User refreshes status
- **WHEN** a member clicks the refresh button on the membership page
- **THEN** the system fetches the latest registration data
- **AND** updates the displayed status accordingly

### Requirement: Navigation accessibility
The system SHALL provide navigation to the membership page from the main navigation.

#### Scenario: User navigates from main menu
- **WHEN** a logged-in user clicks "Membership" in the navigation menu
- **THEN** the system navigates to the `/membership` page
