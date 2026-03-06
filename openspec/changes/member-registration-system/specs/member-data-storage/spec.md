## ADDED Requirements

### Requirement: System stores member registration data
The system SHALL store all member registration information in a D1 database table.

#### Scenario: New registration is saved
- **WHEN** a user submits a valid registration form
- **THEN** the system creates a new record in the member_registrations table

#### Scenario: Registration includes timestamp
- **WHEN** a registration is saved
- **THEN** the system records the submission timestamp

#### Scenario: Registration receives unique ID
- **WHEN** a registration is saved
- **THEN** the system assigns a unique auto-incrementing ID

### Requirement: System can retrieve registration by ID
The system SHALL provide the ability to query registration data by Form Number or ID.

#### Scenario: Retrieve registration for PDF generation
- **WHEN** PDF generation is triggered
- **THEN** the system retrieves the complete registration record by ID

#### Scenario: Retrieve registration by Form Number
- **WHEN** a lookup is performed with a Form Number
- **THEN** the system returns the matching registration record

### Requirement: Database schema supports all fields
The system SHALL define a database schema that accommodates all registration form fields.

#### Scenario: Schema includes personal information columns
- **WHEN** the table is created
- **THEN** it includes columns for name_english, name_bangla, father_name, mother_name, date_of_birth, blood_group

#### Scenario: Schema includes contact columns
- **WHEN** the table is created
- **THEN** it includes columns for present_address, permanent_address, facebook_id, mobile_whatsapp, emergency_contact, email

#### Scenario: Schema includes additional fields
- **WHEN** the table is created
- **THEN** it includes columns for skills_interests, form_number, declaration_accepted, created_at

### Requirement: Data validation at database level
The system SHALL enforce data integrity through database constraints.

#### Scenario: Required fields cannot be null
- **WHEN** an insert is attempted with null required fields
- **THEN** the database rejects the operation

#### Scenario: Email uniqueness
- **WHEN** a registration is submitted with an email already in the system
- **THEN** the system handles the duplicate appropriately (allow or reject based on business rule)

#### Scenario: Mobile number format validation
- **WHEN** a mobile number is stored
- **THEN** it follows Bangladesh phone number format
