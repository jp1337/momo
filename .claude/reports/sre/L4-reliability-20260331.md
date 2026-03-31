# SLO Document: Momo – Task Management Application

**Review Type:** Reliability Review (L4)
**Date:** 2026-03-31
**Reviewer:** SRE Agent (claude-sonnet-4-6)
**Scope:** Entire application — lib/tasks.ts, lib/push.ts, lib/rate-limit.ts, lib/daily-quest.ts, docker-compose.yml, deploy/examples/deployment.yaml, .github/workflows/build-and-publish.yml

---

## Service Overview

Momo is a Next.js 15 App Router application for task management targeting users with avoidance tendencies. It provides task CRUD, gamification (coins, streaks, levels, achievements), daily quest selection, push notifications via VAPID, and a wishlist feature. The backend is a single PostgreSQL 16 database accessed via Drizzle ORM. It is deployed as a Docker container with two Kubernetes replicas or as a single-container Docker Compose stack.

---

## Dependencies

| Dependency | Type | SLO Assumed | Impact if Down |
|------------|------|-------------|----------------|
| PostgreSQL 16 | Hard | 99.9% | Complete outage — all API routes fail |
| OAuth Providers (GitHub, Discord, Google, OIDC) | Hard for login, soft after login | ~99.5% | New logins blocked; existing sessions unaffected |
| Web Push (VAPID endpoint) | Soft | N/A | Notifications silently dropped; app continues |
| GHCR / Docker Hub / Quay.io | Soft (CI only) | ~99.5% | Deployments fail; production unaffected |
| GitHub Actions runners | Soft (CI only) | ~99.5% | Builds blocked; production unaffected |
| External cron scheduler | Soft | N/A | Push notifications not sent; no data loss |

---

## SLIs (Service Level Indicators)

| SLI | Definition | Measurement |
|-----|------------|-------------|
| Availability | Successful (non-5xx) requests / total requests | `(total_requests - http_5xx_responses) / total_requests` |
| Latency P50 | Median response time for API routes | `histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))` |
| Latency P99 | 99th percentile response time for API routes | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |
| Error Rate | 5xx responses / total responses | `rate(http_5xx_total[5m]) / rate(http_requests_total[5m])` |
| DB Connection Success | Successful DB queries / total DB queries | `(db_queries_total - db_query_errors_total) / db_queries_total` |
| Push Delivery Rate | Notifications sent / notifications attempted | `push_sent / (push_sent + push_failed)` |
| Task Completion Success | Successful completeTask calls / total attempts | API-level 2xx / total POST to /complete |

---

## SLOs (Service Level Objectives)

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| API Availability | 99.5% | 30 days | 216 minutes |
| P50 Latency | < 200ms | 30 days | N/A |
| P99 Latency | < 1000ms | 30 days | N/A |
| Error Rate | < 0.5% | 30 days | N/A |
| DB Availability | 99.9% | 30 days | 43.2 minutes |
| Push Delivery Rate | > 80% of attempted | per cron run | N/A |

Note: Current targets are set conservatively. No telemetry is instrumented in the application today, so these SLOs cannot be measured without first adding observability.

---

## Error Budget Policy

| Budget Remaining | Action |
|-----------------|--------|
| > 50% | Normal development, feature work permitted |
| 25–50% | Increase monitoring frequency; review all deployments with a reliability lens |
| < 25% | Feature freeze; all engineering effort redirected to reliability items in this report |
| 0% | Full incident response posture; rollback last deployment; engage all owners |

---

## Failure Mode Analysis

### FM-1: Partial Write in completeTask — CRITICAL

**Location:** `lib/tasks.ts`, function `completeTask` (lines 215–308)

