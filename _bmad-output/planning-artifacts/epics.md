---
stepsCompleted: ['step-01-validate-prerequisites']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/project-context.md'
workflowType: 'epics'
project_name: 'buildbarguna-cloudfare'
user_name: 'Rahmatullahzisan'
date: '2026-03-09'
---

# BuildBarguna - Task & Point Wallet System Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Task & Point Wallet System feature, decomposing requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

| ID | Requirement |
|----|------------|
| FR1 | Members can view available tasks with point rewards |
| FR2 | Members can start a task and see a timer |
| FR3 | Tasks auto-complete after timer elapses and award points |
| FR4 | Server validates timer elapsed before awarding points |
| FR5 | Daily task limits are enforced per user |
| FR6 | One-time tasks can only be completed once |
| FR7 | Duplicate task completions are prevented |
| FR8 | Members can view their point balance and history |
| FR9 | Points settle to wallet monthly automatically |
| FR10 | Members can request cash withdrawal from wallet (min 200 points) |
| FR11 | One pending withdrawal per user at a time |
| FR12 | Admin can view pending withdrawal requests |
| FR13 | Admin can approve/reject/complete withdrawals |
| FR14 | bKash number validation for withdrawals |
| FR15 | Point to Taka conversion (100 points = 100 Taka) |

### Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR1 | Task list API response < 500ms |
| NFR2 | Task completion API response < 200ms |
| NFR3 | Wallet operations < 300ms |
| NFR4 | Server-side timer validation (not client-side only) |
| NFR5 | Rate limiting on task endpoints |
| NFR6 | All endpoints require authentication |
| NFR7 | Admin endpoints require admin role |
| NFR8 | All monetary values as INTEGER (paisa/points) |
| NFR9 | All transactions logged in audit trail |

### Additional Requirements from Architecture

| ID | Requirement | Source |
|----|------------|--------|
| AR1 | Use authMiddleware for all member endpoints | Architecture |
| AR2 | Use adminMiddleware for admin endpoints | Architecture |
| AR3 | Use ok()/err() response helpers | Architecture |
| AR4 | Create new route files: tasks.ts, wallet.ts | Architecture |
| AR5 | Add new types to src/types.ts | Architecture |
| AR6 | Database migration: 4 new tables required | Architecture |
| AR7 | Integrate with existing cron (monthly) | Architecture |
| AR8 | Use existing D1 patterns and conventions | Architecture |

### FR Coverage Map

| FR | Epic | Stories |
|----|------|----------|
| FR1-FR3 | Epic 1 | S1.1, S1.2 |
| FR4-FR7 | Epic 1 | S1.3, S1.4 |
| FR8 | Epic 2 | S2.1 |
| FR9 | Epic 3 | S3.1, S3.2 |
| FR10-FR15 | Epic 4 | S4.1-S4.4 |
| FR12-FR13 | Epic 5 | S5.1-S5.3 |

## Epic List

| Epic | Title | Description |
|------|-------|-------------|
| Epic 1 | Member Task System | Member-facing task list, start, complete with timer |
| Epic 2 | Points Display | Member point balance and history |
| Epic 3 | Monthly Settlement | Automated monthly settlement cron |
| Epic 4 | Wallet & Cash Out | Point wallet and withdrawal system |
| Epic 5 | Admin Withdrawal Management | Admin approval workflow |

---

## Epic 1: Member Task System

**Goal:** Enable members to view available tasks and complete them with timer-based verification to earn points fairly.

### Story 1.1: View Available Tasks

**As a** member,  
**I want** to see a list of available tasks with their point rewards,  
**So that** I can choose which tasks to complete.

**Acceptance Criteria:**

**Given** I am logged in as a member  
**When** I navigate to the tasks page  
**Then** I should see all active tasks  
**And** each task should show: title, platform icon, points, cooldown time  
**And** daily tasks should show remaining count  
**And** one-time tasks should be separated from daily tasks

**Given** I am logged in as a member  
**When** I view the tasks list  
**Then** tasks I've already completed today should show "Completed" status  
**And** one-time tasks I've completed should show "Already Done" status  
**And** tasks at daily limit should show "Limit Reached" status

---

### Story 1.2: Start Task with Timer

**As a** member,  
**I want** to start a task and see a countdown timer,  
**So that** I know how long to stay on the task page.

**Acceptance Criteria:**

