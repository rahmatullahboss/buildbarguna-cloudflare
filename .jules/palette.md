## 2024-10-25 - Form Accessibility: Missing Label Associations
**Learning:** Core forms (like Registration) lacked `htmlFor` and `id` attributes linking `<label>` elements to their corresponding `<input>` fields, preventing screen readers from accurately announcing form fields and reducing the click target area for users.
**Action:** Always verify that every form `<input>` has a unique `id` and its corresponding `<label>` uses `htmlFor` matching that `id` to ensure proper screen reader support and better usability (clickable labels).
