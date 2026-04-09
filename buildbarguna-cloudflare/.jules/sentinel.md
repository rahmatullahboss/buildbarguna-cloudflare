## 2025-03-08 - Prevent Stored XSS via URL Schemas
**Vulnerability:** Zod's `z.string().url()` allows arbitrary URI schemes like `javascript:` and `data:`, which can lead to Stored XSS if these values are rendered in user-facing components (e.g., `href` or `src` attributes).
**Learning:** Default URL validators only ensure structural correctness, not scheme safety. We must enforce scheme whitelists explicitly.
**Prevention:** Always use `.refine(val => val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://'))` when validating user-supplied URLs to restrict inputs strictly to web protocols, and ensure `.refine()` is chained *before* `.optional()` or `.or()` modifiers.
