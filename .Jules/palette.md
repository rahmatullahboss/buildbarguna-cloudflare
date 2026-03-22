## 2024-05-19 - ARIA Labels for Notification Banners
**Learning:** Found that custom notification/toast banners in `Withdraw.tsx` (using inline `useState` rather than a global notification system) relied on bare "✕" text buttons for dismissal, which lack screen reader context.
**Action:** Always verify that inline or custom dismiss buttons contain `aria-label="Close message"` or equivalent when standard UI components are bypassed.
