## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2024-06-24 - Race Conditions in Cloudflare D1 Batches
**Vulnerability:** TOCTOU race conditions where multiple admins could approve the same transaction, due to `c.env.DB.batch()` executing audit logs even if the conditional `UPDATE` affected 0 rows.
**Learning:** In Cloudflare D1, `c.env.DB.batch()` does not short-circuit or abort subsequent statements (like `INSERT` audit logs) if an earlier `UPDATE` affects 0 rows. A batch executes all valid queries sequentially.
**Prevention:** To prevent race condition side-effects, split the database operations. First, execute the conditional `UPDATE` query individually using `.run()`. Then, verify `meta.changes > 0`. Only execute the subsequent audit log or side-effect statements if the initial mutation succeeded.
