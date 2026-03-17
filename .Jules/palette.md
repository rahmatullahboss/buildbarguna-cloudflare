## 2024-03-17 - Button ARIA Labels
**Learning:** Found that multiple buttons across components like `Layout.tsx`, `GuideContent.tsx`, `ImageUpload.tsx`, and `TransactionForm.tsx` are missing `aria-label` attributes for icon-only buttons or buttons that could use clearer screen-reader descriptions.
**Action:** Add missing `aria-label` to these interactive elements to improve accessibility.
