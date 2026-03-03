# Palette's Journal

## 2025-02-19 - Focus styles for hidden inputs
**Learning:** When using `sr-only` inputs (like file uploads), the parent label needs explicit `focus-within` styles to give keyboard users visual feedback.
**Action:** Use `focus-within:ring-2` on the container when the inner input is hidden or screen-reader only.

# 2026-02-26 - Accessible File Upload Pattern

**Learning:** Hidden file inputs (`class="hidden"`) prevent keyboard navigation, breaking accessibility.
**Action:** Use `sr-only` class on the input element and add `focus-within:ring-2 focus-within:ring-primary` styles to the parent label to ensure keyboard accessibility while maintaining custom design.

## 2024-05-22 - Accessibility in Chat Interfaces

**Learning:** Chat interfaces often use icon-only buttons for "Send" actions, which are inaccessible without explicit labels.
**Action:** Always verify `aria-label` on icon-only buttons in conversational UI components like `FeedbackBlock`.
