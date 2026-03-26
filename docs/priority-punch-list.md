# Priority punch list (P0–P5)

Consolidated from parallel codebase exploration. Each section maps to one priority tier: product/auth, exam persistence, exam UX, TypeScript discipline, AI orchestration, dashboard IA.

---

## P0 — Product truth and guest vs sign-in

**Focus:** Server redirects, CTAs, `AuthProvider`, middleware.

### Findings

- Only **`app/(coach)/dashboard/page.tsx`** uses server `getUser()` and **`redirect('/login')`** for the coach dashboard; other `(coach)` routes are client components without that gate.
- **`app/page.tsx`** sends users to `/dashboard`, so guests hit that redirect.
- **`app/components/auth/AuthFooter.tsx`** and **`app/(auth)/signup/page.tsx`** link “Continue without an account” → **`/dashboard`** (copy implies device-only data).
- **`app/components/AuthProvider.tsx`:** `getEffectiveStudentId()` prefers Supabase `user.id`, else **`localStorage`** (`gcse_student_id_v1`). `signInAnonymously()` is separate (Supabase anonymous user). `isAuthenticated` is `!!user`, so pure localStorage guests are not “authenticated.”
- **`middleware.ts`:** Refreshes session only — **no** login redirect; the real wall is the **dashboard server page**.

### Ordered files to touch

1. `app/(coach)/dashboard/page.tsx`
2. `app/components/auth/AuthFooter.tsx` and `app/(auth)/signup/page.tsx`
3. `app/page.tsx`
4. Optionally `app/components/AuthProvider.tsx` and exam anonymous flow alignment
5. Optionally `middleware.ts` if enforcing protection centrally
6. `app/components/layout/AppSidebar.tsx` (Guest / sync copy)

### Options

- **A — Sign-in required:** Align CTAs; remove or reword guest promises unless features work without account.
- **B — Guest dashboard:** Stop server-only `user` requirement for `/dashboard` or mirror other coach patterns with `useStudentId()`; pick one canonical ID (localStorage vs `signInAnonymously()`).
- **C — Hybrid:** Do not link guests to `/dashboard` until it loads without redirect; use `/subjects`, `/guest`, or interstitial.

---

## P1 — Exam session model, persistence, resume

**Focus:** `app/hooks/useExamLogic.js`, IndexedDB, Supabase `active_exam_sessions`, exam page, PaperLibrary.

### Findings

**Persisted (IDB key `gcse_marker_state` and cloud `state` JSON):**

- `activeQuestions`, `userAnswers`, `feedbacks`, `insertContent`, `currentQIndex`, `skippedQuestions`, `followUpChats`, `paperFilePaths`, `paperId`, `timestamp`

**Not persisted:**

- `quoteDrafts`
- `parsedMarkScheme` — not restored in `applySessionData`

### Risks

- `restoreSession` / `restoreSessionForPaper` return **Promises** — callers should `await` and branch on resolved data.
- `checkSessionForPaper` may be used as if synchronous — verify PaperLibrary / callers.
- `clearSession` may not delete `active_exam_sessions` rows — stale cloud state.
- `app/(exam)/exam/page.tsx` may check **`localStorage['gcse_marker_state']`** while persistence uses **IDB** — align probes.

### Checklist

- [x] Add missing fields to persisted blob + `applySessionData` (at minimum decide on `parsedMarkScheme`; optional `quoteDrafts`).
- [x] Introduce typed **`ExamSession` / `PersistedExamState`** + `schemaVersion` for migrations.
- [x] Single **`serializeSession` / `deserializeSession`** for IDB and Supabase.
- [x] Await restore paths in `exam/page.tsx`; fix persist effect dependencies or snapshot-based save.
- [x] PaperLibrary: async-friendly session detection (not `Promise` as truthy boolean).
- [x] Regenerate or hand-add **`active_exam_sessions`** in `app/lib/supabase/database.types.ts`.
- [x] Optional split: `useExamSessionState` + `useExamSessionPersistence` + thin `useExamLogic`.

### SQL reference

- Table: `active_exam_sessions` (`student_id`, `paper_id`, `state` JSONB) — see `supabase_security_and_sync.sql`.

---

## P2 — Exam UX (layout, PDF, AdaptiveInput)

**Focus:** `app/(exam)/exam/page.tsx`, `app/components/PDFViewer.tsx`, `app/components/AdaptiveInput.tsx`.

### Findings

- **`PDFViewer`:** `hidden md:flex` — PDF UI **not shown below `md`**. Resize/annotate paths are mouse-oriented; touch support is limited.
- **Exam page:** Side-by-side layout; on small screens the PDF column is effectively missing until layout/tabs are added.
- **`AdaptiveInput`:** Fixed `name="mcq"` — collision risk if multiple MCQ groups mount; long answers use fixed **`h-48`** + **`resize-none`**; parent **`key={question.id}`** avoids bleed; both files use **`@ts-nocheck`**.

### Prioritized changes

1. Make PDF visible on small screens: tabs or stacked layout (Question / Paper / Mark scheme).
2. Adjust `exam/page.tsx` main flex structure for mobile (`flex-col`, toggle, scroll).
3. Touch-friendly annotations or hide non-working tools on touch.
4. Unique MCQ `name` per question id.
5. Autosize or expandable long-text areas; optional word/line estimate.
6. Incremental typing (`@ts-nocheck` removal ties to P3).

---

## P3 — TypeScript / `@ts-nocheck`

**Focus:** Inventory under `app/` (on the order of **19 files** with `// @ts-nocheck`).

### Grouping

