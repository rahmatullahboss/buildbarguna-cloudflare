# Project Monitoring And Closeout Settlement Design

Date: 2026-04-18
Workspace: `/Users/rahmatullahzisan/Desktop/Dev/buildbarguna-cloudfare`
Primary app: `buildbarguna-cloudflare`

## Goal

Enhance the platform so admins can monitor, per project:

- who the assigned project members are
- who the shareholders are
- how many shares each shareholder holds
- how much profit has been distributed
- how much principal and final profit became claimable at project closeout
- how much has already been withdrawn versus is still claimable

Also define a safe closeout-driven withdrawal model where:

- admin performs project closeout
- the system automatically creates claimable settlement balances
- users later submit normal withdrawal requests against claimable balance

This design follows investment platform best practices around auditability, idempotency, immutable snapshots, and clear separation between earned balance and paid-out cash.

## Current State

The codebase already has:

- global membership in `member_registrations`
- per-project share ownership in `user_shares`
- share purchase requests in `share_purchases`
- periodic profit distribution in `profit_distributions` and `shareholder_profits`
- user withdrawal flow in `withdrawals`
- project closeout preview and execution in admin routes

Current gaps:

- no first-class project member assignment table
- no single project monitor view combining members, shareholders, shares, profits, claimable, and withdrawn
- closeout preview computes capital refund totals but does not persist per-user closeout settlement entries
- withdrawal history lacks explicit source-level traceability back to closeout settlement events

## Approved Business Decisions

- `global member` stays the system-wide member concept
- `project member` means admin-assigned team member for a project
- `project shareholder` means a user with approved shares in a project
- project members and project shareholders are separate lists
- project closeout is admin-triggered only
- closeout creates claimable balances automatically
- users do not receive automatic payout
- users withdraw later through the standard withdrawal request flow

## Role Model

### Global Member

Source: `member_registrations`

Definition:

- active and verified member in the overall platform

### Project Member

Source: new `project_members` table

Definition:

- user explicitly assigned by admin to work on or manage a project

Notes:

- a user may be a global member but not a project member
- a user may be a project member and also a shareholder
- assignment is administrative, not derived from shares

### Project Shareholder

Source: derived from `user_shares`

Definition:

- user with `quantity > 0` for a project

Notes:

- shareholder status is financial ownership, not project staffing
- shareholder counts and holdings should be queryable per project and per user

## Data Model Changes

### 1. New Table: `project_members`

Purpose:

- persist project-specific member assignments

Suggested columns:

- `id`
- `project_id`
- `user_id`
- `role_label` nullable, short human label such as `manager`, `field officer`, `coordinator`
- `status` enum-like text: `active`, `inactive`, `removed`
- `assigned_by`
- `assigned_at`
- `removed_by` nullable
- `removed_at` nullable
- `notes` nullable
- `created_at`
- `updated_at`

Constraints:

- unique active membership per `project_id + user_id`
- foreign keys to `projects` and `users`

### 2. New Table: `project_settlement_entries`

Purpose:

- store immutable per-user closeout settlement entries
- provide the authoritative audit trail for principal refund and final closeout settlement

Suggested columns:

- `id`
- `project_id`
- `user_id`
- `closeout_run_id`
- `entry_type` text:
  - `principal_refund`
  - `final_profit_payout`
  - `closeout_adjustment`
- `amount_paisa`
- `shares_held_snapshot`
- `total_shares_snapshot`
- `ownership_bps_snapshot`
- `project_status_snapshot`
- `source_reference_type` nullable
- `source_reference_id` nullable
- `claim_status` text:
  - `claimable`
  - `reserved`
  - `withdrawn`
  - `reversed`
- `withdrawal_id` nullable
- `notes` nullable
- `created_at`
- `created_by`

Constraints:

- immutable after creation except controlled status transitions
- indexed by `project_id`, `user_id`, `closeout_run_id`, `claim_status`

### 3. New Table: `project_closeout_runs`

Purpose:

- group settlement entries under a single closeout event
- prevent duplicate settlement generation

Suggested columns:

