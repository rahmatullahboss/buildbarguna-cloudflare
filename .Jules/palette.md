## YYYY-MM-DD - [Title]\n**Learning:** [UX/a11y insight]\n**Action:** [How to apply next time]

## 2024-03-20 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons (like Menu toggles or clear image buttons) need descriptive `aria-label`s for screen readers. Since the user-facing UI text is in Bengali, the ARIA labels must also be in Bengali (e.g., 'মেনু খুলুন', 'মেনু বন্ধ করুন', 'ছবি মুছুন', 'মেনু টগল করুন') to maintain accessibility consistency for Bengali-speaking users.
**Action:** Always ensure that icon-only buttons include an `aria-label` translated appropriately into Bengali if the interface language is Bengali.
