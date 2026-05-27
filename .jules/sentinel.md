## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Race Condition in Admin Endpoints Without Status Guards
**Vulnerability:** Admin point-withdrawal `approve` and `complete` endpoints lacked status guards (`AND status = 'pending'` or `AND status = 'approved'`) in their `UPDATE` queries.
**Learning:** In D1/SQLite, if an admin executes an action without verifying the current state directly in the `UPDATE` statement, simultaneous requests by different admins can cause the same action to be applied multiple times, leading to duplicate notifications or inconsistent state.
**Prevention:** Always include the expected prior status in the `WHERE` clause of state-changing `UPDATE` queries and verify `meta.changes > 0` to ensure the update was exclusively executed by the current request.