- `id`
- `project_id`
- `mode`
- `status`
- `net_profit_paisa`
- `capital_refund_total_paisa`
- `final_profit_pool_paisa`
- `shareholders_count`
- `executed_by`
- `executed_at`
- `notes` nullable
- `created_at`

Constraints:

- one terminal successful closeout settlement run per project

### 4. Optional Supporting Audit Table

If the existing audit framework is preferred, no new generic audit table is required. Instead, write audit events into the existing financial or admin audit logs for:

- project member assignment created/removed
- closeout settlement generated
- settlement entry reversed or adjusted
- withdrawal approved against settlement entries

## Ledger Rules

### Earnings During Project Life

Existing rules continue:

- periodic profit distributions remain in `profit_distributions` and `shareholder_profits`
- these entries may continue flowing into user earned balance as they do today

### Closeout Settlement

At project closeout:

- admin finalizes closeout
- system calculates principal refund pool from sold shares and share price
- system calculates final closeout investor profit or adjustment pool
- system snapshots all current shareholders for that project
- system writes immutable settlement entries per user

Closeout-generated entries are separate from periodic project-life profit distributions.

### Claimable Balance

Claimable balance after closeout should be the sum of:

- `project_settlement_entries.amount_paisa` where `claim_status = 'claimable'`
- plus any other existing earnings sources already considered claimable under the current withdrawal model
- minus settlement entries reserved or linked to pending/approved/completed withdrawals

### Withdrawal Reservation

When a user submits a withdrawal request:

- the system reserves claimable amounts from oldest eligible claimable entries first
- selected entries move from `claimable` to `reserved`
- reservation is linked to the withdrawal request

When withdrawal is completed:

- reserved entries move to `withdrawn`

When withdrawal is rejected or cancelled:

- reserved entries revert to `claimable`

This gives exact source-to-withdrawal traceability.

## Closeout Workflow

### Preconditions

Current closeout blockers remain:

- no pending share purchases
- no unresolved expense allocations
- no undistributed profit
- no unresolved loss settlement blocker
- no duplicate capital refund

### Execution Steps

1. Admin opens closeout preview.
2. System validates all blockers.
3. Admin confirms closeout.
4. System creates one `project_closeout_runs` row.
5. System snapshots all project shareholders from `user_shares`.
6. System generates `project_settlement_entries`:
   - one `principal_refund` entry per shareholder
   - one `final_profit_payout` entry per shareholder when positive final pool exists
   - one `closeout_adjustment` entry if a non-standard correction is required
7. System updates project terminal status.
8. System writes audit events.
9. System makes these entries visible in admin and user monitoring views.

### Idempotency

Closeout settlement generation must be idempotent:

- if a successful closeout run already exists for the project, a second run is blocked
- retries after partial failure must check whether rows already exist for the run before inserting duplicates

## Monitoring Views

### Admin Project Monitor

Add a project-specific monitoring view or tab showing:

- project basic info and status
- assigned project members
- shareholder count
- sold shares total
- per-user share holdings
- cumulative periodic profit distributed
- total closeout principal generated
- total closeout final profit generated
- total claimable
- total reserved in pending withdrawals
- total withdrawn
- closeout settlement status

Recommended sections:

- `Members`
- `Shareholders`
- `Distributions`
- `Closeout Settlement`
- `Withdrawals`

### User Investment View

Enhance user investment pages to show per project:

- whether the user is a shareholder
- current shares held
- invested amount
- periodic profits received
- closeout principal refund generated
- closeout final profit generated
- total withdrawn
- remaining claimable

The user should clearly understand the difference between:

- invested amount
- profit earned during the project
- principal refunded at closeout
- final claimable balance

## API Changes

### Admin APIs

Add:

- `GET /api/admin/projects/:id/monitor`
  - combined summary for members, shareholders, distributions, settlement, withdrawals
- `GET /api/admin/projects/:id/members`
- `POST /api/admin/projects/:id/members`
- `PATCH /api/admin/projects/:id/members/:memberId`
- `DELETE /api/admin/projects/:id/members/:memberId`

Enhance:

- closeout preview endpoint to show settlement projection per shareholder
- closeout execute endpoint to return generated `closeout_run_id` and aggregate settlement totals

