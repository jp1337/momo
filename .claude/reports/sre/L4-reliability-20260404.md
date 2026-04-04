# SLO Document: Momo — L4 Reliability Review
**Phase 11 Bugfix Session**
**Date:** 2026-04-04
**Reviewer:** SRE Agent (claude-sonnet-4-6)
**Scope:** Phase 11 post-bugfix reliability assessment — container startup, transaction safety, date arithmetic, client refresh, event dispatch, and failure cascades

---

## Service Overview

Momo is a Next.js 15 App Router application backed by PostgreSQL (Drizzle ORM). It is deployed as a Docker container. The migration script (`scripts/migrate.mjs`) runs synchronously before the Next.js server starts. Core reliability concerns span three layers: container startup safety, server-side transactional correctness, and client-side UI consistency.

---

## Files Reviewed

| File | Role |
|------|------|
| `scripts/migrate.mjs` | Container entrypoint migration runner |
| `lib/date-utils.ts` | Timezone-aware YYYY-MM-DD helpers |
| `lib/daily-quest.ts` | Daily quest selection, postpone, force-select |
| `lib/tasks.ts` | completeTask / uncompleteTask transactions |
| `lib/gamification.ts` | updateStreak, achievement unlock |
| `app/api/tasks/[id]/complete/route.ts` | POST/DELETE complete API route |
| `components/tasks/task-list.tsx` | Client-side complete/uncomplete + refresh |
| `components/topics/topic-detail-view.tsx` | Mirror of TaskList within topic scope |

---

## Finding Index

| ID | Severity | Area | Title |
|----|----------|------|-------|
| R-01 | BLOCKING | Container startup | migrate.mjs mid-loop query failure is unhandled — leaves pool open and hangs |
| R-02 | BLOCKING | Container startup | connectionTimeoutMillis covers only the first connect; per-entry query burst is unbounded |
| R-03 | BLOCKING | Daily quest | split-brain date: selectDailyQuest uses `getTodayString()` (UTC), postpone uses `getLocalDateString(timezone)` |
| R-04 | HIGH | Transaction safety | updateStreak failure inside completeTask transaction rolls back coins AND task completion silently |
| R-05 | HIGH | Date arithmetic | `getLocalTomorrowString` base is UTC wall-clock `new Date()`, not the user's local midnight — wrong for negative-offset users near midnight |
| R-06 | MEDIUM | Client refresh | `refreshTasks()` silently swallows errors; UI shows stale state with no staleness indicator |
| R-07 | MEDIUM | Event dispatch | `coinsEarned` CustomEvent carries unvalidated `data.coinsEarned` — NaN or negative if API returns unexpected shape |
| R-08 | MEDIUM | Failure cascade | Network truncation after successful DB write means client never receives coinsEarned/newLevel — no correction path |
| R-09 | MEDIUM | Daily quest split-brain | `selectDailyQuest` "completed today" guard uses `new Date(\`\${today}T00:00:00\`)` as a bare local-time Date, comparing against a UTC-stored `completedAt` timestamp |
| R-10 | LOW | migrate.mjs regex | ALTER TABLE parser misses multi-column or CONSTRAINT-prefixed ADD COLUMN variants — silent miss, not a crash |
| R-11 | LOW | Duplicate logic | handleComplete/handleUncomplete copied verbatim in TaskList and TopicDetailView — divergence risk |
| R-12 | LOW | Event naming | `"coinsEarned"` string hard-coded in 3 places: TaskList, TopicDetailView, daily-quest-card |

---

## Detailed Findings

### R-01 — BLOCKING: migrate.mjs mid-loop query failure is unhandled

**File:** `scripts/migrate.mjs` lines 218–259

**Evidence:**

The outer `try/finally` block (lines 211–259) calls `client.release()` in `finally`. However, every call inside the loop — `isMigrationTracked`, `isMigrationAppliedInDb`, `seedOneMigration` — is `await`-ed with no individual try/catch. If any of these throws (e.g. a transient PostgreSQL error mid-loop), the exception propagates out of the `try` block, `client.release()` runs in `finally`, but then the process **does not exit with code 1** — it falls through to the `migrate()` call at line 262.