**Given** I am on the tasks page  
**When** I click "Start" on a task  
**Then** the system should record my start time  
**And** return the destination URL  
**And** return the required wait time in seconds  
**And** show a countdown timer in the UI

**Given** I have started a task  
**When** I try to start the same task again on the same day  
**Then** I should see "Already Started" message  
**And** the timer should continue from where it was

**Given** I am on a task's timer screen  
**When** I navigate away before timer completes  
**Then** I should be able to return and resume the timer

---

### Story 1.3: Complete Task and Earn Points

**As a** member,  
**I want** to complete a task after the timer and earn points,  
**So that** my point balance increases.

**Acceptance Criteria:**

**Given** I have started a task and timer is running  
**When** I click "Complete" before timer finishes  
**Then** I should see an error message telling me to wait  
**And** points should NOT be awarded

**Given** I have started a task and timer has finished  
**When** I click "Complete"  
**Then** I should see "Task Completed!" message  
**And** my points should increase by the task's point value  
**And** I should see my new point total  
**And** task should show as completed for today

**Given** I try to complete a task without starting it first  
**Then** I should see an error "Start the task first"

**Given** I try to complete a one-time task that I already completed  
**Then** I should see "Already completed" error

---

### Story 1.4: Prevent Duplicate Completions

**As a** system,  
**I want** to prevent duplicate task completions,  
**So that** points are awarded fairly.

**Acceptance Criteria:**

**Given** I completed a daily task today  
**When** I try to complete the same task again today  
**Then** I should see "Already completed today" error  
**And** no points should be awarded

**Given** I completed a one-time task  
**When** I try to complete it again  
**Then** I should see "One-time task already completed" error  
**And** points should NOT be awarded

**Given** two requests come in simultaneously for the same task  
**Then** only one should succeed due to database UNIQUE constraint  
**And** the other should get a conflict error

---

## Epic 2: Points Display

**Goal:** Allow members to view their point balance and transaction history.

### Story 2.1: View Point Balance and History

**As a** member,  
**I want** to see my current point balance and earning history,  
**So that** I know how many points I have and how I earned them.

**Acceptance Criteria:**

**Given** I am logged in as a member  
**When** I view my points page  
**Then** I should see: available points, lifetime earned, monthly earned  
**And** I should see a list of recent point transactions  
**And** each transaction should show: date, description, points (+/-)

**Given** I am viewing my points history  
**When** I filter by month  
**Then** I should only see transactions for that month

**Given** I am viewing my points history  
**When** I scroll down  
**Then** older transactions should load (pagination)

---

## Epic 3: Monthly Settlement

**Goal:** Automatically convert earned points to wallet balance at month end.

### Story 3.1: Monthly Settlement Cron Job

**As a** system,  
**I want** to run a cron job on the 1st of each month,  
**So that** all earned points are transferred to member wallets.

**Acceptance Criteria:**

**Given** it is the 1st of the month at 00:00 BD time  
**When** the cron job runs  
**Then** for each user with available_points > 0  
**And** their points should transfer to point_wallets.balance  
**And** their available_points should reset to 0  
**And** a settlement record should be created  
**And** a transaction record should be created

**Given** a user has 500 available_points at month end  
**When** settlement runs  
**Then** their wallet balance should increase by 500  
**And** available_points should become 0  
**And** lifetime_added should increase by 500

---

### Story 3.2: Settlement Audit Trail

**As a** system,  
**I want** to create settlement records for each user each month,  
**So that** there is a clear audit trail of settlements.

**Acceptance Criteria:**

**Given** settlement runs for a user  
**Then** a record should be created in point_settlements table  
**And** it should show: user_id, month, points_settled, from_balance, to_wallet, settled_at

**Given** I want to view settlement history  
**Then** I should be able to see all past settlements by month

---

## Epic 4: Wallet & Cash Out

**Goal:** Allow members to withdraw points from their wallet to bKash.

### Story 4.1: View Wallet Balance

**As a** member,  
**I want** to see my wallet balance,  
**So that** I know how much I can withdraw.

**Acceptance Criteria:**

**Given** I am logged in as a member  
**When** I view my wallet page  
**Then** I should see: wallet balance, lifetime added, lifetime withdrawn  
**And** I should see any pending withdrawal requests  
**And** I should see the minimum withdrawal amount (200 points)

---

### Story 4.2: Request Cash Withdrawal

**As a** member,  
**I want** to request a cash withdrawal from my wallet,  
**So that** I can receive money via bKash.

**Acceptance Criteria:**