**Description:** `completeTask` executes up to nine sequential database writes and reads with no wrapping transaction:
1. `UPDATE tasks SET completedAt / nextDueDate`
2. `INSERT task_completions`
3. Read coins, `UPDATE users SET coins`
4. `UPDATE users SET level` (conditional)
5. `updateStreak` — reads, then `UPDATE users SET streakCurrent/streakMax/streakLastDate`
6. Count completions
7. `checkAndUnlockAchievements` — reads achievements, reads userAchievements, `INSERT user_achievements`

Any database error, network partition, pod crash, or OOM kill between steps leaves the user in a corrupt state. Example scenarios:

- Task marked complete (step 1) but coins never awarded (step 3 times out): user loses coins permanently.
- Coins awarded (step 3) but streak not updated (step 5 errors): streak counter drifts.
- `taskCompletions` row inserted (step 2) but task `completedAt` not set (step 1 errored halfway): completion log is an orphan.
- Level updated in DB (step 4) but the level check used stale coin data due to a read race with another concurrent completion.

**Detection:** Silent data corruption — no alert will fire. Only detected through user complaints or manual DB audit.

**Impact:** User-visible data inconsistency. Coins, streak, level, and achievement state may diverge from what is shown in the UI. In a multi-replica environment this is significantly more likely due to concurrent requests executing step 3 as a read-modify-write (not an atomic `coins + amount`).

**Mitigation needed:** Wrap the entire `completeTask` body in a Drizzle transaction. Replace the read-modify-write coin update with an atomic `SET coins = coins + $amount` SQL expression. Replace level update with `SET level = GREATEST(level, $newLevel)`.

---

### FM-2: Coins Read-Modify-Write Race — HIGH

**Location:** `lib/tasks.ts`, function `incrementUserCoins` (lines 383–401) and `decrementUserCoins` (lines 422–438)

**Description:** Both functions follow the pattern: SELECT coins, compute new value, UPDATE. Two concurrent completions for the same user will both read the same coin balance and one increment will be silently dropped. This is a classic lost-update race.

**Detection:** Silent. Visible only as inexplicably low coin totals.

**Impact:** Users who complete tasks quickly (or on multiple devices) lose coins. Affects gamification integrity.

**Mitigation needed:** Use `SET coins = coins + $amount` directly in the UPDATE statement, eliminating the SELECT.

---

### FM-3: selectDailyQuest TOCTOU Race — HIGH

**Location:** `lib/daily-quest.ts`, function `selectDailyQuest` (lines 117–222)

**Description:** The check-then-act sequence is:
1. Clear completed quests.
2. SELECT existing active quest — return if found.
3. Run priority algorithm (up to four queries).
4. `UPDATE tasks SET isDailyQuest = true` on the winning task.

Between steps 2 and 4, two concurrent requests for the same user (e.g., two browser tabs opening simultaneously) will both find no active quest and independently run the priority algorithm. They may select different tasks (especially in Priority 4 random selection) and both issue `UPDATE isDailyQuest = true`. The result is two tasks flagged as daily quest for the same user, which `getCurrentDailyQuest` (`LIMIT 1`) will mask — but the second task remains flagged indefinitely.

**Detection:** Silent. The user never sees the second task as "daily quest" because the query returns only one, but the `isDailyQuest` flag is left set permanently on the other task.

**Mitigation needed:** Use a DB-level advisory lock or a `SELECT FOR UPDATE` on the user row at the start of `selectDailyQuest` to serialize concurrent calls per user.

---

### FM-4: Memory Leak in In-Memory Rate Limiter — HIGH

**Location:** `lib/rate-limit.ts`, `store` Map (line 21)

**Description:** The `Map<string, RateLimitEntry>` grows without bound. Entries are only replaced when a request arrives for an expired key — they are never proactively evicted. In a long-running process with many distinct users, the map will grow indefinitely.

With 1,000 active users and rate-limit keys per route (e.g., `tasks-create:<userId>`), the map grows by ~100 bytes per entry per route. With 10 rate-limited routes × 1,000 users = 10,000 entries. For 10,000 users this becomes 100,000 entries. Each entry holds two numbers (~16 bytes) plus the string key (~30–60 bytes). At scale this is measurable memory pressure.

