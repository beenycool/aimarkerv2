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

**Learning:** Relying on React state updates () in high-frequency event handlers like  causes heavy UI lag, especially in complex components like . Using  to track intermediate drawing points and drawing directly to the  provides smooth 60fps interaction by bypassing the React render cycle.
**Action:** Always prefer  and direct DOM/Canvas API manipulation for high-frequency user interactions (e.g., drawing, scrolling, dragging), and only sync the final result to React state on  or .

## 2026-03-24 - React Canvas Event State Optimization

**Learning:** Relying on React state updates (\`setState\`) in high-frequency event handlers like \`mousemove\` causes heavy UI lag, especially in complex components like \`PDFViewer\`. Using \`useRef\` to track intermediate drawing points and drawing directly to the \`CanvasRenderingContext2D\` provides smooth 60fps interaction by bypassing the React render cycle.
**Action:** Always prefer \`useRef\` and direct DOM/Canvas API manipulation for high-frequency user interactions (e.g., drawing, scrolling, dragging), and only sync the final result to React state on \`mouseup\` or \`mouseleave\`.
