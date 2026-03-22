## 2024-03-21 - Keyboard Accessibility for Div Dropzones and Bengali ARIA Labels
**Learning:** Custom interactive elements, like div-based drag-and-drop file upload zones, must include keyboard interactivity (`role="button"`, `tabIndex`, and `onKeyDown` handlers) for full accessibility. Without these, screen reader and keyboard users cannot trigger actions effectively. Furthermore, since the UI is entirely localized in Bengali, all ARIA labels must also be provided in Bengali to ensure consistency and correct screen reader pronunciation for the target demographic.
**Action:** Always ensure custom interactive areas implement proper keyboard and focus states (`focus-visible:ring`), and double-check that newly added ARIA labels match the application's localized language.

## 2024-05-15 - Missing Aria-labels on Dismissible Alerts
**Learning:** Found a recurring pattern in the design system where success/error dismissible alert messages (toasts/banners) use a simple `✕` character for the close button, but completely lack screen reader accessibility via `aria-label`. This makes it impossible for screen reader users to understand what the button does.
**Action:** Add `aria-label="বার্তা বন্ধ করুন"` (for success/info) or `aria-label="ত্রুটি বার্তা বন্ধ করুন"` (for error) to all dismissible alert buttons, and ensure future toast/alert components strictly require an aria-label prop.
