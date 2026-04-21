
## 2024-05-18 - Missing ARIA labels on Icon-only Toggle and Close Buttons
**Learning:** Found a recurring pattern where icon-only buttons (`<X />`, `<Book />`, etc.) used for closing modals or toggling sidebars were missing `aria-label` attributes. This makes these critical navigation elements invisible to screen reader users, who will just hear "button" without context.
**Action:** Always ensure any icon-only button used for layout manipulation (like sidebars and modals) has an explicit, translated `aria-label` attribute (e.g., `aria-label="বন্ধ করুন"` or `aria-expanded={isOpen}`). This should be checked consistently alongside our visual button components.
