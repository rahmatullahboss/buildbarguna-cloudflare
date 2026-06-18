## 2026-06-18 - Consistent Accessible Close Buttons
**Learning:** Found multiple instances where hardcoded '✕' characters are used for close buttons in toasts/alerts without proper padding, hover states, or screen reader labels (in Bengali). This makes them hard to tap on mobile and difficult for screen readers to interpret.
**Action:** Replace hardcoded '✕' with lucide-react `<X size={16} />` icon, ensure a consistent padded hover target (e.g. `p-1 rounded-md hover:bg-gray-100/50`), and verify `aria-label="বার্তা বন্ধ করুন"` or similar Bengali label is always present.
