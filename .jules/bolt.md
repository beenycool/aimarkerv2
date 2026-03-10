## 2025-05-20 - Web Search Caching
**Learning:** `searchWeb` calls were unoptimized, leading to potential redundant API calls for the same query. Implementing a simple in-memory cache with TTL significantly reduces these calls without complex infrastructure changes.
**Action:** When implementing external API wrappers, always consider if the results are cacheable and add a caching layer if appropriate, especially for expensive or rate-limited APIs.

## 2026-03-05 - React component parsing overhead

**Learning:** React components that use `useMemo` for heavy text parsing (`MarkdownText`) often define their helper functions inside the component body. This causes unnecessary allocations and defeats the exhaustive dependency logic in linters since the helpers' references change on every render.
**Action:** Move pure functions, static constants (like class dictionaries), and stateless helper functions outside of React components. This eliminates churn, improves memory utilization slightly, and guarantees the hook dependencies are structurally sound.

## 2025-02-28 - Optimizing Assessment Mapping
**Learning:** $O(N \times M)$ array `.find()` lookups inside `.map()` loops on small/medium arrays can significantly slow down execution. An O(1) Map structure reduces lookup overhead. Extracting repetitive allocations like `new Date()` outside loops is another easy win.
**Action:** When mapping over items and performing cross-references on another array by ID, build a `Map` of the reference array beforehand, especially if the operations occur inside high-frequency or data-heavy paths like AI context builders.
