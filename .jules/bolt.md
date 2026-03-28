## 2025-05-20 - Web Search Caching
**Learning:** `searchWeb` calls were unoptimized, leading to potential redundant API calls for the same query. Implementing a simple in-memory cache with TTL significantly reduces these calls without complex infrastructure changes.
**Action:** When implementing external API wrappers, always consider if the results are cacheable and add a caching layer if appropriate, especially for expensive or rate-limited APIs.

## 2026-03-05 - React component parsing overhead

**Learning:** React components that use `useMemo` for heavy text parsing (`MarkdownText`) often define their helper functions inside the component body. This causes unnecessary allocations and defeats the exhaustive dependency logic in linters since the helpers' references change on every render.
**Action:** Move pure functions, static constants (like class dictionaries), and stateless helper functions outside of React components. This eliminates churn, improves memory utilization slightly, and guarantees the hook dependencies are structurally sound.

## 2026-03-05 - Array vs Map Lookups in loops

**Learning:** In `AIScheduleGenerator`, nesting `array.find()` inside an `array.map()` for data processing caused an O(N*M) time complexity bottleneck. Pre-computing a `Map` or dictionary outside the loop for O(1) lookups significantly optimizes the time complexity to O(N+M) and is cleaner to read.
**Action:** Always watch out for nested iterations (especially `find` or `filter` inside loops) when processing data arrays, and proactively refactor them using Map lookups.

## 2025-05-20 - O(N log N) Filter/Sort Anti-pattern

**Learning:** Chaining `.filter().sort()[0]` on arrays (like `assessments`) to find the minimum or maximum element is a common anti-pattern in React frontend files (like `DashboardClient.tsx`). It causes unnecessary O(N) array allocations via `.filter()` and triggers an O(N log N) `.sort()` operation just to extract a single element, which becomes noticeable as the array grows or inside React hooks.
**Action:** Always replace the `.filter().sort()[0]` anti-pattern with a simple O(N) single loop or `reduce` method to track the target value (e.g., minimum or maximum), significantly reducing array churn and calculation overhead.

## 2026-03-24 - React Canvas Event State Optimization

**Learning:** Relying on React state updates (`setState`) in high-frequency event handlers like `mousemove` causes heavy UI lag, especially in complex components like `PDFViewer`. Using `useRef` to track intermediate drawing points and drawing directly to the `CanvasRenderingContext2D` provides smooth 60fps interaction by bypassing the React render cycle.
**Action:** Always prefer `useRef` and direct DOM/Canvas API manipulation for high-frequency user interactions (e.g., drawing, scrolling, dragging), and only sync the final result to React state on `mouseup` or `mouseleave`.

## 2026-03-24 - React Component Micro-optimizations (Referential Equality)

**Learning:** When replacing `Array.filter()` or returning default arrays inside `useCallback` or `useMemo` hooks (e.g., `sessionsByDay.get(isoDate) || []`), returning a newly instantiated literal `[]` on every call breaks referential equality in React. This can trigger unnecessary re-renders in child components that depend on these values.
**Action:** Always define a static constant outside the component (e.g., `const EMPTY_ARRAY = [];`) and return that reference instead of `[]` to preserve referential equality when falling back to empty states.

## 2026-03-05 - Map Lookup vs Array Search during Renders

**Learning:** Declaring O(N) array search functions like `const getName = (id) => items.find(i => i.id === id)` inside React components is an anti-pattern when called repeatedly during list rendering (e.g. `list.map(...)`). This creates an unnecessary O(N*M) time complexity.
**Action:** Always refactor these O(N) lookup functions to use `useMemo` to pre-compute a `Map`, exposing a new `useCallback` function for O(1) map lookups, optimizing render time down to O(N+M).
## 2025-05-20 - Map Scope in Micro-Optimizations
**Learning:** When applying the O(N+M) Map pre-computation optimization to replace nested `find()` calls inside `.map()`, it is critical to verify the scope in which the Map is instantiated. Reusing an existing Map without ensuring it is available within the closure of the target loop leads to `ReferenceError` crashes at runtime.
**Action:** Always ensure the `Map` is instantiated or accessible within the specific block or function scope where the optimization is applied, rather than assuming global or outer-scope availability.
