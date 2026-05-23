## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in PDF Generation API
**Vulnerability:** The HTML templates in `src/lib/pdf/api-generator.ts` directly interpolated user-provided strings (like names, addresses, form numbers) into the HTML without sanitization. If an external PDF generation API was used, this could lead to Server-Side XSS, potentially allowing attackers to read local files, exfiltrate data, or execute arbitrary JavaScript within the headless browser context of the external PDF service (and in some cases, Server-Side Request Forgery).
**Learning:** Even though the PDF generation is offloaded to a third-party service, the initial HTML string is generated server-side. Unsanitized user inputs in server-side HTML generation for PDF conversion APIs act as a vector for Server-Side XSS.
**Prevention:** All dynamic, user-provided inputs must be strictly escaped using an `escapeHTML` utility or a specialized library before being inserted into HTML strings intended for PDF generation.
