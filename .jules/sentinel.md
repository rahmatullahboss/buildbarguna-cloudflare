## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-05-12 - Missing HTML escaping in external PDF generation templates
**Vulnerability:** User inputs were interpolated directly into HTML strings in `generateMemberCertificateHTML` and `generateShareCertificateHTML` within `src/lib/pdf/api-generator.ts`. This poses a critical Server-Side XSS and SSRF vulnerability because the HTML is converted to PDF by external headless browser services (PDFShift/DocRaptor/Adobe). If a user entered malicious JS or iframe payloads in fields like `name_english` or `present_address`, the external API would execute them.
**Learning:** External PDF generation relying on HTML string interpolation is essentially a specialized SSR form. Because the worker itself doesn't evaluate the HTML, the risk is shifted to the external service, but it still leads to SSRF/XSS and potential data exfiltration from those environments or spoofed PDF content.
**Prevention:** All user-provided data must be strictly escaped using an `escapeHTML` utility before being templated into HTML strings sent to external PDF conversion APIs.
