## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2025-03-10 - IP-Based Rate Limiting for Unauthenticated Endpoints
**Vulnerability:** Rate limiting by email in the `forgot-password` endpoint and lacking rate limit on the `reset-password` endpoint.
**Learning:** If rate-limiting is bound to user inputs on sensitive, unauthenticated endpoints, attackers can easily bypass it to scan for tokens or enumerate emails by simply altering their inputs.
**Prevention:** For rate limiting sensitive authentication endpoints where a user identifier is not yet verified (e.g., password reset), use the client's IP address as the primary identifier in the rate-limit key.