| Domain    | Examples |
|-----------|----------|
| Exam      | `app/(exam)/exam/page.tsx` |
| studentOS | `studentOS.ts`, `attempts.ts`, `exams.ts`, `sessions.ts`, `assessments.ts`, `settings.ts`, `subjects.ts`, `memory.ts`, `admin.ts` |
| UI        | `AdaptiveInput.tsx`, `AIScheduleGenerator.tsx`, `MathKeyboard.tsx`, `GraphCanvas.tsx`, coach pages (`daily`, `subjects`, `settings`) |
| Hooks     | `useStudyTechniques.ts` |
| Coach AI  | `AICoachService.ts` |

### Suggested removal order

1. Shared DB + domain types (`database.types.ts`, `studentOS/types.ts`).
2. `studentOS/exams.ts`, `studentOS/attempts.ts`.
3. `studentOS/assessments.ts`, `subjects.ts`, `settings.ts`, `sessions.ts`, `memory.ts`, `admin.ts`.
4. `studentOS.ts` (barrel — after modules).
5. `AdaptiveInput.tsx`, then `(exam)/exam/page.tsx`.
6. Coach stack: `useStudyTechniques.ts`, `AICoachService.ts`, coach pages, `AIScheduleGenerator.tsx`.
7. Input chrome: `MathKeyboard.tsx`, `GraphCanvas.tsx`.

### Type file suggestions

- DB: `app/lib/supabase/database.types.ts`
- Domain: `app/services/studentOS/types.ts` (or split under `studentOS/types/`)
- Exam UI-only: `app/types/exam-ui.ts` or `app/(exam)/exam/types.ts`
- Component props: colocated `*.types.ts` or `app/components/inputs/types.ts`

---

## P4 — AI orchestration server-side

**Focus:** `app/services/AICoachService.ts`, `app/services/AIService.js`, API routes, dashboard.

### Findings

- **`AICoachService.ts`:** `'use client'`, posts to **`/api/hackclub`**, in-memory **`INSIGHTS_CACHE`** (5 min TTL, per tab, max 100 entries), uses client **`memoryService`** for context.
- **`/api/hackclub`** and **`/api/openrouter`:** `getUser()`, 401 if unsigned; rate limit in `app/lib/rateLimit.ts` (in-process).
- **`DashboardClient`** uses **`generateDashboardInsights`**; **`generateDailyQuestions`** is exported but **unused** in the repo.
- Broader client orchestration: **`AIService.js`**, **`useStudyTechniques.ts`**, exam/assessments/settings.

### Migration steps (ordered)

1. Define server-owned contracts (e.g. `POST /api/coach/insights`) with minimal client input; `studentId` from session.
2. Move prompt assembly + Hack Club call off the client; reuse server env from existing routes.
3. Load memory with Supabase **server** client where needed.
4. Replace client `INSIGHTS_CACHE` with Redis or Supabase-backed cache (keyed by user + stable input hash).
5. Thin **`DashboardClient`** to `fetch` server route or Server Action.
6. Extend pattern to **`AIService` / hooks** as follow-on.
7. Zod (or similar) for LLM JSON; structured errors.
8. Request IDs / server-only logging for upstream latency and status.

### Key paths

- `app/services/AICoachService.ts`
- `app/api/hackclub/route.ts`
- `app/api/openrouter/route.ts`
- `app/lib/rateLimit.ts`
- `app/(coach)/dashboard/DashboardClient.tsx`

---

## P5 — Dashboard information architecture

**Focus:** `app/(coach)/dashboard/DashboardClient.tsx`, `app/(coach)/dashboard/page.tsx`.

### Findings

- **Two primary CTAs to `/daily`:** header “Start Revision” vs “Next Best Session” → “Start Now” (same destination).
- **Next mock / national dates** appear in both the top countdown strip and the **GCSE Key Dates** card (redundant).
- **Weakness rows:** `cursor-pointer` and chevron without `Link`/`onClick` — misleading affordance.
- Possible **unused imports:** `useAuth`, `useStudentId` in `DashboardClient` — verify before removal.

### Prioritized IA changes

1. Single primary CTA to `/daily` (merge or demote duplicate).
2. One surface for key dates (strip vs card — avoid duplicating First Exam / Results / Next mock).
3. Make weakness rows link to `/daily`, `/exam`, or `/subjects/[id]` — or remove pointer styling.
4. Demote daily tip so the hero stays one focal action.
5. Reduce duplicate metrics + AI copy in Exam Readiness (trend vs streak).
6. Clean imports and dead code.

### Ordered files

1. `app/(coach)/dashboard/DashboardClient.tsx`
2. `app/services/AICoachService.ts` (if insight shape or tips change)
3. `app/(coach)/dashboard/page.tsx` (if server-loaded sections change)
4. `app/services/gcseDates.js` (if milestone model changes)

---

## Route sanity note

In this repo, **`/exam`** and **`/assessments`** exist (`app/(exam)/exam/page.tsx`, `app/(coach)/assessments/page.tsx`). The main product/code mismatch called out in discovery is **guest CTAs vs server dashboard redirect**, not missing routes.

---

## Subagent transcript references

Parent exploration runs (for follow-up in Cursor): P0 `eef6f9a8-70e4-43a9-813c-c7f493fdee5c`, P1 `cb2bb2d3-8af6-40b8-8bf9-f198329db94d`, P2 `3dfae51b-1dfc-4fe0-a319-5f769a276242`, P3 `bae59fe3-e4a7-48cd-8941-072059480686`, P4 `fc11db6d-32f2-4fda-a8f8-6c233d4cd1e8`, P5 `d8b77886-c268-4e72-a112-a5086d444e67`.

---

*Generated for planning and execution order; update this file as work lands.*
