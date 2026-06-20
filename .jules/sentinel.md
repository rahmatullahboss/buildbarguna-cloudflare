## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2024-05-24 - Server-Side XSS in PDF HTML generation
**Vulnerability:** User input was directly interpolated into HTML strings sent to external headless browsers (PDFShift, DocRaptor, Adobe) to generate PDFs, leading to Server-Side XSS and potential SSRF.
**Learning:** Headless browsers rendering PDFs execute HTML and JavaScript. If user input is not escaped, attackers can inject malicious scripts or iframes to exfiltrate local files or access internal networks (SSRF).
**Prevention:** Always use an HTML escaping utility function before interpolating user-provided data into HTML strings destined for headless browsers or external PDF generation APIs.