### User APIs

Add or enhance:

- `GET /api/shares/my`
  - include derived shareholder and project settlement summary
- `GET /api/withdrawals/balance/breakdown`
  - include closeout settlement categories from `project_settlement_entries`
- `GET /api/investments/projects/:id`
  - detail view for one project holding and settlement history

### Withdrawal APIs

Enhance request creation and history responses to include:

- source breakdown
- reserved settlement entry totals
- project-level origin for closeout-driven balances

## Best-Practice Guardrails

### Immutable Snapshots

Closeout entries must not depend on future `user_shares` edits. Snapshot columns are mandatory.

### One-Way Financial Events

Do not edit approved settlement or completed withdrawal rows directly. Use reversal or adjustment entries.

### Source Traceability

Every withdrawable amount must be traceable back to:

- project
- closeout run
- settlement entry type

### Clear Separation Of Concepts

Keep these values distinct in storage and UI:

- periodic profit
- final closeout profit
- principal refund
- claimable balance
- withdrawn balance

### Controlled Payout

Automatic creation of claimable balance is allowed.
Automatic cash payout is not.

This protects against:

- wrong payout destination
- duplicate payout
- user account mismatch
- unresolved compliance or support review

### Admin Transparency

Admin screens should show source-aware totals, not just one combined numeric balance.

## Edge Cases

### Shareholder Becomes Inactive Later

- settlement still generates based on closeout snapshot
- withdrawal may remain subject to normal admin approval rules

### Project With Zero Final Profit

- principal refund entries are still created
- no final profit entries are created

### Project With Final Loss

- current closeout blockers already require settlement review
- no automatic negative shareholder deduction is introduced in this scope
- any correction must use explicit adjustment workflow later if needed

### Rejected Withdrawal

- reserved settlement entries return to claimable state

### Duplicate Closeout Request

- blocked by successful run check and row existence checks

## Implementation Scope

### Phase 1. Schema And Backend Ledger

- add `project_members`
- add `project_closeout_runs`
- add `project_settlement_entries`
- add migration indexes and constraints
- extend closeout execution to persist settlement entries

### Phase 2. Monitoring APIs

- build admin project monitor summary endpoint
- add project member CRUD endpoints
- extend balance breakdown APIs

### Phase 3. Admin UI

- add project monitor section in admin project area
- show member assignment management
- show shareholder table with holdings and settlement totals
- show closeout settlement results and withdrawal summary

### Phase 4. User UI

- enhance `MyInvestments` or project detail views
- show share count, profits, principal refund, claimable, withdrawn

### Phase 5. Tests

- migration tests
- closeout settlement generation integration tests
- idempotency tests
- withdrawal reservation and release tests
- API response tests for new monitor views

## Files Likely To Change

Backend:

- `buildbarguna-cloudflare/src/db/schema.sql`
- `buildbarguna-cloudflare/src/db/migrations/...`
- `buildbarguna-cloudflare/src/routes/admin.ts`
- `buildbarguna-cloudflare/src/routes/withdrawals.ts`
- `buildbarguna-cloudflare/src/routes/shares.ts`
- `buildbarguna-cloudflare/src/types.ts`

Frontend:

- `buildbarguna-cloudflare/frontend/src/lib/api.ts`
- `buildbarguna-cloudflare/frontend/src/pages/admin/AdminProjects.tsx`
- `buildbarguna-cloudflare/frontend/src/pages/admin/ProjectCloseout.tsx`
- `buildbarguna-cloudflare/frontend/src/pages/MyInvestments.tsx`
- possibly a new admin project monitor page or embedded section

## Out Of Scope

- automatic bank or mobile-wallet payout after closeout
- multi-admin closeout approval
- negative balance recovery from shareholders
- tax reporting
- external accounting system sync

## Recommendation

Implement the enhancement as a role-plus-ledger extension:

- derive shareholders from `user_shares`
- introduce first-class `project_members`
- introduce immutable closeout settlement ledger tables
- keep payout manual through normal withdrawals

This is the best fit for the current architecture because it preserves existing flows while adding the missing monitoring and closeout traceability needed for a financial platform.
