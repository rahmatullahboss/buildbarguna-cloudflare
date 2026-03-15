## 2024-03-15 - [Aria labels on close buttons and menus]
**Learning:** Found a recurring pattern where dismiss/close buttons ("✕") inside modals and error messages, as well as toggle icons for mobile menus and copy actions, lacked `aria-label`s. This makes the UI completely inaccessible to screen reader users who cannot visually interpret the icon context.
**Action:** Always ensure that any button containing only an icon (or ambiguous text like "✕") has a descriptive `aria-label` (localized to Bengali to match the app interface) indicating its function.
