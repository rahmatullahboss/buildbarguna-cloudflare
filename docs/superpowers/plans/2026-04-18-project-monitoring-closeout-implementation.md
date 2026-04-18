# Project Monitoring And Closeout Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project member monitoring, immutable closeout settlement entries, and settlement-aware withdrawal monitoring to the existing investment platform.

**Architecture:** Extend the current financial model rather than replacing it. Keep `user_shares`, `profit_distributions`, and `withdrawals`, but add `project_members`, `project_closeout_runs`, and `project_settlement_entries` so project staffing, closeout-generated claimable balance, and withdrawal traceability become first-class concepts.

**Tech Stack:** Cloudflare Workers, Hono, D1/SQLite, TypeScript, React, TanStack Query, Vitest

---

### Task 1: Add Schema For Project Members And Settlement Ledger

**Files:**
- Modify: `buildbarguna-cloudflare/src/db/schema.sql`
- Create: `buildbarguna-cloudflare/src/db/migrations/035_project_monitoring_and_settlement.sql`
- Test: `buildbarguna-cloudflare/src/lib/migrations.unit.test.ts`

- [ ] Add `project_members`, `project_closeout_runs`, and `project_settlement_entries` tables plus indexes.
- [ ] Make `projects.status` compatible with `completed`.
- [ ] Add migration SQL that is safe for existing databases.
- [ ] Extend migration tests if the suite asserts known tables or columns.

### Task 2: Add Shared Types For Monitoring And Settlement

**Files:**
- Modify: `buildbarguna-cloudflare/src/types.ts`
- Modify: `buildbarguna-cloudflare/frontend/src/lib/api.ts`

- [ ] Add backend row types for `ProjectMember`, `ProjectCloseoutRun`, and `ProjectSettlementEntry`.
- [ ] Add API response types for admin project monitor and user investment settlement summary.

### Task 3: Persist Settlement Entries At Closeout

**Files:**
- Modify: `buildbarguna-cloudflare/src/routes/admin.ts`
- Modify: `buildbarguna-cloudflare/src/lib/project-closeout.ts`
- Test: `buildbarguna-cloudflare/src/routes/admin-project-closeout.integration.test.ts`

- [ ] Extend closeout preview to include settlement projection and duplicate-run awareness.
- [ ] Update closeout execution to create one closeout run and immutable per-user settlement entries.
- [ ] Keep legacy earnings refund entry for compatibility, but make settlement ledger the new authoritative source for monitoring.
- [ ] Add tests covering generated settlement rows and idempotency blocking.

### Task 4: Add Project Member CRUD And Admin Monitor API

**Files:**
- Modify: `buildbarguna-cloudflare/src/routes/admin.ts`
- Test: `buildbarguna-cloudflare/src/routes/admin-project-closeout.integration.test.ts`

- [ ] Add endpoints to list, create, and remove project members.
- [ ] Add a combined admin monitor endpoint returning project members, shareholders, settlement totals, and withdrawal totals.

### Task 5: Make Withdrawal Balance And History Settlement-Aware

**Files:**
- Modify: `buildbarguna-cloudflare/src/routes/withdrawals.ts`
- Test: `buildbarguna-cloudflare/src/routes/withdrawals.integration.test.ts`

- [ ] Include claimable/reserved/withdrawn totals from `project_settlement_entries` in user balance calculation.
- [ ] Extend breakdown output to show `closeout_principal_refund` and `closeout_final_profit`.
- [ ] When a new withdrawal request is created, reserve settlement entries FIFO against the request.
- [ ] On admin approval/rejection/completion flows, transition reserved settlement entries accordingly.

### Task 6: Expose User Investment Settlement Summary

**Files:**
- Modify: `buildbarguna-cloudflare/src/routes/shares.ts`
- Modify: `buildbarguna-cloudflare/src/routes/earnings.ts`
- Test: `buildbarguna-cloudflare/src/routes/withdrawals.integration.test.ts`

- [ ] Extend `GET /api/shares/my` to include settlement summary per project.
- [ ] Keep response backward compatible so current pages do not break.

### Task 7: Add Admin UI For Monitoring

**Files:**
- Modify: `buildbarguna-cloudflare/frontend/src/lib/api.ts`
- Modify: `buildbarguna-cloudflare/frontend/src/pages/admin/ProjectCloseout.tsx`
- Modify: `buildbarguna-cloudflare/frontend/src/pages/admin/AdminProjects.tsx`

- [ ] Show projected/generated settlement totals in closeout UI.
- [ ] Add an admin monitor view in project management with project members and shareholder holdings.

### Task 8: Add User UI For Settlement Visibility

**Files:**
- Modify: `buildbarguna-cloudflare/frontend/src/pages/MyInvestments.tsx`
- Modify: `buildbarguna-cloudflare/frontend/src/pages/Withdraw.tsx`
- Modify: `buildbarguna-cloudflare/frontend/src/lib/api.ts`

- [ ] Show shares held, principal refund, final closeout profit, and claimable totals per project.
- [ ] Show settlement-origin breakdown where withdrawal decisions are made.

### Task 9: Verify

**Files:**
- Test: `buildbarguna-cloudflare/src/routes/admin-project-closeout.integration.test.ts`
- Test: `buildbarguna-cloudflare/src/routes/withdrawals.integration.test.ts`
- Test: targeted frontend typecheck or build command if available

- [ ] Run targeted backend integration tests.
- [ ] Run any available frontend typecheck/build command for touched files.
- [ ] Fix regressions before closeout.
