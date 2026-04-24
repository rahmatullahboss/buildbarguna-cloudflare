## 2025-04-24 - Add accessible interactions to clickable divs
**Learning:** In the React codebase, several clickable `div` elements acting as accordions or buttons (like the header row in `Portfolio.tsx`) lack proper keyboard accessibility (`tabIndex`, `onKeyDown`, `role`, and `aria-expanded`). This prevents screen reader users and keyboard-only users from discovering or interacting with them.
**Action:** Always add `role="button"`, `tabIndex={0}`, `onKeyDown` to handle 'Enter'/'Space', and `aria-expanded` when using `div` elements for toggleable or clickable actions.
