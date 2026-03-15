## Palette Journal - Critical UX/Accessibility Learnings

## 2024-05-28 - Interactive Div Accessibility Pattern
**Learning:** Found a pattern where custom interactive elements like the drag-and-drop zone (`ImageUpload.tsx`) use `div` with `onClick` but lack keyboard accessibility properties, preventing keyboard-only users from interacting with them.
**Action:** When implementing custom interactive elements using `div` or `span` that act as buttons, always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler that triggers on Enter or Space keys, and explicit focus states (`focus-visible:ring-2 focus-visible:outline-none`).