**Detection:** Pod memory utilization increasing monotonically over time; K8s OOMKill events; container restart loop.

**Impact:** Pod memory limit (512Mi in deployment.yaml) may be reached. K8s will OOMKill and restart the pod, clearing the rate limiter state — which also resets all windows, allowing bursts immediately after restart.

**Mitigation needed:** Add a periodic sweep (e.g., `setInterval` every 5 minutes) that removes entries where `resetAt < Date.now()`. Or migrate to a Redis-based rate limiter, which also resolves the multi-replica issue (FM-5).

---

### FM-5: Rate Limiter Not Effective Across Replicas — HIGH

**Location:** `lib/rate-limit.ts`; `deploy/examples/deployment.yaml` specifies `replicas: 2`

**Description:** The rate limiter store is in-process memory. With two replicas, each pod has an independent store. A user can make `limit * 2` requests before being rate-limited across the two pods (with a load balancer distributing evenly). This makes the rate limiter ineffective against determined abuse at the network level.

**Detection:** No detection — API mutation routes appear to accept more requests than the configured limit.

**Impact:** Abuse-resilience degraded to approximately half the intended limit. A user can create twice as many tasks per window than allowed. All mutation endpoints that rely on `checkRateLimit` are affected.

**Mitigation needed:** Replace with Redis-backed rate limiting. If Redis is not available, accept single-replica deployment or use a sticky session load balancer (not recommended for reliability).

---

### FM-6: sendStreakReminders Full Table Scan — MEDIUM

**Location:** `lib/push.ts`, function `checkCompletedToday` (lines 309–335) called from `sendStreakReminders`

**Description:** `checkCompletedToday` issues two unfiltered queries to `task_completions` per user — both load ALL completion rows for that user with no date filter, then filter in JavaScript. For a user with 365+ completions (one year of daily use), each call loads hundreds of rows. `sendStreakReminders` calls this once per eligible user, serialized in a for-loop.

Additionally, there is a logic flaw: the first query on line 264–272 already checks `isNotNull(taskCompletions.completedAt)` but the actual `todayStart` filter is applied only in `checkCompletedToday` — the early-exit check `completionsToday.length > 0` on line 276 will be true for any user who has ever completed a task, so it is not an early exit for "has completed today" — it is an early exit for "has ever completed anything." The real today-check is always deferred to `checkCompletedToday`.

The net result: for N users with active streaks, the cron run issues 3N queries, two of which are full table scans on `task_completions` per user.

**Detection:** Cron endpoint takes progressively longer as users accumulate completions; may time out for large user bases.

**Impact:** Cron run duration O(N × completions). At 100 users with 200 completions each, this is 20,000 rows fetched per run. At 1,000 users, the cron may exceed request timeout limits.

**Mitigation needed:** Add a date filter to the `task_completions` query using `gte(taskCompletions.completedAt, todayStart)`. Add an index on `(user_id, completed_at)` in the schema.

---

### FM-7: nextDueDate Never Set at Task Creation — MEDIUM

**Location:** `lib/tasks.ts`, function `createTask` (lines 117–137)

**Description:** When creating a `RECURRING` task, `nextDueDate` is not set. It defaults to `null`. The daily quest algorithm in `selectDailyQuest` Priority 3 uses `isNotNull(tasks.nextDueDate)` as a filter condition. A newly created recurring task will therefore never appear in the daily quest pool via the recurring path until it has been completed at least once (which sets `nextDueDate`).

**Detection:** Silent — users who create recurring tasks and expect them to appear as daily quests will never see them. No error is thrown.

**Impact:** Recurring tasks are effectively invisible to the daily quest algorithm until the first manual completion. This is a behavioral bug that degrades the core feature for new users who create recurring tasks.

