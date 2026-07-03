## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in HTML-to-PDF Generation
**Vulnerability:** Server-Side Cross-Site Scripting (XSS) / Server-Side Request Forgery (SSRF) in HTML-to-PDF generation via external headless browser APIs (PDFShift, DocRaptor, Adobe PDF Services).
**Learning:** When user-supplied data is concatenated directly into HTML strings for PDF rendering APIs, it allows attackers to inject malicious HTML or JavaScript. Since these APIs often use headless browsers (e.g., Chromium), successful injection could lead to Server-Side Request Forgery (SSRF) against internal API endpoints or local files accessible to the rendering service, or information disclosure via blind XSS.
**Prevention:** Always strictly escape all user-provided data using an HTML escape utility before injecting it into HTML strings destined for external headless browser rendering, even if the application is just an API and the output is a PDF.
