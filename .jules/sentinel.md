## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-05-23 - Server-Side XSS / SSRF in External PDF Generation
**Vulnerability:** Server-Side XSS and potential SSRF during HTML-to-PDF generation via external APIs.
**Learning:** In `api-generator.ts`, unescaped user data was interpolated directly into HTML strings sent to external PDF generation services (like DocRaptor, PDFShift, or Adobe). If a user entered malicious scripts or iframe payloads in their profile fields (like name or address), the external service's headless browser would execute them. This could leak the external service's internal tokens or perform Server-Side Request Forgery (SSRF) against internal endpoints from the context of the PDF generator.
**Prevention:** All user-provided data interpolated into HTML that will be processed by a headless browser (even an external one) must be strictly escaped using an `escapeHTML` helper to prevent HTML injection and script execution.
