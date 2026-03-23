# Palette's Journal

## 2026-03-01 - Accessible State Toggles in Navigation

**Learning:** Mobile menu toggles (and similar dynamic icon buttons) often fail screen readers by only changing the visual icon without updating the accessible name.
**Action:** Always combine a dynamic `aria-label` (e.g., "Open menu" vs "Close menu") with `aria-expanded` on navigation toggles to ensure the current state and action are clearly communicated to assistive technologies.

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

## 2026-03-16 - Accessible Dynamically Rendered Input Elements

**Learning:** Generic dynamically rendered input elements (like inside `AdaptiveInput`) often lack a11y context because they aren't tied to explicit `<label>` tags. Screen readers need `aria-label` for these to be accessible.
**Action:** Always verify `aria-label` on dynamic text inputs, radio buttons, and textareas, especially when they are programmatically generated inside lists or tables.

## 2025-03-11 - Math Keyboard Accessibility and Usability

**Learning:** Generic symbol buttons in a custom keyboard block (like `MathKeyboard.tsx`) must explicitly declare `type="button"`. Otherwise, if the keyboard is rendered inside a form context, they act as default submit buttons and trigger unintended form submissions. Furthermore, these buttons need explicit `focus-visible` styles (`focus-visible:ring-2`, `focus-visible:outline-none`) to ensure keyboard users can confidently navigate the grid of symbols.
**Action:** Always verify `type="button"` and `focus-visible` styles on custom interactive grid elements like math symbols or emoji pickers. Include `aria-label` and `title` to provide screen reader and tooltip context for non-standard symbols.

## 2026-03-19 - Accessibility for Contextual Math Keyboards

**Learning:** Buttons inside specialized input contexts (like custom math keyboards or interactive grid elements) must explicitly declare `type="button"` to avoid unintended form submission. Furthermore, these custom interactive grid inputs need explicit `focus-visible` styling (e.g., `focus-visible:ring-2`, `focus-visible:outline-none`) and descriptive `aria-label` attributes so screen readers and keyboard users can properly navigate the context. Avoid redundant `title` attributes when `aria-label` is present. Keep panel elements mounted (using `hidden`/`aria-hidden`) so `aria-controls` relationships remain valid at all times.
**Action:** Always verify that contextual buttons use `type="button"`, check `aria-expanded`/`aria-controls` for toggles, and provide robust `focus-visible` UI cues combined with semantic labels (`aria-label`) for any grid or custom element maps. Use a stable `id` (via `useId()`) for panel elements and keep them mounted.

## 2025-03-03 - Added focus styles and semantics to PDF Viewer tabs

**Learning:** Custom interactive elements designed to look like tabs (like the Question Paper / Source Material buttons in the PDFViewer) often lack explicit `type="button"` attributes and active state indicators (`aria-current`). Next.js's default UI often requires manual intervention to ensure proper keyboard navigation focus rings (`focus-visible`).
**Action:** When building or refactoring custom tab buttons, always explicitly set `type="button"`, use `aria-current={isActive ? 'page' : undefined}` to expose the active state to screen readers, and add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to ensure proper visible keyboard navigation.

## 2026-03-20 - Accessible Profile Selection Buttons

**Learning:** Interactive profile selection buttons in tables/lists (like those in `AIConfigTable.tsx`) often lack explicit `type="button"` and `aria-label` attributes. Without `type="button"`, they can trigger unwanted form submissions if the component is used within a larger form. Without `aria-label`, screen readers may just announce the text content which might be insufficient context (e.g. just the profile name without knowing it's an action to select it).
**Action:** Always ensure custom button components mapping over dynamic data include `type="button"` and a descriptive `aria-label` (e.g., `aria-label="Select profile {profile.name}"`).
