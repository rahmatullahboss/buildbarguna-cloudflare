## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in PDF Generation via HTML Templates
**Vulnerability:** HTML templates used for PDF generation in `api-generator.ts` were interpolating unescaped user input (e.g., `member_name`, `father_name`, `project_name`) directly into the HTML string before sending it to an external headless browser API (e.g., PDFShift, DocRaptor).
**Learning:** Headless browsers rendering these PDFs execute HTML/JavaScript. By submitting malicious payloads (e.g., `<script>...</script>`) in form fields, attackers could achieve Server-Side XSS, potentially leading to Server-Side Request Forgery (SSRF) if the headless browser can access internal infrastructure, or data exfiltration.
**Prevention:** All user-provided data must be strictly escaped using an `escapeHTML` utility to convert `<`, `>`, `&`, `"`, and `'` into HTML entities before interpolating them into HTML templates destined for external PDF generation or execution.
