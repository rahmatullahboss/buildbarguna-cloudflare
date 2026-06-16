## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-11 - TOCTOU Race Condition in Admin Point Processing
**Vulnerability:** Race condition (Time-of-Check to Time-of-Use) in the admin reward redemptions and point withdrawals processing endpoints.
**Learning:** In Cloudflare D1/SQLite architectures, fetching the status and then subsequently updating it in a separate statement without enforcing the expected current state in the `WHERE` clause allows concurrent requests to approve/process the same transaction multiple times.
**Prevention:** Always enforce the expected current state in the `WHERE` clause of `UPDATE` queries (e.g., `WHERE id = ? AND status = 'pending'`) and explicitly check if `meta.changes > 0` to confirm the state change succeeded before executing subsequent side-effects like refunds or logging.
