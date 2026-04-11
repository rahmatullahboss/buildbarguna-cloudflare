## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2025-03-10 - Prevent Stored XSS via URL Schemas
**Vulnerability:** URL validation using only `z.string().url()` allows potentially dangerous URIs like `javascript:` or `data:`, which can lead to Stored XSS if rendered directly into `href` or `src` attributes on the frontend.
**Learning:** Cloudflare Workers/Hono applications using Zod for API validation must explicitly enforce acceptable protocol prefixes for URLs, as standard URL validation only checks structural compliance. Ensure the `.refine()` method is chained *before* `.optional()`, `.nullable()`, or `.or()` modifiers.
**Prevention:** Always append a `.refine(val => val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://'))` step when validating user-provided URLs intended for frontend rendering.
