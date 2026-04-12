## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2024-05-28 - Stored XSS via Zod URL Validation
**Vulnerability:** Zod's `z.string().url()` allows `javascript:` and `data:` URIs by default, which can lead to Stored XSS when these URLs are stored in the database and later rendered in `src` or `href` attributes in the frontend without proper sanitization.
**Learning:** Default URL validators often only verify RFC 3986 syntax, not the safety of the protocol. In web applications where URLs are used in HTML, they must be explicitly restricted to `http://` or `https://` to prevent XSS payloads. Additionally, `.refine()` logic must be applied *before* `.optional()`, `.nullable()`, or `.or()` modifiers.
**Prevention:** Always combine `z.string().url()` with a `.refine()` check enforcing `http://` or `https://` (case-insensitively) when validating user-provided image URLs or links.
