## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - IP Rate Limiting for Auth Endpoints
**Vulnerability:** IP Rate Limiting applied too broadly can block valid users or lose inbox flooding protection if applied to initiation endpoints (e.g. `forgot-password`). Without IP limits on token consumers (e.g. `reset-password`), brute force attacks are possible.
**Learning:** For endpoints initiating an action (like sending an email), use the user/email identifier for rate limits to prevent inbox flooding without causing shared NAT IP collateral damage. For endpoints consuming a token, strictly use the client's IP address (`CF-Connecting-IP` or `X-Forwarded-For`) to prevent automated token scanning/brute-forcing.
**Prevention:** Apply email-based rate-limits for `/forgot-password` and IP-based rate-limits for `/reset-password`.
