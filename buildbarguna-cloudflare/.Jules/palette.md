## 2024-05-18 - [Accessible Icon-Only Modals]
**Learning:** Found a recurring pattern where icon-only buttons (like modal close buttons) lack accessible labels and focus styles, making keyboard navigation difficult and screen readers unable to interpret the action.
**Action:** Always provide an `aria-label`, a matching `title` attribute in Bengali, and include explicit keyboard focus styles (e.g., `focus-visible:ring-2 focus-visible:outline-none`) for all icon-only buttons like `<X>` or `<Trash2>`.
