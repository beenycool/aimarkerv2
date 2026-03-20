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

## 2024-02-22 - [PaperLibrary Improvements]

**Learning:** Icon-only buttons (like Delete) must have `aria-label` for screen readers. Also, `opacity-0` elements should be visible on focus (`focus:opacity-100`) to be accessible via keyboard. Search inputs are greatly improved by a clear button when text is present.
**Action:** Always check `aria-label` for icon buttons and ensure focus visibility for hidden-by-default controls. Add clear buttons to all search inputs.

## 2026-03-16 - Accessible Dynamically Rendered Input Elements

**Learning:** Generic dynamically rendered input elements (like inside `AdaptiveInput`) often lack a11y context because they aren't tied to explicit `<label>` tags. Screen readers need `aria-label` for these to be accessible.
**Action:** Always verify `aria-label` on dynamic text inputs, radio buttons, and textareas, especially when they are programmatically generated inside lists or tables.