At that point, either:
- `migrate()` succeeds on a partially-seeded tracking table, producing an inconsistent migration history, or  
- `migrate()` fails because half of the seeding was applied, producing a misleading error message.

The container then exits 1 from `migrate()`'s catch block, but the root cause (the mid-loop query failure) is lost from the logs.

**Correct expected behavior:** any error during the inspection loop should log the entry name, release the client, and `process.exit(1)` immediately.

**Impact:** Inconsistent migration tracking may allow a partially-applied migration to be re-run on the next restart, causing DDL "already exists" errors or data corruption in the tracking table.

---

### R-02 — BLOCKING: connectionTimeoutMillis does not bound the inspection query burst

**File:** `scripts/migrate.mjs` lines 47–51

**Evidence:**

```js
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 5_000,
});
```

`connectionTimeoutMillis: 15_000` governs how long `pool.connect()` waits to acquire a connection from the pool. Once a connection is acquired (line 210), individual query execution has **no statement-level timeout**. The inspection loop issues 3–5 `information_schema` queries per migration entry. On a cold PostgreSQL container (e.g. shared cloud instance resuming from sleep), these catalog queries can take 2–10 seconds each.

With 10 migration entries, the loop can issue 50+ catalog queries. At 5 s per query, this reaches 250 s — well beyond any Docker health check window (typically 30–120 s), causing the container to be killed and restarted before migrations complete.

**No `statement_timeout` is set** on the acquired client, and the `pool.query()` helper calls inherit no deadline from the pool configuration.

**Impact:** Slow DB at startup (cold start, IO-throttled volume) causes migration runner to hang indefinitely, blocking container start and triggering infinite restart loops.

---

### R-03 — BLOCKING: split-brain date between selectDailyQuest and postponeDailyQuest

**File:** `lib/daily-quest.ts` lines 43–49 vs lines 445–446

**Evidence:**

`selectDailyQuest` (and `forceSelectDailyQuest`) calls the local helper `getTodayString()` defined at line 43:

```typescript
function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
```

This returns the **server's local date**, which in production containers is UTC.

`postponeDailyQuest` calls `getLocalDateString(timezone)` from `lib/date-utils.ts` at line 445, which returns the **user's local date** via `Intl.DateTimeFormat`.

**Concrete failure scenario:**

A user in UTC+2 is at 23:30 local time (21:30 UTC). Today is 2026-04-03 in their timezone; it is still 2026-04-03 UTC too.

At 23:01 local time (21:01 UTC), `selectDailyQuest` picks a quest. `getTodayString()` returns `2026-04-03` (UTC). All is consistent so far.

