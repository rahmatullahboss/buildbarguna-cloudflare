## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2025-03-10 - Rate limit missing on reset-password
**Vulnerability:** The password reset completion endpoint (`reset-password`) was missing rate limiting, allowing brute force attempts on the reset token.
**Learning:** For endpoints consuming a token (like reset-password), the client's IP address (`CF-Connecting-IP` or `X-Forwarded-For`) should be used for rate limiting to prevent brute-force attacks across accounts, rather than rate limiting by a user identifier since the request hasn't been authenticated. On the other hand, initiation endpoints (like `forgot-password`) should be rate limited by the user identifier to prevent inbox flooding without locking out multiple legitimate users behind a shared NAT.
**Prevention:** Apply consistent rate limiting to all authentication-related endpoints using appropriate identifiers.
