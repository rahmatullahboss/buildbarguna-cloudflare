
## 2026-03-20 - Custom Interactive Element Accessibility
**Learning:** Div-based custom interactive elements (like the drop zone in ImageUpload.tsx) need explicit `role`, `tabIndex`, keyboard event handlers (for Enter/Space), and visible focus indicators (`focus-visible`) to be properly accessible to keyboard and screen reader users.
**Action:** Always ensure custom interactive elements implement full keyboard support and ARIA attributes to mimic native interactive elements.
