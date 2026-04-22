## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-04-22 - Differentiating Rate-Limit Keys for Security
**Vulnerability:** Missing rate limit on the token consumption endpoint (`reset-password`) allows attackers to scan and brute-force password reset tokens.
**Learning:** Rate-limiting logic must differentiate its key strategy based on the endpoint's purpose. For initiation endpoints (e.g., `forgot-password`), using a user identifier (like email) prevents inbox flooding and doesn't block legitimate users sharing an IP (like NAT). For token consumption endpoints (e.g., `reset-password`), using the client's IP address is critical to prevent attackers from distributed scanning or brute-forcing valid tokens.
**Prevention:** Implement distinct rate limit keying strategies: user identifiers for action initiation, and IP addresses for token consumption and authentication endpoints.
