# Full Review Summary: Phase 11 Bugfix Session

**Review Date:** 2026-04-04
**Reviewed By:** Claude Code Review System
**Target:** 23 files changed, 425 insertions(+), 110 deletions(−) — Phase 11 bugfixes (timezone, coin counter, live subtitle, topic detail, migration detector, confetti CSP)

---

## Levels Completed

- [x] L1: Peer Review
- [x] L2: Architecture Review (>200 lines, new module, new API params)
- [x] L3: Security Review (user input timezone, CSP change, DB queries in migrate)
- [x] L4: Reliability Review (migrate.mjs infrastructure, error handling, DB transactions)

---

## Blocking Issues (Must Fix)

| Level | Issue | Location | Severity |
|-------|-------|----------|----------|
| L1/L3 | `timezone` field accepted with bare `typeof` check, no length cap — inconsistent with postpone route which uses `z.string().max(64)` | `app/api/tasks/[id]/complete/route.ts:42-48` | BLOCKING |
| L1/L2/L3/L4 | `selectDailyQuest`, `pickBestTask`, `forceSelectDailyQuest` still call private `getTodayString()` returning UTC — split-brain date vs. user timezone in postpone/complete | `lib/daily-quest.ts:43-49,149,247,335` | BLOCKING |
| L4 | `migrate.mjs` mid-loop exception falls through to `migrate()` instead of `process.exit(1)` — half-seeded state + silent root cause loss | `scripts/migrate.mjs:185-233` | BLOCKING |

---

## Non-Blocking Issues (Should Fix)

| Level | Issue | Location | Priority |
|-------|-------|----------|----------|
| L4 | No per-query statement timeout in migrate.mjs; 50+ catalog queries can block indefinitely on cold DB | `scripts/migrate.mjs:61-78` | HIGH |
| L4 | `updateStreak` failure inside `completeTask` transaction silently rolls back the entire task completion (coins, status, completions row) | `lib/tasks.ts` (transaction) | HIGH |
| L4/L3 | `getLocalTomorrowString` / `getLocalYesterdayString` use `setDate(getDate() ± 1)` on the UTC instant before timezone conversion — off-by-one for UTC− users near midnight | `lib/date-utils.ts:49-70,78-99` | HIGH |
| L1 | `tasks/page.tsx` serializer missing `postponeCount` and `estimatedMinutes` — badges never show on `/tasks` route | `app/(app)/tasks/page.tsx:49-68` | HIGH |
| L1 | `task-list.tsx` `Task` interface missing `recurrenceInterval`; accessed via `as unknown as` cast; edit form always defaults to 7 days | `components/tasks/task-list.tsx` | MEDIUM |
| L2/L4 | `handleComplete`/`handleUncomplete` duplicated verbatim in TaskList and TopicDetailView — will drift under future changes | `components/tasks/task-list.tsx` + `components/topics/topic-detail-view.tsx` | MEDIUM |
| L3/L4 | `coinsEarned` CustomEvent dispatches unvalidated numeric from API response — no `isFinite` guard; event name hard-coded in 3 places | `task-list.tsx`, `topic-detail-view.tsx`, `daily-quest-card.tsx` | MEDIUM |
| L4 | `refreshTasks()` silently swallows all errors — UI goes stale with no indicator after a failed refresh post-complete | `components/tasks/task-list.tsx:247-257` | MEDIUM |
| L4 | `selectDailyQuest` midnight boundary `new Date(\`${today}T00:00:00\`)` is server-local, not UTC — breaks on any non-UTC container | `lib/daily-quest.ts:247` | MEDIUM |
| L3 | `worker-src blob:` in CSP enables arbitrary blob Worker spawn alongside `unsafe-inline` — track as CSP hardening debt | `next.config.ts:71` | LOW |
| L4 | ALTER TABLE regex misses multi-line / constraint-prefixed forms — silent false-negative causes migrate() re-run without IF NOT EXISTS | `scripts/migrate.mjs:99-110` | LOW |
| L3 | `notes` / `description` fields in validators have no max length — large strings storable via API | `lib/validators/index.ts` | LOW |

---

## Recommendations

1. **Fix split-brain immediately** — Replace `getTodayString()` in `lib/daily-quest.ts` with `getLocalDateString()` (no-arg call is identical to UTC fallback). Thread timezone through `selectDailyQuest(userId, timezone?)` and `GET /api/daily-quest`.
2. **Add TimezoneSchema to validators** — `z.string().max(64).optional().nullable()` in `lib/validators/index.ts`, import in both complete and postpone routes.
3. **Fix migrate.mjs error handling** — Wrap the reconciliation loop in try/catch with `process.exit(1)` so mid-loop failures abort cleanly.
4. **Fix date arithmetic in date-utils.ts** — Use `Intl.DateTimeFormat` for tomorrow/yesterday too, not `setDate(±1)` on the UTC Date object.
5. **Add postponeCount + estimatedMinutes to tasks/page.tsx serializer** — Same pattern already used in topics page.
6. **Extract `useTaskCompletion` hook** — Eliminate duplication between TaskList and TopicDetailView.

---

## Tech Debt (Deferred)

- CSP nonce hardening to eliminate `unsafe-inline` + `worker-src blob:` combination
- Unit tests for `lib/date-utils.ts` (timezone boundary cases)
- `coinsEarned` event contract extraction to shared const
- Statement timeout in migrate.mjs catalog queries

---

## Verdict

- [ ] **APPROVED**
- [x] **CHANGES REQUESTED** — 3 blocking issues must be resolved

---

## Report Links

- L1: `.claude/reports/review/L1-peer-20260404.md`
- L2: `.claude/reports/review/L2-arch-20260404.md`
- L3: `.claude/reports/security/L3-security-20260404.md`
- L4: `.claude/reports/sre/L4-reliability-20260404.md`
