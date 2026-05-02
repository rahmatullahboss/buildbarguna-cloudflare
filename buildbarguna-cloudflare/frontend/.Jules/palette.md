## 2025-05-02 - Icon-only Buttons Missing ARIA Labels
**Learning:** Found multiple instances of icon-only action buttons (e.g., in Admin pages and Modals) using only `title` attributes or surrounding context for meaning, which is insufficient for screen readers.
**Action:** Added explicit `aria-label` attributes using standard Bengali terminology (e.g., "বন্ধ করুন", "মুছুন") to match the application's language and improve screen reader accessibility without affecting visual layout.