**Mitigation needed:** In `createTask`, when `input.type === "RECURRING"`, set `nextDueDate` to the current date (making it immediately due) or to `input.dueDate` if provided.

---

### FM-8: Database Unavailability — CRITICAL

**Location:** All API routes, all lib functions

**Description:** Every API route makes one or more synchronous database queries. There is no circuit breaker, no read-replica fallback, no cached response for read-only data. If the database becomes slow or unavailable:
- All API routes return 500 errors.
- The health check at `/api/health` returns 200 (it has no DB dependency check), so K8s readiness probes continue to pass and traffic keeps routing to the pod.
- No database connection pool exhaustion handling is visible — the pg driver defaults may allow unbounded connection creation under high concurrency.

**Detection:** 5xx spike visible in logs; health check misleadingly healthy.

**Impact:** Complete functional outage from the user's perspective. K8s readiness probe does not reflect true service health.

**Mitigation needed:**
1. Add a database connectivity check to `/api/health` (e.g., `SELECT 1`). If the DB is unreachable, return 503 — this will remove the pod from service.
2. Set explicit pool size limits on the Drizzle/pg connection pool to prevent connection exhaustion.
3. Consider a short in-memory cache for the user stats read (coins, streak, level) on the dashboard to allow degraded-mode rendering.

---

### FM-9: Cron Endpoints Have No Idempotency or Retry Safety — MEDIUM

**Location:** `app/api/cron/daily-quest/route.ts`, `app/api/cron/streak-reminder/route.ts`

**Description:** Both cron routes call fan-out functions that push notifications to all eligible users. If the cron scheduler retries on HTTP 5xx (which most schedulers do), or if the cron fires twice in the same window due to a scheduling misconfiguration, users will receive duplicate notifications. There is no "already notified this window" guard in the push logic — `sendDailyQuestNotifications` has no check for whether a notification was already sent today.

**Detection:** User complaints about duplicate notifications.

**Impact:** User experience degradation; potential unsubscription from push notifications; streak reminders arriving multiple times.

**Mitigation needed:** Add a `lastNotifiedAt` timestamp column to the `users` table (or a separate `notification_log` table). Skip users already notified within the current cron window. This also makes cron retries safe.

---

### FM-10: CRON_SECRET is Optional — MEDIUM

**Location:** `app/api/cron/daily-quest/route.ts` line 19–29; `app/api/cron/streak-reminder/route.ts` same pattern

**Description:** If `CRON_SECRET` is not set in the environment, the auth check is skipped entirely and the endpoint is publicly callable with no authentication. An unauthenticated caller can trigger mass push notifications to all users at arbitrary frequency.

**Detection:** Spike in push delivery metrics; user complaints about unexpected notifications.

**Impact:** Notification spam to all subscribers; potential upstream push service rate limiting or account suspension.

**Mitigation needed:** Make `CRON_SECRET` a required environment variable in `lib/env.ts`. Remove the conditional check; always enforce it.

---

### FM-11: Health Check Does Not Reflect Real Service Health — MEDIUM

**Location:** `app/api/health/route.ts`

**Description:** The health endpoint returns `{ status: "ok" }` unconditionally. It performs no database ping, no dependency check, and no validation that the application can actually serve user traffic. K8s liveness and readiness probes both target this endpoint. This means:
- A pod with a broken database connection will appear healthy.
- A pod with an exhausted connection pool will appear healthy.
- Rolling deployments will proceed even if the new pod cannot reach the database.

**Detection:** Users see 500 errors while K8s reports all pods healthy.

**Impact:** K8s does not take remediation action (restart, drain) when the real failure mode occurs. This significantly extends the blast radius of any database-related incident.

---

### FM-12: No DB Transaction Wrapping in uncompleteTask — MEDIUM

**Location:** `lib/tasks.ts`, function `uncompleteTask` (lines 320–371)

