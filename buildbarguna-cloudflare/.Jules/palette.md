
## 2024-05-19 - Toast Close Button Improvements
**Learning:** Hardcoded "✕" characters in toast notification close buttons lack proper hover/active states and can look misaligned or unpolished next to standard Lucide icons used elsewhere in the application. Furthermore, without `aria-label`s, screen readers read them awkwardly (e.g., "times" or "multiplication X").
**Action:** Replace hardcoded "✕" characters in toast notifications with consistent SVG icons (e.g., `<X size={16} />` from `lucide-react`), add explicit padded hover targets (`p-1 hover:bg-red-100/50 rounded-full`), and ensure they have descriptive Bengali `aria-label`s (like "বার্তা বন্ধ করুন").

## 2024-05-19 - Modal Accessibility and Role
**Learning:** Custom div-based modals often lack the necessary ARIA roles to be recognized correctly by screen readers as dialogs, which causes content outside the modal to be read or makes the modal itself hard to navigate. Adding `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` provides essential semantic meaning.
**Action:** Always include `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="[id of the heading]"` on custom modal container divs to ensure screen reader focus is appropriately managed.
