## 2024-05-11 - Add a11y support for icon-only buttons
**Learning:** Found an accessibility issue pattern specific to this app's components where icon-only close buttons (like in `TermsModal.tsx` and others) were missing `aria-label`, `title`, and keyboard focus styling.
**Action:** Always provide both an `aria-label` and a matching `title` attribute in Bengali, and include explicit keyboard focus styles (e.g., `focus-visible:ring-2 focus-visible:outline-none`) to ensure full accessibility for screen readers and keyboard navigation.
