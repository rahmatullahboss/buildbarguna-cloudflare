## 2025-04-19 - Missing ARIA Labels on Icon-only Modals
**Learning:** Icon-only close buttons (`<X />`) and mobile menu toggles (`<Book />`) in heavily used modal components (`Membership.tsx`, `TermsModal.tsx`, `GuideContent.tsx`) often miss localization-appropriate `aria-label` attributes. Additionally, menu toggles lack `aria-expanded` attributes.
**Action:** When creating or reviewing modals or off-canvas menus, always ensure icon-only buttons have localized `aria-label`s (e.g., "বন্ধ করুন" for close) and toggle buttons use `aria-expanded` to communicate their state to screen readers.
