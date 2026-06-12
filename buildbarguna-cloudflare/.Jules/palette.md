## 2025-02-12 - Message Close Button Accessibility and Polish
**Learning:** Hardcoded "✕" characters inside interactive elements (like message close buttons) lack proper accessibility for screen readers and miss an opportunity for visual polish.
**Action:** Replaced hardcoded "✕" text with the `X` icon from `lucide-react`, added consistent padding and rounded hover styles (`p-1 hover:bg-red-100/50 rounded-full`), and ensured explicit descriptive Bengali `aria-label`s were applied across multiple admin and user pages. This pattern should be standard for all closeable alerts or toasts.
