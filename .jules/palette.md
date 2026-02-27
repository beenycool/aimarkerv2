## 2025-02-19 - Focus styles for hidden inputs
**Learning:** When using `sr-only` inputs (like file uploads), the parent label needs explicit `focus-within` styles to give keyboard users visual feedback.
**Action:** Use `focus-within:ring-2` on the container when the inner input is hidden or screen-reader only.