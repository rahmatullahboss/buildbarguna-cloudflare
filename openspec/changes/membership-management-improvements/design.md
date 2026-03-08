## Context

BuildBarguna is a group investment platform with a membership system. Currently:
- Membership registration works but payments incorrectly default to `'paid'` status instead of `'pending'`
- No dedicated page for members to manage their membership
- Share purchase receipts cannot be easily downloaded from the app
- Certificate download only available on the registration success page

## Goals / Non-Goals

**Goals:**
- Fix payment status bug so all submissions appear as pending for admin verification
- Create a Membership page where members can view status and download certificates
- Add share receipt download buttons in multiple locations (Dashboard, Portfolio, My Investments, Projects)
- Improve user experience with easy access to important documents

**Non-Goals:**
- Changing the membership verification workflow
- Modifying the PDF generation logic
- Adding new payment methods
- Admin panel improvements (separate concern)

## Decisions

### 1. Payment Status Fix
**Decision:** Change default `payment_status` from `'paid'` to `'pending'` in the registration endpoint.

**Rationale:** The comment in code explicitly states "ALL payments need admin verification" but the implementation incorrectly sets status to `'paid'`. This is a simple one-line fix.

### 2. Membership Page Location
**Decision:** Create new `/membership` route with dedicated page component.

**Rationale:** 
- Separates membership management from registration flow
- Allows members to return anytime to check status/download certificate
- Consistent with app's page-based architecture

### 3. Share Receipt Download
**Decision:** Add download buttons with inline PDF generation using existing receipt endpoint.

**Rationale:**
- Share purchase receipts already exist via `/shares/receipt/:id` endpoint (if implemented)
- Frontend already has PDF download pattern from certificate feature
- Reuse existing backend logic rather than creating new endpoints

### 4. Navigation Placement
**Decision:** Add "Membership" link in main sidebar after "Dashboard".

**Rationale:**
- Membership is a core feature for verified members
- Placement near top ensures visibility
- Consistent with navigation patterns

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users may not notice new Membership link | Add notification badge when payment is pending verification |
| Receipt endpoint may not exist | Verify endpoint exists, create if missing during implementation |
| PDF download may be slow | Show loading state, use async download pattern |
