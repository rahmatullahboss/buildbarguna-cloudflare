## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2024-07-05 - Fix SQL Injection in PRAGMA table_info utility
**Vulnerability:** String interpolation in PRAGMA table_info(${table}) allowed potential SQL injection if table names were unvalidated user inputs.
**Learning:** PRAGMA statements in SQLite do not support bound parameters (?). String concatenation must be used, which creates an injection vector unless the input is strictly validated.
**Prevention:** Always use regex allowlisting (e.g., /^[a-zA-Z0-9_]+$/) to validate table and column names before interpolating them into PRAGMA or DDL statements.
