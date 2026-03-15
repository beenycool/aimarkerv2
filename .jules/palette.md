# Palette's Journal

## 2025-03-15 - Interactive grid components inside forms

**Learning:** Buttons inside input contexts (like the generic symbol buttons in `MathKeyboard.tsx`) must explicitly declare `type="button"` to prevent unintended form submissions when users hit enter, or click the buttons. Additionally, interactive grids of custom buttons require explicit `focus-visible` styling (e.g., `focus-visible:ring-2`, `focus-visible:outline-none`), `aria-label`, and `title` to ensure they are accessible for keyboard navigation and screen readers.
**Action:** When creating or maintaining button grids (especially within input or form components), explicitly set `type="button"`, add `focus-visible` styles, provide `aria-label` attributes to the container and buttons, and add `title` for hover tooltips to provide comprehensive keyboard navigation and context.

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
