## 2024-04-01 - Missing Label Associations in Auth Forms
**Learning:** Auth forms (like registration) were missing `htmlFor` and `id` associations between labels and input fields. This negatively affects screen readers and prevents users from clicking the label to focus the input.
**Action:** When creating or reviewing forms, always ensure every `<label>` has an `htmlFor` attribute that strictly matches the `id` of its corresponding `<input>` or `<textarea>`.
