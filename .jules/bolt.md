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
## 2026-03-24 - Batch State Updates vs Sequential Loops

**Learning:** Using a `for` loop to sequentially update React state (e.g., `setState(prev => [...prev, newItem])`) with an artificial `setTimeout` delay is a performance anti-pattern. This causes O(N^2) array copying complexity, triggers N redundant re-renders, and adds an unnecessary O(N) artificial delay to the user experience.
**Action:** Always replace sequential state update loops with a single batch update (`setState(allItems)`) to reduce the overall update complexity from O(N^2) to O(N) and consolidate N re-renders into one, providing an immediate and efficient UI response.

## 2026-03-22 - O(N+M) Map Aggregation

**Learning:** Nested array iterations like `.filter()` and `.reduce()` inside a `.map()` create a significant bottleneck (O(N*M)) for relational data aggregation, such as calculating stats per subject across large attempt histories.
**Action:** Always pre-aggregate relational data using a single-pass `Map` (O(N)) before the main `.map()` loop (O(M)), reducing overall time complexity to O(N+M) and reducing redundant memory allocations.
## 2026-04-12 - Missing invoke in useCallback property / React Derived State useCallback vs useMemo

**Learning:** Parameter-less `useCallback` hooks that solely calculate and return derived state (like aggregating lists into summary statistics) can lead to runtime bugs if consumers forget to invoke the callback (e.g., `const stats = exam.getSummaryStats;` was missing parens, which meant `stats.weaknessCounts` was undefined). They also miss out on inherent caching for expensive operations.

**Action:** Always refactor these derived state `useCallback` getters into `useMemo` properties. This inherently caches O(N) calculations, avoids unnecessary recalculations per render, and prevents the 'accessing callback without invocation' bug.
## 2026-05-28 - Consolidate Sequential Array Reductions

**Learning:** When calculating multiple derived metrics (like total earned marks and total possible marks) from the same list of data, executing multiple `.reduce()` calls sequentially causes redundant O(N) iterations. This anti-pattern is easy to overlook when iterating on logic inside `useMemo`.
**Action:** Consolidate isolated sequential `.reduce()` calls into a single loop over the array (e.g. `for` loop). This processes the array in one O(N) pass, saving memory allocations and lowering total computation overhead per render.
