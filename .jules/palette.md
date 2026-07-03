## 2024-03-22 - Password Visibility Toggles & Icon Button Accessibility
**Learning:** Icon-only buttons positioned absolutely inside inputs (like password visibility toggles) often lose their native focus outlines due to their container constraints. These elements require explicit focus states (e.g., `focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500 rounded-md p-1`) so keyboard users know when they are focused. Furthermore, mouse users heavily rely on tooltips to decipher icons; the `title` attribute must always be added to match the `aria-label`.
**Action:** When adding icon-only controls inside input fields, strictly implement explicit `focus-visible` ring classes, and always pair `aria-label` with a native `title` attribute for cross-device accessibility.

## 2024-03-24 - Modal Close Buttons Accessibility
**Learning:** Icon-only close buttons in modals (like the ones with `<X size={20} />` in `Membership.tsx`) often lack proper ARIA labels and focus states, making them inaccessible for screen reader and keyboard-only users.
**Action:** Always add an `aria-label` (e.g., `aria-label="বন্ধ করুন"`) and `title` to modal close buttons, along with explicit `focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-primary-500` classes to ensure they are accessible.
