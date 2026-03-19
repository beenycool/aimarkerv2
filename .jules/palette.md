# Palette's Journal

## 2026-03-01 - Accessible State Toggles in Navigation

**Learning:** Mobile menu toggles (and similar dynamic icon buttons) often fail screen readers by only changing the visual icon without updating the accessible name.
**Action:** Always combine a dynamic `aria-label` (e.g., "Open menu" vs "Close menu") with `aria-expanded` on navigation toggles to ensure the current state and action are clearly communicated to assistive technologies.

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

## 2025-03-11 - Math Keyboard Accessibility and Usability

**Learning:** Generic symbol buttons in a custom keyboard block (like `MathKeyboard.tsx`) must explicitly declare `type="button"`. Otherwise, if the keyboard is rendered inside a form context, they act as default submit buttons and trigger unintended form submissions. Furthermore, these buttons need explicit `focus-visible` styles (`focus-visible:ring-2`, `focus-visible:outline-none`) to ensure keyboard users can confidently navigate the grid of symbols.
**Action:** Always verify `type="button"` and `focus-visible` styles on custom interactive grid elements like math symbols or emoji pickers. Include `aria-label` and `title` to provide screen reader and tooltip context for non-standard symbols.
