
## 2024-05-24 - ARIA labels on admin icon-only buttons
**Learning:** Admin dashboards often use densely packed icon-only buttons (like Eye, Trash, Refresh) in data tables where visual labels would take up too much space. A `title` attribute provides a tooltip but is insufficient for screen readers.
**Action:** Consistently apply `aria-label`s in Bengali (e.g. `খরচ মুছুন` for Delete, `খরচের বিস্তারিত দেখুন` for Details) alongside `title` attributes on all icon-only action buttons to ensure full accessibility while preserving visual density.
