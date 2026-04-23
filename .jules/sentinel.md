## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-04-23 - Token Brute-Forcing and Scanning
**Vulnerability:** The password reset token consumption endpoint (`POST /api/auth/reset-password`) was missing rate limiting, making it vulnerable to brute-force attacks and token scanning to takeover accounts.
**Learning:** While email-based rate limits work for initiation endpoints (like `forgot-password`), token consumption endpoints must use the client's IP address (`CF-Connecting-IP` or `X-Forwarded-For`) to effectively mitigate token guessing and enumeration from malicious actors.
**Prevention:** Always implement IP-based rate limiting on sensitive endpoints that validate tokens, codes, or credentials where the user context (like email) is not the primary mechanism of authorization but the token itself.
