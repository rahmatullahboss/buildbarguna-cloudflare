## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.
## 2024-03-08 - XSS Prevention in HTML to PDF Generation
**Vulnerability:** User input injected into HTML strings rendered by external API/innerHTML without escaping
**Learning:** HTML strings constructed for PDF generation or set via innerHTML are vulnerable to Server-Side XSS and SSRF if user input is not escaped.
**Prevention:** Strictly escape all user-provided data using an HTML escape utility before embedding it in HTML strings.
