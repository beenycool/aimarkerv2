## 2025-05-20 - Web Search Caching
**Learning:** `searchWeb` calls were unoptimized, leading to potential redundant API calls for the same query. Implementing a simple in-memory cache with TTL significantly reduces these calls without complex infrastructure changes.
**Action:** When implementing external API wrappers, always consider if the results are cacheable and add a caching layer if appropriate, especially for expensive or rate-limited APIs.

## 2026-03-05 - React component parsing overhead

**Learning:** React components that use `useMemo` for heavy text parsing (`MarkdownText`) often define their helper functions inside the component body. This causes unnecessary allocations and defeats the exhaustive dependency logic in linters since the helpers' references change on every render.
**Action:** Move pure functions, static constants (like class dictionaries), and stateless helper functions outside of React components. This eliminates churn, improves memory utilization slightly, and guarantees the hook dependencies are structurally sound.

## 2026-03-05 - Array vs Map Lookups in loops

**Learning:** In `AIScheduleGenerator`, nesting `array.find()` inside an `array.map()` for data processing caused an O(N*M) time complexity bottleneck. Pre-computing a `Map` or dictionary outside the loop for O(1) lookups significantly optimizes the time complexity to O(N+M) and is cleaner to read.
**Action:** Always watch out for nested iterations (especially `find` or `filter` inside loops) when processing data arrays, and proactively refactor them using Map lookups.