**Description:** Similar to FM-1, `uncompleteTask` executes three sequential writes with no transaction:
1. `UPDATE tasks SET completedAt = null`
2. SELECT + DELETE the most recent task_completion row
3. `decrementUserCoins`

If step 3 fails, the task is marked incomplete but the coins are not deducted. The user effectively gets to un-complete a task for free, keeping their coins.

**Detection:** Silent data inconsistency.

**Impact:** Coin balance inflation over time for users who frequently use undo.

---

### FM-13: Streak Update Race Condition in gamification.ts — MEDIUM

**Location:** `lib/gamification.ts`, function `updateStreak` (lines 201–253)

**Description:** `updateStreak` reads the current streak state, computes the new state, then writes it — a read-modify-write without a transaction or row lock. Two concurrent `completeTask` calls (e.g., user completes two tasks in rapid succession) will both read the same streak state and both increment. One write will silently overwrite the other. While the practical impact is limited (both writes produce the same increment for the same day), the streak date and max could diverge under edge-case timing.

---

### FM-14: Push Subscription Stored as Untyped JSONB — LOW

**Location:** `lib/db/schema.ts` line 114: `pushSubscription: jsonb("push_subscription")`

**Description:** The `pushSubscription` column is `jsonb` with no schema validation at the database level. The code casts it with `user.pushSubscription as PushSubscriptionData` (lib/push.ts lines 194, 282). If malformed data is stored (e.g., from a migration error or direct DB manipulation), the cast succeeds silently and `webpush.sendNotification` will throw an untyped error that is caught and counted as `failed`. No alert fires.

**Detection:** Elevated `failed` count in cron response body — but cron response is not monitored.

---

### FM-15: next-pwa v5 is Unmaintained — LOW (dependency risk)

**Location:** `package.json` line 19: `"next-pwa": "^5.6.0"`

**Description:** `next-pwa` v5 has not received updates since 2022. It has known CVEs in its transitive dependency tree (workbox). It is also incompatible with Next.js App Router and may break on Next.js major version upgrades. The last npm audit may surface high-severity vulnerabilities.

**Detection:** `npm audit` output; CVE feeds.

**Impact:** Potential XSS or cache poisoning vectors through the service worker. Degraded PWA functionality with future Next.js upgrades.

**Mitigation needed:** Replace with `@ducanh2912/next-pwa` (maintained fork) or implement a manual service worker registration. Run `npm audit` as a blocking CI step.

---

### FM-16: No lint or typecheck gate before Docker build in CI — HIGH

**Location:** `.github/workflows/build-and-publish.yml`

**Description:** The CI workflow proceeds directly from `checkout` to Docker build. There is no `npm run lint`, no `tsc --noEmit`, and no `npm audit` step. TypeScript type errors or lint violations are only caught if the `next build` step inside Docker fails — and `next build` does not always fail on type errors depending on `tsconfig` settings. Runtime type errors could be shipped to production.

**Detection:** Broken production deployment; user-visible errors.

**Impact:** Reduces confidence in every push to `main`. Increases mean time to detect regressions.

**Mitigation needed:** Add pre-build job steps:
```yaml
- name: Install dependencies
  run: npm ci
- name: Lint
  run: npm run lint
- name: Type check
  run: npx tsc --noEmit
- name: Security audit
  run: npm audit --audit-level=high
```

---

## Graceful Degradation

### Current State

There is no graceful degradation implemented. All API routes are fully dependent on the database. Push notifications degrade gracefully (VAPID not configured = silent skip), which is the only implemented degradation path.

### Recommended Degradation Tiers

| Tier | Trigger | Behavior |
|------|---------|----------|
| DB slow (> 500ms avg) | P99 latency alert | Read-only: disable mutation routes, serve cached dashboard data |
| DB down | Health check DB ping fails | 503 on all API routes; static maintenance page served by CDN/ingress |
| Push service unavailable | webpush.sendNotification throws non-410 errors | Count failures; skip retry; log for manual review |
| OOM pressure | Memory > 400Mi | Rate limiter eviction runs aggressively; disable lowest-priority background operations |

