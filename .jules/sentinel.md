## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-05-26 - Server-Side XSS in External PDF Generation
**Vulnerability:** Unescaped user input inside HTML templates passed to external headless browsers.
**Learning:** Headless browsers evaluating unescaped HTML can trigger critical Server-Side XSS or SSRF attacks, compromising the application or exposing secrets.
**Prevention:** Always strictly escape user-provided data using an `escapeHTML` utility before injecting it into HTML templates used for PDF generation.
