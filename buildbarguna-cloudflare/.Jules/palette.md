## 2024-05-20 - Accessible dismissible alerts
**Learning:** Found multiple places where success and error alerts used a hardcoded '✕' text character for a dismiss button without focus visibility or visual feedback on hover.
**Action:** Replaced hardcoded text characters with the standard `<X />` icon from `lucide-react`, added proper padded hover targets (`p-1 hover:bg-green-100/50 rounded-full`), and added `focus-visible` styles for keyboard navigation support along with Bengali `aria-label`s and `title`s.
