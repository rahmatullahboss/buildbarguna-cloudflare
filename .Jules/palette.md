## 2024-03-21 - Keyboard Accessibility for Div Dropzones and Bengali ARIA Labels
**Learning:** Custom interactive elements, like div-based drag-and-drop file upload zones, must include keyboard interactivity (`role="button"`, `tabIndex`, and `onKeyDown` handlers) for full accessibility. Without these, screen reader and keyboard users cannot trigger actions effectively. Furthermore, since the UI is entirely localized in Bengali, all ARIA labels must also be provided in Bengali to ensure consistency and correct screen reader pronunciation for the target demographic.
**Action:** Always ensure custom interactive areas implement proper keyboard and focus states (`focus-visible:ring`), and double-check that newly added ARIA labels match the application's localized language.

## 2024-03-22 - Password Visibility Toggles & Icon Button Accessibility
**Learning:** Icon-only buttons positioned absolutely inside inputs (like password visibility toggles) often lose their native focus outlines due to their container constraints. These elements require explicit focus states (e.g., `focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 rounded-md p-1`) so keyboard users know when they are focused. Furthermore, mouse users heavily rely on tooltips to decipher icons; the `title` attribute must always be added to match the `aria-label`.
**Action:** When adding icon-only controls inside input fields, strictly implement explicit `focus-visible` ring classes, and always pair `aria-label` with a native `title` attribute for cross-device accessibility.
## 2023-10-27 - Accessibility of Custom Modals
**Learning:** Custom modals built with generic  containers often lack fundamental ARIA attributes, preventing screen readers from identifying them as dialogs or announcing their titles.
**Action:** When implementing or updating custom modals, always ensure the container includes  and , and explicitly link the modal heading using  to maintain screen reader accessibility.
## 2026-07-09 - Custom Modal Accessibility
**Learning:** Custom modals built with generic 'div' containers often lack fundamental ARIA attributes, preventing screen readers from identifying them as dialogs or announcing their titles.
**Action:** When implementing or updating custom modals, always ensure the container includes 'role="dialog"' and 'aria-modal="true"', and explicitly link the modal heading using 'aria-labelledby' to maintain screen reader accessibility.