---

## Monitoring and Alerting

### Current State

No application-level instrumentation exists. Observability relies entirely on:
- Docker Compose: `docker compose logs -f app`
- Kubernetes: `kubectl logs` and `kubectl describe pod`
- Health probe responses (which do not check DB as described in FM-11)

### Recommended Additions

**Structured logging:**
- All API route handlers should log `{ method, path, userId, duration_ms, status }` on every request.
- Database errors should log `{ query, error, userId, duration_ms }`.
- Push delivery should log `{ userId, tag, status, duration_ms }`.

**Metrics (Prometheus or equivalent):**
- `http_requests_total{method, path, status}` counter
- `http_request_duration_seconds{method, path}` histogram
- `task_completions_total{userId}` counter
- `push_notifications_total{tag, result}` counter
- `rate_limit_store_size` gauge (to detect FM-4)
- `db_pool_connections{state}` gauge

**Alerts:**
- 5xx rate > 1% for 5 minutes: page on-call
- P99 latency > 2s for 5 minutes: page on-call
- DB health check failing: immediate page
- Pod restart count > 2 in 10 minutes: OOMKill investigation
- Push failed rate > 20% in a cron run: notify

**Dashboards:**
- API error rate and latency by route
- Task completion rate over time (user engagement)
- Push notification delivery rate per cron run
- Memory utilization per pod (watch for FM-4)
- DB connection pool utilization

---

## Rollback Safety

### Current State

The CI pipeline builds and pushes `ghcr.io/jp1337/momo:main` on every push to `main`. This tag is overwritten on each push. The K8s deployment uses `imagePullPolicy: Always` with `image: ghcr.io/jp1337/momo:latest`.

**Rollback risks:**
1. The `latest` tag makes rollback unsafe — running `kubectl rollout undo` will re-pull `latest`, which is the broken image.
2. No database migration rollback strategy is documented. If a push includes a schema migration and a code rollback is performed, the old code may be incompatible with the new schema.
3. There is no staging environment. All pushes to `main` go directly to production.

**Mitigation needed:**
1. Deploy using the SHA-tagged image (e.g., `ghcr.io/jp1337/momo:sha-abc1234`) rather than `latest`. The CI workflow already produces SHA tags.
2. Document database migration rollback procedures in `docs/deployment.md`.
3. Consider a pre-production environment (even a single Docker Compose instance) for smoke testing before updating the K8s deployment.

---

## CI/CD Pipeline Gaps Summary

| Gap | Severity | File |
|-----|----------|------|
| No lint step before Docker build | HIGH | build-and-publish.yml |
| No TypeScript typecheck step | HIGH | build-and-publish.yml |
| No `npm audit` security gate | MEDIUM | build-and-publish.yml |
| No test step (no tests exist) | HIGH | build-and-publish.yml |
| `latest` tag used in K8s deployment | HIGH | deployment.yaml |
| No smoke test after deploy | MEDIUM | build-and-publish.yml |
| CRON_SECRET not validated as required in env | MEDIUM | lib/env.ts |

---

## Action Items

