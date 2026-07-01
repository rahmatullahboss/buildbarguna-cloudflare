## 2025-04-14 - HTML Form Accessibility
**Learning:** React elements like `<label>` require `htmlFor` instead of the standard `for` attribute to properly associate with input elements. Without it, clicking the label does not focus the input, harming screen reader access and general usability. This is particularly prevalent in custom-styled forms.
**Action:** When reviewing forms, always verify every `<label>` has an `htmlFor` attribute that strictly matches the `id` of its corresponding `<input>`, `<select>`, or `<textarea>`.
