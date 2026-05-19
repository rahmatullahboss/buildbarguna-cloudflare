## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in PDF Generation
**Vulnerability:** User-provided data in PDF generation was directly interpolated into HTML strings without escaping, creating a critical Server-Side XSS and SSRF vulnerability during headless browser execution.
**Learning:** Headless browsers evaluating unescaped HTML can be exploited to run malicious scripts on the server or access local network resources (SSRF).
**Prevention:** Always strictly escape all user-provided data using an `escapeHTML` utility before interpolating it into HTML templates intended for PDF conversion.
