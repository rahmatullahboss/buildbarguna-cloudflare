## ADDED Requirements

### Requirement: User can access member registration form
The system SHALL provide a registration form accessible only to authenticated users for joining Build Barguna Initiative as a member.

#### Scenario: Authenticated user accesses registration
- **WHEN** a logged-in user navigates to the member registration page
- **THEN** the system displays the registration form with all required fields

#### Scenario: Unauthenticated user attempts to access registration
- **WHEN** a non-logged-in user tries to access the registration page
- **THEN** the system redirects them to the login page

### Requirement: User can submit registration data
The system SHALL validate and store member registration information including personal details, contact information, and declaration acceptance.

#### Scenario: Successful form submission
- **WHEN** user fills all required fields and accepts the declaration
- **THEN** the system saves the registration and proceeds to PDF generation

#### Scenario: Missing required fields
- **WHEN** user submits the form with empty required fields
- **THEN** the system displays validation errors for each missing field

#### Scenario: Invalid email format
- **WHEN** user enters an invalid email address
- **THEN** the system displays an error message for email format validation

#### Scenario: Invalid mobile number
- **WHEN** user enters a mobile number that is not a valid Bangladesh phone number
- **THEN** the system displays an error message for mobile number validation

#### Scenario: Declaration not accepted
- **WHEN** user submits the form without accepting the declaration checkbox
- **THEN** the system displays an error requiring declaration acceptance

### Requirement: User can view form fields
The system SHALL display all registration fields as specified in the BBI Member Registration Form design.

#### Scenario: Display personal information fields
- **WHEN** the registration form loads
- **THEN** the form shows fields for Name (English), Name (Bangla), Father's Name, Mother's Name, Date of Birth, and Blood Group

#### Scenario: Display contact information fields
- **WHEN** the registration form loads
- **THEN** the form shows fields for Present Address, Permanent Address, Facebook ID, Mobile No (WhatsApp), Guardian/Emergency contact, and Email

#### Scenario: Display skills and interests field
- **WHEN** the registration form loads
- **THEN** the form shows a text area for Skills & Interests

#### Scenario: Display declaration section
- **WHEN** the registration form loads
- **THEN** the form shows the undertaking & declaration text with checkbox for acceptance

### Requirement: System generates unique registration ID
The system SHALL generate a unique Form Number for each registration.

#### Scenario: New registration receives unique ID
- **WHEN** a registration is submitted successfully
- **THEN** the system generates a unique Form Number in sequential format
