# Quick Spec: Membership Management - Edit, Cancel, Reapply

## Project: BuildBarguna (Cloudflare Workers + React)

## Date: 2026-03-08

---

## 1. Overview

Add membership management features to allow members to edit their registration information, cancel their membership, and reapply after cancellation.

---

## 2. Problem Statement

Current membership system lacks:
- Edit capability for member information
- Cancel membership functionality  
- Re-apply after cancellation

---

## 3. Requirements

### 3.1 Database Changes

Add to `member_registrations` table:
```sql
ALTER TABLE member_registrations ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'rejected'));
ALTER TABLE member_registrations ADD COLUMN cancelled_at TEXT;
ALTER TABLE member_registrations ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
ALTER TABLE member_registrations ADD COLUMN cancellation_reason TEXT;
ALTER TABLE member_registrations ADD COLUMN previous_registration_id INTEGER REFERENCES member_registrations(id);
```

### 3.2 API Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/member` | GET | User | Get own registration with status |
| `/api/member` | PUT | User | Update own registration (if active) |
| `/api/member/cancel` | POST | User | Cancel own membership |
| `/api/member/reapply` | POST | User | Reapply after cancellation |

### 3.3 Business Logic

#### Edit Rules:
- Only `active` members can edit their info
- Cannot edit form_number, user_id, created_at
- Payment info can be updated if payment is pending

#### Cancel Rules:
- Only `active` members can cancel
- Set status = 'cancelled', cancelled_at = now(), cancelled_by = user_id
- After cancellation, user can reapply

#### Reapply Rules:
- Only `cancelled` members can reapply
- Creates new registration linked to previous via previous_registration_id
- New status = 'pending' (needs admin verification)

---

## 4. API Response Formats

### GET /api/member
```json
{
  "success": true,
  "data": {
    "id": 1,
    "form_number": "BBI-2026-0001",
    "name_english": "John Doe",
    "status": "active",
    "payment_status": "verified",
    "created_at": "2026-01-15",
    "cancelled_at": null
  }
}
```

### PUT /api/member
```json
{
  "success": true,
  "data": {
    "message": "তথ্য আপডেট সফল হয়েছে"
  }
}
```

### POST /api/member/cancel
```json
{
  "success": true,
  "data": {
    "message": "মেম্বারশিপ বাতিল হয়েছে",
    "status": "cancelled"
  }
}
```

### POST /api/member/reapply
```json
{
  "success": true,
  "data": {
    "message": "পুনরায় আবেদন সফল হয়েছে",
    "form_number": "BBI-2026-0002",
    "status": "pending"
  }
}
```

---

## 5. Validation Rules

### Edit Validation:
- Same as registration (from registerSchema)
- Optional fields remain optional

### Cancel Validation:
- Must provide cancellation_reason (min 10 chars)
- Cannot cancel if already cancelled

### Reapply Validation:
- Cannot reapply if already active
- Must provide updated info if changed

---

## 6. Acceptance Criteria

1. ✅ User can view their membership status (active/cancelled/pending)
2. ✅ User can edit their registration information when active
3. ✅ User can cancel their membership with reason
4. ✅ Cancelled user can reapply and create new registration
5. ✅ Admin can see cancellation history in member list
6. ✅ Audit log tracks all these actions

---

## 7. Implementation Order

1. Database migration
2. Backend API endpoints
3. Frontend API functions
4. Frontend UI components
5. Testing

---

## 8. Files to Modify

### Backend:
- `src/routes/member.ts` - Add new endpoints
- `src/db/migrations/` - New migration file
- `src/types.ts` - Update types if needed

### Frontend:
- `frontend/src/lib/api.ts` - Add API functions
- `frontend/src/pages/` - Update member pages
