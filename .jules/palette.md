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

## 2026-03-26 - Keyboard Navigation for Interactive Badges

**Learning:** When turning non-interactive elements like `Badge` `div`s into clickable UI selectors (e.g., for subjects in `InterleavingContent.tsx` or durations in `SessionDialog.tsx`), the `onClick` handler alone leaves keyboard users stranded.
**Action:** Always ensure full keyboard accessibility by adding `role="button"`, `tabIndex={0}`, an `onKeyDown` handler that responds to 'Enter' and 'Space' keys, and explicit visible focus states (e.g., `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).

## 2026-03-30 - Associated Label for Active Recall Input

**Learning:** When generating interactive user inputs within modals or dynamically loaded React components (like the "Your Response" `textarea` in `TechniqueModal.tsx`), explicit visible labels must be programmatically associated with their input using `htmlFor` and a matching `id`. Otherwise, clicking the label will not focus the input, and screen readers will fail to announce the label when the user navigates into the text area.
**Action:** Always link visible `<label>` elements to their corresponding inputs by generating a unique ID (e.g., using React's `useId()`) and applying it to the input's `id` and the label's `htmlFor` attributes.

## 2026-03-28 - [Keyboard Focus Accessibility]

**Learning:** Custom interactive tool buttons in the application (like those in `PDFViewer.tsx`) consistently lacked explicit visual keyboard focus indicators, rendering them invisible to users navigating strictly via keyboard.
**Action:** When adding or auditing icon-only utility buttons or custom toolbar components, ensure to apply the standard set of focus utility classes (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) used by the existing `Button` variants to maintain a consistent and accessible keyboard navigation experience.

## 2026-03-30 - Semantic Grouping for Custom Button Lists

**Learning:** When creating a list of custom buttons or interactive badges that represent a single choice or set of choices (like "Select 2-3 subjects" or "Session length"), wrapping them with a standalone `<label>` tag is invalid HTML and breaks screen reader context because a `<label>` must be associated with a valid form input element.
**Action:** Instead of `<label>`, use a semantic `<div role="group" aria-labelledby="[id]">` to contain the buttons, and use a standard `<div id="[id]">` for the descriptive text. This ensures screen readers correctly announce the group's purpose when navigating the buttons.

## 2026-04-01 - Avoid Unintended Form Submissions with generic UI Button

**Learning:** When using generic UI `Button` components (like from a Next.js/React component library) inside complex study modalities and dynamically rendered modals (`TechniqueModal.tsx`, `PomodoroContent.tsx`, `InterleavingContent.tsx`), they will default to `type="submit"` in standard HTML form contexts if a `type` is not explicitly provided. This can lead to unintended page reloads or form submissions if these smaller study UI blocks are ever nested inside larger forms.
**Action:** Always explicitly provide `type="button"` to interactive custom button elements (`<Button>`) when they are meant to act strictly as UI toggles, asynchronous triggers, or state-changers, rather than form submitters.


## 2024-05-15 - Contextualized Disabled States

**Learning:** Conditionally disabling interactive UI elements (like a "Generate" button when fewer than the required inputs are selected) is good practice, but without context, it causes confusion and a poor user experience. Users and screen readers need to understand *why* the action is unavailable. Dynamic button text helps; visible helper text with `aria-describedby` is more reliable than relying on `title` alone for disabled controls because disabled buttons often use `pointer-events: none`, so native tooltips may not show on hover.

**Action:** When adding `disabled={condition}` to a `<Button>`, explain every distinct disabled state (for example loading versus validation) using visible helper text tied with `aria-describedby`, and use the button label as a clear call to action when appropriate (e.g. "Select 2+ Subjects to Mix" instead of only "Get Combinations").


## 2026-04-05 - Contextual Disabled States on Forms

**Learning:** Relying solely on `disabled` state for form submit buttons without visual cues creates a poor experience, as users might not know what fields are missing.
**Action:** Add descriptive helper text combined with `aria-describedby` to explicitly communicate to users and screen readers why a form submit button is disabled.

<<<<<<< HEAD
## 2026-04-11 - Graph Canvas Button Accessibility

**Learning:** Custom UI tools with visual state (like active selection tools in `GraphCanvas`) lacked screen-reader visibility for their toggled state and required a combination of `aria-pressed` and `focus-visible` styles.
**Action:** Always add `aria-pressed` to tool selection buttons that act as toggles, and use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` to ensure they are fully navigable via keyboard.

## 2026-04-12 - Tooltips on Icon-Only Buttons

**Learning:** Icon-only buttons often lack accessible tooltips or rely on native `title` attributes which are styled inconsistently and lack robust accessibility. Upgrading these to custom Radix UI `Tooltip` components ensures a cohesive visual design and better accessibility support.
**Action:** When creating or maintaining icon-only buttons in toolbars (like in PDFViewer), wrap them in `Tooltip`, `TooltipTrigger`, and `TooltipContent` from the project's UI library to provide immediate, styled context.

## 2026-04-07 - Contextual Disabled States on AI Generators

**Learning:** When async generation buttons (like "Generate AI Prompts") are disabled during a loading state, users and screen readers might not understand why the button is unresponsive. Providing visual loading text inside the button isn't always enough context for screen readers if the button is disabled.
**Action:** Add descriptive helper text combined with `aria-describedby` to explicitly communicate the loading state when standard interactive generator buttons are disabled.
>>>>>>> 6600647 (Apply reviewer suggestions for PR #163)
