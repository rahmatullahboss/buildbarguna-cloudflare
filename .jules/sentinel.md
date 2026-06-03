## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in External PDF Generation
**Vulnerability:** User-provided inputs were directly embedded into HTML templates sent to external APIs (like PDFShift or DocRaptor) for PDF generation without sanitization, leading to potential Server-Side XSS and SSRF.
**Learning:** Headless browsers used by external PDF conversion APIs will execute any unsanitized HTML/JS provided to them. This can expose sensitive environment variables or internal API credentials if an attacker injects malicious scripts.
**Prevention:** All user-provided data must be strictly escaped using an `escapeHTML` utility before being embedded into HTML strings intended for external PDF conversion.
