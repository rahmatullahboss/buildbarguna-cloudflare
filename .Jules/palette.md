# Palette's Journal

## 2024-03-XX - Initial Setup
**Learning:** Initializing journal to track CRITICAL UX/accessibility learnings.
**Action:** Use this file to document app-specific patterns.

## 2025-03-12 - File Upload Accessibility
**Learning:** Custom file drop zones constructed with `div` elements often lack implicit semantics and keyboard support, leaving screen reader and keyboard-only users unable to interact with or understand the element. Adding `role="button"`, `tabIndex={0}`, keyboard event handlers (`onKeyDown`), and clear `aria-label`s are necessary to make these components accessible.
**Action:** Always verify that custom interactive components constructed from non-interactive elements (like `div` or `span`) have appropriate ARIA roles, tabindex, and keyboard event handlers.