## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-06-21 - [Time-of-Check to Time-of-Use (TOCTOU) in Admin Withdrawals]
**Vulnerability:** The point withdrawal `approve` and `complete` endpoints in `admin.ts` checked the current `status` via a `SELECT` statement but updated the state via a separate `UPDATE` statement that did not enforce `WHERE status = 'expected_state'`. A concurrent request could execute the update again, resulting in duplicate side-effects (like notifications or audit logs) or transitioning an already 'rejected' withdrawal into 'approved' or 'completed'.
**Learning:** In a serverless/Cloudflare Workers environment where D1 execution is fast but concurrent requests are possible, all state transitions must be atomic. The `WHERE` clause must act as the synchronization mechanism alongside `meta.changes`.
**Prevention:** Always append `AND status = 'expected_prior_state'` to `UPDATE` queries for state machines, and explicitly verify `if (!result.meta.changes || result.meta.changes === 0)` before executing any side effects.
