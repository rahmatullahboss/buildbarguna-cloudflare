## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - TOCTOU Race Condition in Profit Distribution Approvals
**Vulnerability:** Time-of-Check to Time-of-Use (TOCTOU) race condition in `POST /company-fund/approve/:id` and `POST /company-fund/reject/:id` routes.
**Learning:** The code verified the transaction state (`status = 'pending_approval'`) using a `SELECT` statement, but failed to enforce this expected state in the subsequent `UPDATE` statement's `WHERE` clause. This allowed concurrent requests to potentially approve/reject the same transaction multiple times, duplicating side effects like audit logs.
**Prevention:** In Cloudflare D1/SQLite architectures, always prevent race conditions during state transitions by enforcing the expected current state in the `UPDATE` query's `WHERE` clause (e.g., `WHERE id = ? AND status = 'pending_approval'`). Explicitly verify if `meta.changes > 0` on the returned D1 result to confirm the state change succeeded before executing subsequent side-effects.