| Priority | ID | Action | Owner | Area |
|----------|-----|--------|-------|------|
| P0 | AI-01 | Wrap `completeTask` body in a Drizzle transaction | dev | lib/tasks.ts |
| P0 | AI-02 | Replace read-modify-write coin updates with atomic SQL `coins + $amount` | dev | lib/tasks.ts |
| P0 | AI-03 | Add DB ping to `/api/health` — return 503 if DB is unreachable | dev | app/api/health/route.ts |
| P1 | AI-04 | Add `SELECT FOR UPDATE` or advisory lock to `selectDailyQuest` | dev | lib/daily-quest.ts |
| P1 | AI-05 | Add date filter to `task_completions` query in `checkCompletedToday` | dev | lib/push.ts |
| P1 | AI-06 | Set `nextDueDate` at RECURRING task creation in `createTask` | dev | lib/tasks.ts |
| P1 | AI-07 | Add memory eviction to rate-limit store (sweep expired entries) | dev | lib/rate-limit.ts |
| P1 | AI-08 | Add lint + typecheck + npm audit steps to CI workflow | dev | .github/workflows/build-and-publish.yml |
| P1 | AI-09 | Make `CRON_SECRET` required in `lib/env.ts` | dev | lib/env.ts |
| P1 | AI-10 | Wrap `uncompleteTask` in a Drizzle transaction | dev | lib/tasks.ts |
| P2 | AI-11 | Add `lastNotifiedAt` to users table; make cron endpoints idempotent | dev | lib/push.ts, lib/db/schema.ts |
| P2 | AI-12 | Replace `latest` K8s image tag with SHA-pinned tag | dev | deploy/examples/deployment.yaml |
| P2 | AI-13 | Replace or update `next-pwa` (unmaintained, CVEs) | dev | package.json |
| P2 | AI-14 | Add structured request logging to all API route handlers | dev | app/api/ |
| P2 | AI-15 | Add Prometheus metrics instrumentation | dev | lib/, app/api/ |
| P3 | AI-16 | Migrate rate limiter to Redis for multi-replica correctness | dev | lib/rate-limit.ts |
| P3 | AI-17 | Document DB migration rollback procedure | dev | docs/deployment.md |
| P3 | AI-18 | Add `(user_id, completed_at)` index to `task_completions` | dev | lib/db/schema.ts |

---

## Risk Heat Map

```
          Impact
          LOW    MEDIUM   HIGH   CRITICAL
LIKELY  |       | FM-4  | FM-5 | FM-1 FM-2 |
        |       | FM-9  | FM-16|           |
POSSIBLE|FM-14  | FM-6  | FM-3 | FM-8      |
        |       | FM-10 |      |           |
UNLIKELY|FM-15  | FM-11 | FM-13|           |
        |       | FM-12 |      |           |
```

**Immediate risk (Likely + Critical/High):** FM-1 (partial writes), FM-2 (coin race), FM-5 (rate limiter multi-replica), FM-16 (no CI gates)

---

## Appendix: Key File Locations

- `/home/jpylypiw/projects/momo/lib/tasks.ts` — task CRUD, completeTask (FM-1, FM-2, FM-7, FM-12)
- `/home/jpylypiw/projects/momo/lib/push.ts` — push notifications, sendStreakReminders (FM-6, FM-9, FM-14)
- `/home/jpylypiw/projects/momo/lib/rate-limit.ts` — in-memory rate limiter (FM-4, FM-5)
- `/home/jpylypiw/projects/momo/lib/daily-quest.ts` — daily quest selection (FM-3, FM-7)
- `/home/jpylypiw/projects/momo/lib/gamification.ts` — streak, coins, achievements (FM-13)
- `/home/jpylypiw/projects/momo/lib/db/schema.ts` — database schema (FM-14, AI-18)
- `/home/jpylypiw/projects/momo/app/api/health/route.ts` — health check (FM-11, AI-03)
- `/home/jpylypiw/projects/momo/app/api/cron/daily-quest/route.ts` — cron auth (FM-10)
- `/home/jpylypiw/projects/momo/app/api/cron/streak-reminder/route.ts` — cron auth (FM-10)
- `/home/jpylypiw/projects/momo/deploy/examples/deployment.yaml` — K8s manifest (FM-5, AI-12)
- `/home/jpylypiw/projects/momo/.github/workflows/build-and-publish.yml` — CI pipeline (FM-16, AI-08)
- `/home/jpylypiw/projects/momo/docker-compose.yml` — local/single-host deployment
