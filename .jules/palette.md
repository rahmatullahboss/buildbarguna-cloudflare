## 2025-03-10 - ARIA Labels and Keyboard Focus on Icon-Only Modals
**Learning:** Icon-only close buttons in modals (like `<X />` from lucide-react) are easily missed for screen reader users and keyboard navigators.
**Action:** Always add descriptive `aria-label`s in the application's target language (e.g., Bengali) and apply explicit focus ring styles (`focus-visible:ring-2`) to ensure full accessibility for interactive icon components.