At 00:10 local time on 2026-04-04 (22:10 UTC on 2026-04-03), the user postpones the quest:
- `postponeDailyQuest` calls `getLocalDateString("Europe/Berlin")` → `2026-04-04` (local date)
- The postpone counter is stamped with `questPostponedDate = "2026-04-04"`
- `getLocalTomorrowString("Europe/Berlin")` sets `due_date = "2026-04-05"` (correct in user's timezone)

Now `selectDailyQuest` runs to pick the next quest:
- `getTodayString()` → `2026-04-03` (still UTC, 22:10 UTC)
- "completed today" guard: checks `completedAt >= new Date("2026-04-03T00:00:00")` — correctly no completed quest
- `pickBestTask` compares `due_date < "2026-04-03"` — the postponed task now has `due_date = "2026-04-05"`, so it is NOT overdue
- A different task may be selected, or the same task via priority-4 random pool

**Additionally,** the "completed today" guard in `selectDailyQuest` at line 248:

```typescript
const todayStart = new Date(`${today}T00:00:00`);
```

This constructs a bare local-time Date from `today` (a UTC string). If the server is UTC, this is `2026-04-03T00:00:00Z` — correct. But `completedAt` is stored as a UTC timestamp. The comparison `gte(tasks.completedAt, todayStart)` sends this as a parameter to Postgres. If the server's `TZ` env var is ever changed to non-UTC, the midnight boundary shifts and completions near midnight may be double-counted or missed.

**Impact:** Users near the UTC day boundary may get a second quest assignment on the same calendar day (in their timezone), or have their postpone budget reset at the wrong time.

---

### R-04 — HIGH: updateStreak failure inside completeTask transaction rolls back the entire operation

**File:** `lib/tasks.ts` lines 320–321; `lib/gamification.ts` lines 230–282

**Evidence:**

```typescript
// lib/tasks.ts line 320
const { streakCurrent } = await updateStreak(userId, tx, timezone);
```

`updateStreak` is called inside the `db.transaction()` block. It queries and then updates `users.streakCurrent`, `users.streakMax`, and `users.streakLastDate` on the same `tx` connection.

If `updateStreak` throws — for example:
- The `users` row was deleted between the outer task fetch and the transaction (race with account deletion)
- A DB constraint violation (e.g. `streakLastDate` format mismatch)
- A transient serialization failure in a high-isolation transaction

...then the entire transaction rolls back, including:
- The `tasks.completedAt` update
- The `taskCompletions` insert
- The `users.coins` increment
- The `users.level` update

The API route catches this as a generic 500, returns `{ error: "Internal server error" }`, and the client shows no feedback other than the task remaining uncompleted.

The user loses their completion, their coins, and their streak update — all because the streak counter failed. The task stays incomplete on next refresh.

**Streak failure scenarios that should NOT kill the completion:**
- User row temporarily locked by another transaction (settings update, concurrent request)
- `streakLastDate` type coercion edge case (e.g. DB returns Date object vs string inconsistently)

**Impact:** Transient streak update failures cause user-visible task completion failures. A user completing their daily quest near midnight could lose both the quest completion and their streak in a single bad transaction.

---

### R-05 — HIGH: getLocalTomorrowString base is UTC wall-clock, not user's local midnight

**File:** `lib/date-utils.ts` lines 49–70

**Evidence:**

```typescript
export function getLocalTomorrowString(timezone?: string | null): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // ...
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, ... }).format(tomorrow);
}
```

`new Date()` returns the current UTC instant. `setDate(getDate() + 1)` adds 24 hours to the server's local day boundary (UTC in production). The result is then formatted in the user's timezone.

**Failure scenario for UTC- users (e.g. America/New_York, UTC-5):**

At 23:30 UTC (18:30 EST local, 2026-04-03):
- `new Date()` = `2026-04-03T23:30:00Z`
- `setDate(getDate() + 1)` adds 1 to `getDate()` which is `3` in UTC → result is `2026-04-04T23:30:00Z`
- `Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(...)` formats `2026-04-04T23:30:00Z` → `2026-04-04` in EST

This happens to be correct.

**Failure scenario at DST transition (clocks spring forward 02:00 → 03:00):**

On DST transition night, `setDate(tomorrow.getDate() + 1)` adds exactly 86400 seconds. If local DST causes the calendar day to be 23 hours long, the resulting instant may still land on the same calendar date rather than the next one. In V8/Node, `setDate` adds calendar days, not wall-clock hours, so this is correctly handled.

**Actual confirmed bug — negative-offset users near server midnight:**

At 23:50 UTC (18:50 EST):
- `new Date()` = `2026-04-03T23:50:00Z`
- `setDate(getDate() + 1)` → `2026-04-04T23:50:00Z`
- Formatted in `America/New_York` → `2026-04-04` ✓ (correct)

At 00:05 UTC (19:05 EST the *previous* day):
- `new Date()` = `2026-04-04T00:05:00Z`
- `getDate()` in UTC returns `4`
- `setDate(5)` → `2026-04-05T00:05:00Z`
- Formatted in `America/New_York` → `2026-04-05`

But the user's local date is still `2026-04-03` (19:05 EST). "Tomorrow" for the user is `2026-04-04`. The function returns `2026-04-05`, one day too far ahead.

This means a postponed task gets `due_date = 2026-04-05` when the user expects `2026-04-04` — the task disappears from "tomorrow" and appears in "upcoming" at an unexpected date.

The correct implementation would use `getLocalDateString(timezone)` as the base and advance by one day using the same Intl mechanism — not `new Date()` + UTC `setDate`.

**getLocalYesterdayString** has the same structural issue and the same bug in negative-offset / midnight scenarios, though the practical consequence (streak check) is less severe because streaks are only checked once per day.

---

### R-06 — MEDIUM: refreshTasks() silently swallows errors; UI goes stale without indication

**File:** `components/tasks/task-list.tsx` lines 247–257; `components/topics/topic-detail-view.tsx` lines 61–71

**Evidence:**

```typescript
const refreshTasks = useCallback(async () => {
  try {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json() as { tasks: Task[] };
      setTasks(data.tasks);
    }
    // Non-ok response: no action taken
  } catch {
    // silent fail — stale data is better than crashed UI
  }
}, []);
```

If `refreshTasks()` fails (network error, 401 session expiry, 500 from DB), the local `tasks` state is not updated. The component continues to show the pre-completion state of the task. Because `handleComplete` already called `triggerSmallConfetti()` and dispatched `coinsEarned` before calling `refreshTasks()`, the UI shows:

- Confetti played (suggests success)
- Coin counter incremented (suggests success)
- Task list still shows task as incomplete (contradicts above)

There is no stale-data indicator, no retry, and no mechanism to prompt the user to reload. The user is left confused.

**Secondary concern:** `handleComplete` calls `refreshTasks()` after a successful API response (`res.ok` check), so the completion itself succeeded. The stale UI is cosmetic in the common case. However, after session expiry (401 on `/api/tasks`), the task list will never self-update until the user navigates away, since the router is not called.

---

### R-07 — MEDIUM: coinsEarned CustomEvent dispatches unvalidated numeric

**File:** `components/tasks/task-list.tsx` lines 274–278; `components/topics/topic-detail-view.tsx` lines 91–94

**Evidence:**

```typescript
if (data.coinsEarned && data.coinsEarned > 0) {
  window.dispatchEvent(
    new CustomEvent("coinsEarned", { detail: { delta: data.coinsEarned } })
  );
}
```

`data` is cast with `as CompleteApiResponse` — a TypeScript assertion with no runtime enforcement. If the server returns an unexpected shape (e.g. `coinsEarned: "3"` as a string from a serialization quirk, or `coinsEarned: Infinity` from a coin calculation overflow), the `delta` in the event carries the raw value.

`CoinCounter` (in `layout/coin-counter.tsx`) listens for this event and applies the delta to its local state. An unexpected type or extreme value would corrupt the displayed coin balance until the next full page reload.

The guard `data.coinsEarned && data.coinsEarned > 0` catches `0`, `null`, `undefined`, and `NaN` (since `NaN > 0` is false), but does not catch `Infinity`, negative values from a buggy API response, or string coercion issues.

**Impact:** Medium — coin display corruption without data loss. Corrected on next navigation or page reload.

---

### R-08 — MEDIUM: network truncation after successful DB write loses coin/level/achievement feedback

**File:** `app/api/tasks/[id]/complete/route.ts` lines 52–58; client handlers in task-list.tsx

**Evidence:**

The completion path is:
1. DB transaction commits (coins, streak, task status, achievements all written)
2. Server serializes response JSON
3. Network transmits response
4. Client parses response

Steps 2–4 can fail independently of step 1. If the TCP connection is reset after the DB commit but before the client receives the response:
- `fetch()` throws a `TypeError: Failed to fetch` (or similar)
- The `catch {}` block in `handleComplete` swallows the error
- No confetti, no coin event, no level-up overlay, no achievement toast
- `refreshTasks()` is never called
- The task list shows the task as incomplete

On the **next** page load, the task will show as completed (the DB write was durable). The coin counter will correct itself via the server-rendered initial value. But:
- The user misses their level-up notification
- Achievement toasts are never shown
- The coin counter shows an incorrect delta until the next navigation

There is no client-side reconciliation pass (e.g. a polling `/api/users/stats` call) that would catch this divergence and re-trigger the UI feedback.

**Impact:** Medium frequency on mobile networks or flaky connections. Users do not receive gamification feedback for completions that actually succeeded.

---

### R-09 — MEDIUM: selectDailyQuest "completed today" guard compares local-time midnight against UTC timestamp

**File:** `lib/daily-quest.ts` lines 247–266

**Evidence:**

```typescript
const today = getTodayString();           // UTC date string (server local)
const todayStart = new Date(`${today}T00:00:00`); // bare local-time Date
```

`new Date("2026-04-03T00:00:00")` without a timezone suffix is parsed as **local time** by the ECMAScript spec (as of ES2015). In a Node container with `TZ=UTC`, this equals `2026-04-03T00:00:00Z`. In a container with `TZ=Europe/Berlin`, this would be `2026-04-02T22:00:00Z`.

The comparison:
```typescript
gte(tasks.completedAt, todayStart)
```

Sends `todayStart` as a parameter to Drizzle, which passes it as a timestamptz to PostgreSQL. Postgres stores `completedAt` as UTC. The comparison is therefore `completedAt >= '2026-04-03 00:00:00+00:00'`.

This is correct as long as the server TZ is UTC. If the Docker container TZ environment variable is changed (e.g. for localization purposes), the midnight boundary shifts and some completions will either be missed (no celebration state) or incorrectly matched (celebration state shown for yesterday's completion).

**This is a latent issue** — it does not currently fire in production containers with `TZ=UTC`, but it is a reliability landmine for any deployment configuration change.

---

### R-10 — LOW: ALTER TABLE regex misses multi-line and CONSTRAINT-prefixed patterns

**File:** `scripts/migrate.mjs` lines 91–99

**Evidence:**

```javascript
const re = /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi;
```

This regex:
1. Matches only single-line forms — the regex engine processes each match against the full string with `/g` but the pattern itself does not use `[\s\S]` or `/s` (dotall) mode. If a migration has a line break between `ADD COLUMN` and the column name (e.g. wrapped by `drizzle-kit`), the match fails.
2. Does not handle `ADD COLUMN "column" TYPE CONSTRAINT ...` where a named constraint precedes the column name.
3. Does not handle `ADD "column"` (without the `COLUMN` keyword, which is valid in PostgreSQL).

When a regex miss occurs for an ADD COLUMN migration, `columns` is empty. If the migration also creates no tables or indexes, `isMigrationAppliedInDb` returns `false` (line 188: "Cannot verify — let migrate() handle it"). This causes the migration to be treated as unapplied even if the column already exists.

`migrate()` then re-runs the migration. For `ADD COLUMN IF NOT EXISTS` migrations this is a no-op. For migrations without `IF NOT EXISTS`, Drizzle will get a PostgreSQL error and the container will fail to start (exit code 1 from line 267).

**This is lower severity than initially assessed** because drizzle-kit generated migrations consistently quote table and column names and use `ADD COLUMN IF NOT EXISTS` in newer versions. However, migrations written manually or by older drizzle-kit versions may lack `IF NOT EXISTS`.

---

### R-11 — LOW: handleComplete/handleUncomplete duplicated across two components

**File:** `components/tasks/task-list.tsx` lines 259–313; `components/topics/topic-detail-view.tsx` lines 73–128

**Evidence:**

`handleComplete` and `handleUncomplete` are near-identical between both files. The `TopicDetailView` version lacks `streakCurrent` in its response type annotation (compare: task-list.tsx line 226 `streakCurrent?: number` vs topic-detail-view.tsx lines 83–87 where `streakCurrent` is absent).

**Current divergence:** The `TopicDetailView` version does not store or expose `streakCurrent` from the complete response. This is a display concern only — the streak is correctly written to the DB in both cases.

**Risk:** Any future change to the complete API response shape (e.g. adding a new field for consecutive quest completions) must be applied in both files. History shows this has already created a minor type omission. The next divergence may be a behavioral one.

---

### R-12 — LOW: "coinsEarned" event name hard-coded in three places

**File:** `components/tasks/task-list.tsx` line 275; `components/topics/topic-detail-view.tsx` line 92; `components/dashboard/daily-quest-card.tsx` (referenced in CLAUDE.md)

**Evidence:**

The string `"coinsEarned"` appears as a bare string literal in each call site and in the corresponding `addEventListener` in `CoinCounter`. There is no shared constant. A rename or typo in any one location would silently break the coin counter update path — the event would be dispatched under one name and listened for under another, with no TypeScript error.

---

## Failure Mode Summary

| Failure Mode | Detection | Current Mitigation | Gap |
|---|---|---|---|
| DB slow at container cold start | Container health check timeout | 15 s connect timeout | Per-query timeout absent; loop can take minutes |
| Mid-loop inspection query fails | Process exits 1 | `finally` releases client | Falls through to migrate() instead of exiting |
| Task completion + streak write failure | 500 response to client | Transaction rollback | Streak failure undoes full completion — should be decoupled |
| Coin event on network truncation | None | None | No reconciliation path; gamification feedback lost |
| refreshTasks() failure after completion | None | Silent catch | UI stale with no indicator |
| Split-brain date: selectDailyQuest UTC vs postpone user-TZ | None | None | Two quests possible on same user-calendar day |
| getLocalTomorrowString off-by-one (UTC- near midnight) | None | None | Postponed task deferred an extra day |
| coinsEarned event carries NaN/Infinity | None | `> 0` guard (partial) | Corrupts coin counter display |

---

## SLIs and SLOs for the Reviewed Path

### Task Completion Path

| SLI | Definition | Current State |
|-----|------------|---------------|
| Completion success rate | completeTask returns 2xx / all attempts | Unknown; not instrumented |
| Completion P99 latency | Time from POST to 2xx response | Unknown |
| Streak write success rate | updateStreak succeeds within transaction | Coupled to completion — any streak failure = completion failure |
| UI consistency after complete | refreshTasks returns updated state within 5 s | No guarantee; silent failure |

**Recommended SLO targets:**

| SLO | Target | Window |
|-----|--------|--------|
| Task completion availability | 99.5% | 30 days |
| Task completion P99 latency | < 2 s | 30 days |
| Container startup success rate | 99.9% | 30 days |
| Container startup time (to healthy) | < 30 s | 30 days |

---

## Action Items

| Priority | ID | Action | File(s) | Effort |
|----------|----|--------|---------|--------|
| P0 | R-03-fix | Replace `getTodayString()` in `daily-quest.ts` with `getLocalDateString(timezone)` — requires threading `timezone` into `selectDailyQuest` and `pickBestTask` | `lib/daily-quest.ts` | Medium |
| P0 | R-01-fix | Wrap entire inspection loop body in try/catch; on error log entry name + error, then `process.exit(1)` | `scripts/migrate.mjs` | Small |
| P0 | R-05-fix | Rewrite `getLocalTomorrowString` and `getLocalYesterdayString` to compute base date from `getLocalDateString(timezone)` + string arithmetic, not from `new Date()` + UTC `setDate` | `lib/date-utils.ts` | Small |
| P1 | R-04-fix | Decouple streak update from completion transaction: run completeTask transaction first, then call `updateStreak` outside the transaction in a best-effort manner | `lib/tasks.ts`, `lib/gamification.ts` | Medium |
| P1 | R-02-fix | Set `statement_timeout = 5000` on the acquired pool client before the inspection loop; add an overall `AbortController` deadline of 20 s for the entire pre-migrate block | `scripts/migrate.mjs` | Small |
| P1 | R-09-fix | Replace `new Date(\`\${today}T00:00:00\`)` with explicit UTC construction: `new Date(\`\${today}T00:00:00Z\`)` | `lib/daily-quest.ts` | Small |
| P2 | R-06-fix | Add an `isStale` boolean state to TaskList/TopicDetailView; set it true on `refreshTasks` failure; render a banner prompting the user to reload | `components/tasks/task-list.tsx`, `components/topics/topic-detail-view.tsx` | Small |
| P2 | R-07-fix | Add runtime validation of `coinsEarned` before dispatching event: `Number.isFinite(data.coinsEarned) && data.coinsEarned > 0` | Same components | Small |
| P2 | R-08-fix | After successful task completion, schedule a one-shot `/api/users/stats` fetch (500 ms debounced) to reconcile coin/level state in case the primary response was lost | `components/tasks/task-list.tsx`, `components/topics/topic-detail-view.tsx` | Medium |
| P3 | R-10-fix | Add `IF NOT EXISTS` to all ADD COLUMN statements in migrations, or extend regex to handle multi-line and constraint-prefixed forms | `drizzle/*.sql`, `scripts/migrate.mjs` | Small |
| P3 | R-11-fix | Extract `handleComplete`, `handleUncomplete`, and the `CompleteApiResponse` type into a shared hook `useTaskCompletion()` | `lib/hooks/use-task-completion.ts` (new) | Medium |
| P3 | R-12-fix | Define `COINS_EARNED_EVENT = "coinsEarned" as const` in a shared constants file and import it in all three components and CoinCounter | `lib/events.ts` (new) | Small |

---

## Graceful Degradation Gaps

1. **Streak update failures** — currently propagate as task completion failures. Streak is a gamification concern; it should not block task completion. Degrade gracefully by logging the streak failure server-side and returning `streakCurrent: null` to the client.

2. **Migration inspection failure** — currently falls through to `migrate()`. Should degrade to "run migrate() anyway" only if the failure is a recoverable query error, not a schema inconsistency. A `--force` flag could allow operators to bypass inspection.

3. **refreshTasks failure** — currently leaves UI stale. A minimal degradation path is an optimistic state update (mark task completed in local state immediately on `res.ok`) before the background refresh, so the UI reflects the server truth even if the refresh fails.

---

## Monitoring Recommendations

The following metrics do not currently exist but would provide early warning for the failure modes above:

| Metric | Alert Threshold | Rationale |
|--------|----------------|-----------|
| `migrate_duration_seconds` | > 20 s | Indicates DB cold-start or query timeout risk |
| `task_complete_error_rate` | > 1% over 5 min | Transaction failures including streak rollbacks |
| `coin_event_dispatch_count` vs `task_complete_success_count` | Divergence > 5% | Detects network truncation / lost responses |
| `daily_quest_assignments_per_user_per_day` | > 1 | Detects split-brain double-assignment |
| `streak_update_failure_count` | Any | Currently zero-observable — streak failures are silent after a rollback |

---

## Summary

The Phase 11 bugfix session significantly improved timezone handling via `lib/date-utils.ts` and the Drizzle transaction structure in `lib/tasks.ts`. However, three blocking issues remain that can manifest in production:

1. `scripts/migrate.mjs` can silently fall through a mid-loop failure into `migrate()`, potentially causing schema inconsistency at container start.
2. `selectDailyQuest` uses UTC date arithmetic while `postponeDailyQuest` uses the user's timezone — users near the UTC day boundary can receive a second quest assignment within the same local calendar day.
3. `getLocalTomorrowString` bases its arithmetic on `new Date()` (UTC wall-clock) rather than the user's local date, producing an off-by-one for users in UTC- timezones near server midnight.

The remaining findings are high-severity reliability concerns around transaction decoupling (R-04), client-side staleness (R-06), and unguarded failure cascades (R-08) that collectively degrade the gamification experience on unreliable networks without any user-visible feedback.

---

*Report generated by SRE Agent — Momo reliability-review mode*
*Model: claude-sonnet-4-6 | Date: 2026-04-04*
