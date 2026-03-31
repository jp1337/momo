# Full Review Summary: Momo (alle Phasen 1–8)

**Review Date:** 2026-03-31
**Reviewed By:** Claude Code Review System
**Codebase:** ~11.000 Zeilen TypeScript

## Levels Completed
- [x] L1: Peer Review
- [x] L2: Architecture Review
- [x] L3: Security Review
- [x] L4: Reliability Review

---

## Blocking Issues (Must Fix)

| Level | Issue | Location | Severity |
|-------|-------|----------|----------|
| L1/L2/L3/L4 | **Race condition in `completeTask`** — 9 DB-Operationen ohne Transaktion. Coins können doppelt vergeben oder nicht abgezogen werden. Coins-Increment als Read-Modify-Write statt atomarem `SET coins = coins + N`. | `lib/tasks.ts` | BLOCKING |
| L1/L3 | **Cron-Endpoints offen wenn `CRON_SECRET` nicht gesetzt** — `if (cronSecret)` Guard greift nicht wenn Variable leer. Jeden kann Push-Fan-out an alle User triggern. | `app/api/cron/*/route.ts` | BLOCKING |
| L1/L3 | **Admin-Seed-Endpoint für alle User zugänglich** — Jeder eingeloggte User kann `POST /api/admin/seed` aufrufen. | `app/api/admin/seed/route.ts` | BLOCKING |
| L4 | **Health-Check prüft keine DB-Verbindung** — K8s Liveness/Readiness Probe gibt 200 zurück, auch wenn DB down ist. Pod wird nie aus dem Service entfernt. | `app/api/health/route.ts` | BLOCKING |
| L2/L4 | **TOCTOU Race in `selectDailyQuest`** — Zwei gleichzeitige Requests können unterschiedliche Quests setzen. Ein Task bleibt dauerhaft mit `isDailyQuest=true` markiert. | `lib/daily-quest.ts` | BLOCKING |
| L3 | **CVE in `next-pwa` v5** — `serialize-javascript` CVSS 8.1 RCE, Package unmaintained. | `package.json` | BLOCKING |

---

## Non-Blocking Issues (Should Fix)

| Level | Issue | Location | Priority |
|-------|-------|----------|----------|
| L1/L4 | `sendStreakReminders` lädt alle Completion-Rows ohne Datum-Filter — Full Table Scan | `lib/push.ts` | HIGH |
| L4 | Memory-Leak im Rate-Limiter — Map wächst unbegrenzt, wird nie evicted | `lib/rate-limit.ts` | HIGH |
| L2/L4 | Rate-Limiter in-memory: bei 2 K8s-Replicas ist effektives Limit 2× | `lib/rate-limit.ts` | HIGH |
| L2/L4 | `nextDueDate` wird bei Task-Erstellung nicht gesetzt — RECURRING Tasks tauchen nie in Daily Quest auf bis zur ersten manuellen Erledigung | `lib/tasks.ts`, `lib/daily-quest.ts` | HIGH |
| L3 | Raw `Error.message` wird in 12 API-Routen an den Client weitergegeben — DB-Fehlermeldungen sichtbar | `app/api/*/route.ts` | HIGH |
| L3 | `POST /api/push/test` hat kein Rate-Limiting — VAPID-Quota erschöpfbar | `app/api/push/test/route.ts` | MEDIUM |
| L3 | Cron-Secret-Vergleich mit `!==` statt `crypto.timingSafeEqual` — Timing-Attack | `app/api/cron/*/route.ts` | MEDIUM |
| L3 | Push-Subscription-Endpoint validiert `endpoint`-URL nicht — SSRF-Vektor | `app/api/push/subscribe/route.ts` | MEDIUM |
| L3 | CSP enthält `unsafe-eval` + `unsafe-inline` in Production | `next.config.ts` | MEDIUM |
| L2 | Kein `UNIQUE(user_id, achievement_id)`-Constraint in DB | `lib/db/schema.ts` | MEDIUM |
| L2 | `getUserStats` liegt in `lib/daily-quest.ts` — falsche Zuordnung | `lib/daily-quest.ts` | LOW |
| L2/L4 | Kein CI-Gate für `tsc --noEmit` + ESLint vor Docker-Build | `.github/workflows/` | LOW |
| L4 | Cron-Endpoints ohne Idempotenz-Guard — Doppel-Trigger sendet doppelte Notifications | `app/api/cron/*/route.ts` | LOW |

---

## Empfehlungen (Priorisiert)

1. **Transaktion in `completeTask`** — Drizzle `db.transaction()` um alle 9 DB-Operationen. Coin-Increment mit `SET coins = coins + $n` ohne vorherigen SELECT.
2. **Cron-Guard umkehren** — `if (!cronSecret || token !== cronSecret) return 401` statt opt-in.
3. **Admin-Seed einschränken** — Auf `NODE_ENV === 'development'` oder echten Admin-Check beschränken.
4. **Health-Check mit DB-Ping** — `SELECT 1` in `/api/health`, 503 bei Fehler.
5. **`next-pwa` ersetzen** — Mit `@ducanh2912/next-pwa` (aktiver Fork) oder `@serwist/next`.
6. **`nextDueDate` bei Task-Erstellung setzen** — Wenn `type === RECURRING`: `nextDueDate = dueDate ?? today`.
7. **Error-Messages sanitieren** — Generische `"Internal server error"` statt `err.message` für unerwartete Fehler.
8. **CI-Lint-Gate** — `tsc --noEmit` + `eslint` als Required Check vor Build.
9. **Rate-Limiter eviction** — `store`-Map periodisch bereinigen (z.B. in `setInterval`).
10. **UNIQUE-Constraint** — `user_achievements(user_id, achievement_id)` in DB-Schema.

---

## Verdict

**⚠ CHANGES REQUESTED** — 6 Blocking-Issues müssen vor dem nächsten Production-Deployment behoben werden. Die kritischste ist die fehlende Transaktion in `completeTask` (Datenkorrektheit) und die offenen Cron-Endpoints (Security).

---

## Report Links
- L1: `.claude/reports/review/L1-peer-20260331.md`
- L2: `.claude/reports/review/L2-arch-20260331.md`
- L3: `.claude/reports/security/L3-security-20260331.md`
- L4: `.claude/reports/sre/L4-reliability-20260331.md`
