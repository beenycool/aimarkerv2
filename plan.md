# Plan: summaryStats migration

1. **Change `getSummaryStats` to `summaryStats` property**
   - Modify `app/hooks/useExamLogic.ts` to rename `getSummaryStats` function (which currently is missing `()` invocation across the codebase causing incorrect statistics logic) to `summaryStats` object property by changing `useCallback` to `useMemo`.
   - Update `app/(exam)/exam/page.tsx` references from `exam.getSummaryStats` to `exam.summaryStats`.
2. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
3. **Submit the changes with a PR**
   - Title: `⚡ Bolt: Use useMemo for summaryStats in useExamLogic`
   - Create PR with performance improvement summary.
