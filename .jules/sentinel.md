## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-06-08 - Server-Side XSS in PDF Generation
**Vulnerability:** User-provided inputs (e.g. names, addresses) were embedded directly into HTML templates without sanitization, leading to Server-Side XSS during headless browser execution by external API services.
**Learning:** External services like PDFShift and DocRaptor render user input as HTML, meaning any malicious script tags can execute SSRF or XSS attacks against their environments, potentially leading to information disclosure.
**Prevention:** All user-provided data interpolated into HTML templates must be escaped using a standard HTML escape utility before generation.
