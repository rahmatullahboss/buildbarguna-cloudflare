## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - IP-Based Rate Limiting for Token Consumption
**Vulnerability:** Missing rate limiting on the `/reset-password` endpoint. This could allow an attacker to launch brute-force or scanning attacks against password reset tokens.
**Learning:** For initiation endpoints (like `forgot-password`), it's correct to apply rate limiting based on the user identifier (e.g. email) to prevent inbox flooding without blocking legitimate users on shared IPs. However, for token consumption endpoints (like `reset-password`), rate limiting must be based strictly on the client's IP address (via `CF-Connecting-IP` or `X-Forwarded-For`).
**Prevention:** Always apply IP-based rate limiting on sensitive token validation endpoints to prevent brute-forcing. Add the rate limit thresholds (e.g., `RESET_PASSWORD: { MAX_ATTEMPTS: 5, WINDOW_MINUTES: 15 }`) to the shared `RATE_LIMITS` configuration constant.
