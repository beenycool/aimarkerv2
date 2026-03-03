## 2025-05-20 - Web Search Caching
**Learning:** `searchWeb` calls were unoptimized, leading to potential redundant API calls for the same query. Implementing a simple in-memory cache with TTL significantly reduces these calls without complex infrastructure changes.
**Action:** When implementing external API wrappers, always consider if the results are cacheable and add a caching layer if appropriate, especially for expensive or rate-limited APIs.

## 2025-05-22 - Hydration Mismatch & React Memoization

**Learning:** Found a persistent hydration mismatch in `FileUploadZone` (hidden file inputs getting `caret-color: transparent` on client). Also learned that optimizing list rendering requires both extracting list items to `React.memo` components AND stabilizing all callback props (handlers) in the parent component using `useCallback` to prevent breaking memoization.
**Action:** Always verify prop stability when applying `React.memo`. When diagnosing blank screens in Playwright, check for fatal hydration errors or unhandled promise rejections in console logs.