**Given** my wallet balance is 500 points  
**When** I enter 100 points and valid bKash number  
**And** I click "Withdraw"  
**Then** I should see a confirmation dialog  
**And** after confirming, I should see "Withdrawal request submitted"

**Given** my wallet balance is 100 points  
**When** I try to withdraw  
**Then** I should see error "Minimum withdrawal is 200 points"

**Given** I already have a pending withdrawal  
**When** I try to request another withdrawal  
**Then** I should see error "You already have a pending withdrawal"

**Given** I enter an invalid bKash number  
**Then** I should see validation error "Invalid bKash number format"

---

### Story 4.3: Withdrawal Status Updates

**As a** member,  
**I want** to see the status of my withdrawal request,  
**So that** I know when I'll receive my money.

**Acceptance Criteria:**

**Given** I submitted a withdrawal request  
**When** I view my withdrawal history  
**Then** I should see: amount, bKash number, status, requested date

**Given** my withdrawal is approved  
**Then** status should show "Approved"  
**And** I should see approval date

**Given** my withdrawal is completed  
**Then** status should show "Completed"  
**And** I should see the bKash transaction ID

**Given** my withdrawal is rejected  
**Then** status should show "Rejected"  
**And** I should see the admin note (if any)  
**And** my wallet balance should be restored

---

### Story 4.4: Point to Taka Conversion

**As a** system,  
**I want** to convert points to Taka at a 1:1 rate,  
**So that** members know the exact value of their points.

**Acceptance Criteria:**

**Given** I request to withdraw 200 points  
**Then** the amount in Taka should be 200  
**And** the conversion rate is 100 points = 100 Taka

---

## Epic 5: Admin Withdrawal Management

**Goal:** Allow admins to manage member withdrawal requests.

### Story 5.1: View Pending Withdrawals

**As an** admin,  
**I want** to see all pending withdrawal requests,  
**So that** I can process them.

**Acceptance Criteria:**

**Given** I am logged in as admin  
**When** I navigate to withdrawal management  
**Then** I should see a list of pending withdrawals  
**And** each should show: user name, phone, amount (points), amount (Taka), bKash number, requested date

**Given** I am viewing pending withdrawals  
**When** I filter by status  
**Then** I should only see withdrawals of that status

---

### Story 5.2: Approve/Reject Withdrawal

**As an** admin,  
**I want** to approve or reject withdrawal requests,  
**So that** members can receive their money or get their balance back.

**Acceptance Criteria:**

**Given** I am viewing a pending withdrawal  
**When** I click "Approve"  
**And** add an optional note  
**Then** withdrawal status should change to "Approved"  
**And** wallet balance should be deducted  
**And** lifetime_withdrawn should increase

**Given** I am viewing a pending withdrawal  
**When** I click "Reject"  
**And** add a reason  
**Then** withdrawal status should change to "Rejected"  
**And** member's wallet balance should NOT be changed (they can request again)

---

### Story 5.3: Mark Withdrawal as Completed

**As an** admin,  
**I want** to mark an approved withdrawal as completed after sending money,  
**So that** the process is complete.

**Acceptance Criteria:**

**Given** I approved a withdrawal  
**When** I enter the bKash transaction ID  
**And** click "Mark Completed"  
**Then** withdrawal status should change to "Completed"  
**And** the bKash TXID should be recorded

---

## Implementation Dependencies

| Story | Depends On | Blocked By |
|-------|------------|------------|
| S1.1 | - | - |
| S1.2 | S1.1 | - |
| S1.3 | S1.2, S1.4 | - |
| S1.4 | S1.3 | - |
| S2.1 | - | - |
| S3.1 | Epic 1 complete | S1.3 |
| S3.2 | S3.1 | - |
| S4.1 | - | - |
| S4.2 | S4.1 | S3.1 (needs wallet) |
| S4.3 | S4.2 | - |
| S4.4 | S4.2 | - |
| S5.1 | S4.2 | - |
| S5.2 | S5.1 | - |
| S5.3 | S5.2 | - |

---

## Summary

| Epic | Stories | Priority |
|------|---------|----------|
| Epic 1: Member Task System | 4 | High |
| Epic 2: Points Display | 1 | High |
| Epic 3: Monthly Settlement | 2 | High |
| Epic 4: Wallet & Cash Out | 4 | High |
| Epic 5: Admin Withdrawal Management | 3 | High |
| **Total** | **14** | |

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-09  
**Status:** Ready for Implementation