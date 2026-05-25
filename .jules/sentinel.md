## 2025-03-10 - Timing Attack in User Enumeration
**Vulnerability:** Timing attack in the `login` and `forgot-password` endpoints allowing user enumeration.
**Learning:** If an account was not found, the response was immediately returned. If found, a slow PBKDF2 hash verification was performed, or an email was sent synchronously. This time difference allowed attackers to identify registered accounts.
**Prevention:** Always verify a dummy hash to maintain constant-time execution if a user is not found. Use background execution (like `c.executionCtx.waitUntil()`) for slow asynchronous side-effects (e.g., sending emails) so the response isn't blocked.

## 2025-03-10 - Server-Side XSS in PDF Generator
**Vulnerability:** The headless PDF generators (PDFShift/Adobe/DocRaptor) interpolate unescaped user-provided strings directly into HTML templates, exposing the application to Server-Side XSS and potentially SSRF attacks if a malicious payload is parsed by the backend renderer.
**Learning:** Never trust data used to construct HTML dynamically, even when it is used to generate a PDF document backend. Headless browsers execute JavaScript and can access internal network resources or leak sensitive environment variables.
**Prevention:** Strict HTML escaping using a utility function (`escapeHTML`) must be applied to all dynamic interpolations within HTML template literals before sending the payload to rendering APIs.
