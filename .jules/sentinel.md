## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2024-07-06 - Server-Side XSS in PDF Generation
**Vulnerability:** User input was not escaped before being embedded in HTML strings that were subsequently sent to headless browsers (PDFShift, DocRaptor, Adobe PDF Services) for PDF conversion, creating a Server-Side XSS risk.
**Learning:** When generating HTML strings for external APIs or headless browsers, data is not automatically escaped like it is in JSX. This can allow attackers to inject malicious HTML or JS that runs on the external server, potentially leading to SSRF or data exfiltration.
**Prevention:** Always explicitly sanitize or escape user-provided data using an HTML escape utility before embedding it into raw HTML strings intended for headless browser processing.
