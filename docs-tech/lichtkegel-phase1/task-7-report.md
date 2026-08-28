# Task 7 report — Mitgeführte Bugs II: der Versions-Defekt

Commit: `7b44a01` on `design/lichtkegel-impl`.

## What changed, per file, and why

- **`lib/update-status.ts`** (new). `export type UpdateStatus = "disabled" | "failed" | "unknown" | "current" | "outdated"` and `updateStatus(r)`, exactly as specified in the brief. Single decision point so the UI (and any future consumer) can no longer collapse "unknown" into "current" by accident.

- **`__tests__/update-status.test.ts`** (new). The five brief cases verbatim.

- **`lib/update-checker.ts`**. The `fetch()` call to the GitHub releases API now sends `cache: "no-store"` instead of `next: { revalidate: 86400 }`. Removes the second cache layer (Next Data Cache) that sat on top of the existing 24h module-level cache and could serve a stale response re-stamped with a fresh `checkedAt`. File header comment explains the one-cache-layer decision; the `fetch()` call carries the full brief comment explaining the stale-while-revalidate mechanism.

- **`__tests__/update-checker.test.ts`**. Added the `describe("checkForUpdates: eine Cache-Schicht, kein zweiter Boden", …)` block with the two brief cases, **plus a `beforeEach(() => vi.resetModules())` / `afterEach(() => vi.unstubAllGlobals())`** I added beyond the brief's literal text. Reason: without it, the new describe block inherits the *already-imported* module instance from the preceding `describe("checkForUpdates with DISABLE_UPDATE_CHECK", …)` block — whose last test does `vi.resetModules()` **before** importing with `DISABLE_UPDATE_CHECK=true` baked into the module closure, then only deletes the env var afterward without a further `resetModules()`. Dynamic `import()` inside a single Vitest test file returns the cached module unless explicitly reset, so the new tests silently inherited `disabled: true` and never called `fetch` at all — a `TypeError` on `fetchMock.mock.calls[0][1]`, not the RED the brief describes. This is a pre-existing test-isolation bug uncovered by adding these tests, not a change to the produced interfaces; I fixed it as the minimal correction needed for the new tests to test what they claim. See RED output below — with the fix, the failure is exactly the one the brief predicts (`revalidate: 86400` received where `undefined` was expected).

- **`__tests__/api-misc-route.test.ts`** (R21, my addition, not in the brief). Extended `describe("GET /api/health")`'s first test: renamed to `"returns 200 with { status: ok, version, timestamp, cron } — no auth required"`, added `import pkg from "../package.json"` and three assertions — `typeof body.version === "string"`, non-empty, and `body.version === pkg.version`. Reasoning is inline as a comment in the test (the field is what the new CI rollout-verification step reads).

- **`app/api/health/route.ts`**. Imports `CURRENT_VERSION` from `@/lib/update-checker`, adds `version: CURRENT_VERSION` to the success response, and documents why in both the route-level JSDoc and the return-shape line.

- **`app/(app)/admin/page.tsx`** (version block only — rest of the file untouched). Imports `updateStatus`, computes `const status = updateStatus(updateCheck)` right after the `Promise.all`, and switches all four existing branches to `status === "disabled" | "failed" | "current" | "outdated"`. Added the fifth branch for `status === "unknown"` after the failed branch, using Tailwind classes with `var(--radius-md)`, `var(--ink-3)`, `var(--ink-2)` (existing design tokens, verified present in `app/globals.css`) rather than inline styles — this is why the design-token ratchet count did not rise even though a new UI block was added. The "current" branch's text now reads `Momo ist aktuell — v{updateCheck.latestVersion} ist die neueste Version.` so the claim is checkable against the shown number, per the brief.

- **`.github/workflows/build-and-publish.yml`**. Added `Verify the rollout actually happened` step after the existing `Trigger Watchtower update` step in the `deploy` job, unchanged Watchtower step. **Deviates from the brief on the URL source (R22, instructed, not re-argued):** `APP_URL: ${{ vars.ROLLOUT_HEALTH_URL || vars.NEXT_PUBLIC_APP_URL || 'https://momotask.app' }}` instead of the brief's `vars.NEXT_PUBLIC_APP_URL || 'https://momotask.app'`. Comment above the step explains the precedence and what to set `ROLLOUT_HEALTH_URL` to if the self-hosted intranet runner can't reach the public URL. Step remains blocking (no `continue-on-error`, no `if: false`-style bypass).

- **`docs-site/deployment.md`**. Added a new `## Health Endpoint` section (no prior section existed to extend — `/api/health` was previously only mentioned in passing for the Docker HEALTHCHECK and Kubernetes probes) with the brief's field table, plus two extra paragraphs explaining the rollout-verification consumer and the `ROLLOUT_HEALTH_URL` override (not asked for by the brief, but load-bearing given R22 — a variable with no documented meaning is worse than the defect this task fixes).

- **`CHANGELOG.md`**. Brief's `### Fixed` entry added at the top of the existing `[Unreleased] → ### Fixed` block.

## RED — before the fix

Command: `npm test -- update-status update-checker api-misc-route` (before any production code was written, tests already in place):

```
❯ __tests__/update-checker.test.ts (18 tests | 1 failed) 376ms
     × fragt GitHub ohne Next-Data-Cache — sonst ist die Antwort einen Besuch alt
❯ __tests__/update-status.test.ts (0 test)
❯ __tests__/api-misc-route.test.ts (11 tests | 1 failed) 296ms
     × returns 200 with { status: ok, version, timestamp, cron } — no auth required

FAIL  __tests__/update-status.test.ts [ __tests__/update-status.test.ts ]
Error: Cannot find package '@/lib/update-status' imported from .../__tests__/update-status.test.ts

FAIL  __tests__/api-misc-route.test.ts > GET /api/health > returns 200 with { status: ok, version, timestamp, cron } — no auth required
AssertionError: expected 'undefined' to be 'string'
Expected: "string"
Received: "undefined"
 ❯ __tests__/api-misc-route.test.ts:57:33
   expect(typeof body.version).toBe("string");

FAIL  __tests__/update-checker.test.ts > checkForUpdates: eine Cache-Schicht, kein zweiter Boden > fragt GitHub ohne Next-Data-Cache — sonst ist die Antwort einen Besuch alt
AssertionError: expected 86400 to be undefined
- Expected: undefined
+ Received: 86400
 ❯ __tests__/update-checker.test.ts:220:35
   expect(init.next?.revalidate).toBeUndefined();

Test Files  3 failed (3)
     Tests  2 failed | 27 passed (29)
```

This is the RED the task requires: `update-status.ts` doesn't exist yet, `body.version` is `undefined` against the unmodified route, and — the load-bearing one — `init.next.revalidate` is **86400** (not `undefined`) against the unmodified `lib/update-checker.ts`, proving the test actually exercises the current two-cache-layer bug before any fix is applied. (Before I added the `vi.resetModules()`/`vi.unstubAllGlobals()` guard described above, this same run instead failed both new `update-checker.test.ts` cases with a `TypeError` from cross-describe module-cache pollution — not the stated reason — which is why that guard was added; see explanation above.)

`checkedAt stammt aus dem erfolgreichen Abruf, nicht aus dem Aufruf` was already green even pre-fix, since the module-level cache mechanism it tests was not itself broken — only the second (Next Data) cache layer was.

## GREEN — after the fix

```
npm test -- update-status update-checker api-misc-route

 Test Files  3 passed (3)
      Tests  34 passed (34)
   Start at  10:44:54
   Duration  3.02s
```

All 34 tests pass, including the two new `update-checker` cases and the extended `api-misc-route` health test.

## Other verification commands

```
$ npx tsc --noEmit
(no output — success)

$ npm run lint
✖ 11 problems (0 errors, 11 warnings)
```
All 11 warnings are pre-existing `react-hooks/set-state-in-effect` / `jsx-a11y` warnings in files I did not touch (`components/settings/push-devices-section.tsx`, `components/settings/timezone-settings.tsx`, `components/tasks/task-form.tsx`, `components/topics/topic-form.tsx`, `components/ui/checkbox.tsx`, `components/wishlist/wishlist-form.tsx`, plus one auth-related file). None reference `admin/page.tsx`, `update-checker.ts`, `update-status.ts`, or `health/route.ts`. Zero errors.

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 2205 Verstoesse, keiner neu.
```
Unchanged from the stated baseline of 2205 — the new "unknown" block uses `var(--radius-md)`/`var(--ink-2)`/`var(--ink-3)` via Tailwind arbitrary values, not inline styles, so it added zero violations.

```
$ npm run check:i18n
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1025 translation key references across source files.
✓ All translation keys are present in every language file.
```
The admin page is German-only by existing file convention (per the task's stated repository fact); no i18n keys were touched.

```
$ python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/build-and-publish.yml')); print('YAML OK')"
YAML OK
```

```
$ curl -s localhost:3000/api/health | jq .
{
  "status": "ok",
  "version": "0.6.0",
  "timestamp": "2026-08-27T08:34:12.821Z",
  "cron": { "lastRunAt": null, "minutesSinceLastRun": null }
}
```
Matches the running dev server's `package.json` version (`0.6.0`).

## Admin page in Chrome

The always-running dev server has `DISABLE_UPDATE_CHECK=true` and no `ADMIN_USER_IDS` set locally, so neither the update-check nor admin access was directly observable through the browser extension as-is. To verify the "current" branch renders for real, I:

1. Seeded a session for the project's own E2E test user (`e2e@momotest.local`) via the existing `e2e/global.setup.ts` helper against the dev DB (`postgresql://momo:password@localhost:5432/momo` — the same DB the running dev server uses), exactly as the Playwright test suite already does.
2. Temporarily set `ADMIN_USER_IDS=<that user's id>` and `DISABLE_UPDATE_CHECK=false` in `.env.local` (gitignored, not committed) so `checkForUpdates()` made a real GitHub API call.
3. Wrote a throwaway Playwright spec (deleted afterward, never committed) that reused the seeded auth state, navigated to `/admin`, and screenshotted the version block.
4. Restored `.env.local` to its original committed-nowhere state immediately after, and deleted the throwaway spec + screenshots. Did not touch the running dev server process itself (no start/stop).

Result: the real GitHub API returned `0.6.0` as latest (matching `CURRENT_VERSION`), so the "current" branch rendered — confirming both the code path and the new copy:

> ✓ Momo ist aktuell — v0.6.0 ist die neueste Version.  Geprüft: 10:41

Layout: icon + text + right-aligned "Geprüft" timestamp in the green pill, consistent spacing with the rest of the Version card and the page below it (Systemweite Statistiken cards). No visual regression versus the pre-change layout for the branches that were already correct (verified against the full-page screenshot).

I did not attempt to force the `disabled`/`failed`/`unknown`/`outdated` branches through the browser (would require either mocking the GitHub API from a live network call or further env/DB juggling) — the task only required verifying "at least the current state," which is done. The `unknown` and other four branches are covered by the Vitest unit tests in `__tests__/update-status.test.ts` instead.

## The workflow step — could not be executed, per instructions

`Verify the rollout actually happened` was not run (no `act`, no `gh workflow run`, no push). Verified only: YAML parses (above), the step is syntactically consistent with the surrounding job (same `env:`/`run:` shape as the brief's original), and it doesn't touch secrets. Its first real test is its first run on `main`, as the brief states.

## Self-review — things I'm not fully certain about

1. **`vi.resetModules()`/`vi.unstubAllGlobals()` addition to `update-checker.test.ts`.** This is the one place I deviated from the brief's literal test code. I'm confident it's necessary (documented and reproduced the exact failure mode above) and that it doesn't change what the tests assert — but it is still my addition on top of "every code fragment in the brief is authoritative." If review disagrees with this call, the alternative is restructuring the whole file's `describe` ordering/env handling, which is a much larger, riskier diff for the same outcome.
2. **`docs-site/deployment.md` structure.** The brief says "im Abschnitt zum Health-Endpunkt" (in the section about the health endpoint) as if one already existed; it did not (grepped — only passing mentions in Docker/Kubernetes context). I created a new `## Health Endpoint` section rather than guessing at a differently-named existing one I might have missed. Worth a second look in review.
3. **`ROLLOUT_HEALTH_URL` fallback chain and documentation** (R22) — I could not test this against the actual self-hosted intranet runner; I only verified the YAML is syntactically valid and the precedence logic is what was specified. Whether `NEXT_PUBLIC_APP_URL` or a to-be-set `ROLLOUT_HEALTH_URL` is actually reachable from that runner is unverifiable from here, which is the whole reason the fallback exists — first real signal is the next `main` push.
4. **`app/(app)/admin/page.tsx` indentation** — the "Up to date" JSX block's inner indentation is now inconsistent by one level (kept the original multi-line-condition indentation after collapsing the condition to a single line, to keep the diff minimal and avoid touching unrelated lines in a file explicitly flagged as "don't clean up beyond the version block"). Cosmetic only, `npm run lint` and `npx tsc --noEmit` both pass.
5. **E2E test-user session left in the dev DB.** The `e2e@momotest.local` user + its session row exist in the dev (`momo`) database now, as a side effect of using the project's own auth-seeding helper for the Chrome verification. This is the same fixture every Playwright run creates/reuses already (`e2e/global.setup.ts` finds-or-creates it), so it's expected infrastructure, not stray test data — flagging it so it isn't mistaken for pollution from this task.

---

## Fix round 1 — R23/R24/R25 (the gate proves something now)

Review found the verification step compared `package.json`'s `version` — a value no workflow bumps — so on an ordinary `main` push it matched on attempt 1 whether or not Watchtower actually swapped the container. Plus four smaller defects (untested `jq` on the self-hosted runner, an unguarded `raw.githubusercontent.com` fetch, `unknown`-state overclaiming, doc wording that predated the fix). Ruling implemented: compare the commit SHA, baked into the image, not the version.

### Change per file, and why

- **`Dockerfile`** (runner stage, immediately before `ENV PORT=3000`, after `USER nextjs`/`EXPOSE 3000`): added
  ```dockerfile
  ARG MOMO_COMMIT=unknown
  ENV MOMO_COMMIT=${MOMO_COMMIT}
  ```
  Placed as the very last build instruction in the runner stage so nothing beneath the heavy `deps`/`builder` stages or the `COPY --from=builder/deps` layers depends on it. See desk-check below.

- **`.github/workflows/build-and-publish.yml`, `build` job, `Build and push by digest` step**: added `MOMO_COMMIT=${{ github.sha }}` to the existing `build-args:` block (both `linux/amd64` and `linux/arm64` matrix legs get it — it's not platform-scoped).

- **`app/api/health/route.ts`**: added `commit: process.env.MOMO_COMMIT ?? null` to both the 200 success response and (minor finding) the 503 error response, alongside `version: CURRENT_VERSION` — neither field needs the database, so both are now available even when the DB is down. Without this, a DB outage would have made the CI verify step read `?` for 30 attempts and print the *false* diagnosis "Watchtower hat die Anfrage angenommen, den Container aber nicht getauscht" when the real cause was the database. Updated the route's JSDoc to explain `commit`, why it (not `version`) is what CI compares, and why it's present on the error path.

- **The verify step** — rewritten to compare `commit` against `${{ github.sha }}`. Removed the `raw.githubusercontent.com` fetch of `package.json` entirely (no longer needed — `EXPECTED` was already `github.sha` from the `env:` block, now actually referenced). Removed the only unguarded `jq` dependency on the `[self-hosted, intranet]` runner — every other `jq` call in this workflow runs on GitHub-hosted runners, which ship `jq`; this one didn't have that guarantee. Parses `/api/health`'s JSON with `sed` instead:
  ```bash
  sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'
  ```
  Also fixed in the same step: `url="${APP_URL%/}"` strips a trailing slash from `ROLLOUT_HEALTH_URL` before building `$url/api/health` (previously `…//api/health` on a slash-terminated override); `sleep 20` is now guarded by `if [ "$attempt" -lt 30 ]` so it no longer runs after the final failed attempt. Kept: the three-level `ROLLOUT_HEALTH_URL` → `NEXT_PUBLIC_APP_URL` → `https://momotask.app` fallback, the blocking behavior (no `continue-on-error`), the 30-attempt bound, and the failure message's diagnosis (now naming a commit mismatch instead of a version mismatch).

- **`app/(app)/admin/page.tsx`** (version block only): the `unknown` branch now carries the same tinted-pill-with-border treatment as its four siblings — `border border-[var(--border)] bg-[var(--bg-elevated)]`, both existing tokens already used elsewhere in this file (`components/ui/input.tsx` uses the identical pair). Its comment now states plainly that it's defence-in-depth: no current producer of `UpdateCheckResult` emits `latestVersion: null` without also setting `disabled` or `error` (verified by reading `lib/update-checker.ts` end to end — there are exactly two `latestVersion: null` return sites, one gated on `disabled`, one setting `error`), so this branch guards a producer that doesn't exist yet. Also fixed, while in the file: the `status === "current"` block's children were indented one level too deep after a prior round collapsed its condition to a single line — re-indented, no logic change. Nothing else in this file was touched, per the brief's explicit scope limit.

- **`CHANGELOG.md`**, `### Fixed` entry: rewritten to (a) name the cache as the cause of the live defect explicitly — the stale-but-non-null `latestVersion` served by stale-while-revalidate landed in the "current" branch, that was what actually happened in production; (b) describe the `unknown`-as-"current" collapse as a second, *latent* path that never fired live, because no producer emits `null` without `disabled`/`error`; (c) state that 4 of 5 `UpdateStatus` values are reachable today, not all 5; (d) explain that the CI gate now compares `commit`, not `version`, and why a version comparison would have been meaningless (no workflow bumps it).

- **`docs-site/deployment.md`**: added `commit` to the `/api/health` field table with its build-arg provenance and `null`-in-dev meaning; added a line that `version`/`commit` are both present on the 503 response; rewrote the rollout-verification paragraph to say the comparison is against `commit`, not `version`, and why (matches what the step now actually does, per Finding 5).

- **`__tests__/update-checker.test.ts`**: added `describe("checkForUpdates: Cache-TTL-Grenzen", …)` with two tests using `vi.useFakeTimers()`/`vi.setSystemTime()`, restoring real timers in `afterEach` — did not touch the existing `beforeEach`/`afterEach` structure of any other block. Test 1 confirms a second call issued 24h+1s after the first refetches (module cache boundary). Test 2 confirms that after a fetch error, a call 6 minutes later already retries — pinning the `cachedAt` back-date at `lib/update-checker.ts:177` (`CACHE_TTL_MS - 5min`) that makes an error result eligible for retry within roughly 5 minutes instead of the full 24h.

- **`__tests__/api-misc-route.test.ts`**: extended the existing `/api/health` 200 test to also assert `commit` is present and is either `null` or a string (it's `null` in this unbuilt test environment, which is the documented-correct value, not a gap). Did not add a dedicated 503-path test for `version`/`commit` — that branch requires mocking `db.execute` to throw, which this DB-backed integration test file doesn't currently do for any route; adding that harness was out of scope for a code-level minor-finding fix. Flagging this as unverified by an automated test — see self-review below.

### Desk-check — the verify step's shell, three cases

```bash
set -euo pipefail
url="${APP_URL%/}"
for attempt in $(seq 1 30); do
  got="$(curl -sf "$url/api/health" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo '?')"
  if [ "$got" = "$EXPECTED" ]; then
    echo "Rollout bestaetigt nach ${attempt} Versuch(en): $got"
    exit 0
  fi
  echo "Versuch $attempt: laeuft Commit $got, erwartet $EXPECTED"
  if [ "$attempt" -lt 30 ]; then
    sleep 20
  fi
done
echo "Rollout nicht bestaetigt: ..."
echo "Watchtower hat die Anfrage angenommen, den Container aber nicht getauscht."
exit 1
```

1. **Commit matches on attempt 1.** `curl` returns the health JSON with `"commit":"<github.sha>"`, `sed` extracts it into `got`, `got = $EXPECTED` is true on the first loop iteration (`attempt=1`), the script echoes success and `exit 0` — never reaches the `sleep`. Correct.

2. **Commit never matches.** Every iteration's `got` differs from `$EXPECTED` (e.g. old container still running, or Watchtower never swapped it). The `if` body never runs. `for` counts `attempt` from 1 to 30; on `attempt=30` the guard `[ "$attempt" -lt 30 ]` is false, so the final `sleep 20` is **skipped** — the loop exits immediately after printing "Versuch 30: …". Control falls out of the `for` loop to the two `echo` lines and `exit 1`. Non-zero exit, no stray trailing sleep. Correct.

3. **`curl` fails transiently** (e.g. connection refused because the container is mid-restart). `curl -sf` exits non-zero, which makes the `curl | sed` pipeline exit non-zero (both parts run under `set -o pipefail`, inherited from `set -euo pipefail`). Without a guard this would abort the whole script under `-e`, because a failing command inside `$( … )` used as the right-hand side of an assignment still propagates its exit status to the enclosing `set -e` context. **The `|| echo '?'` neutralises `-e` for this one line**: bash evaluates the compound command `curl … | sed … || echo '?'` as a single "or list", and an or-list's exit status is that of the last command that ran — here `echo '?'`, which always succeeds (status 0) — so `set -e` sees a zero exit and does not abort. `got` becomes the literal string `?`, which fails the `[ "$got" = "$EXPECTED" ]` comparison, the attempt is logged, and the loop continues to the next `curl` after a `sleep 20` (attempt < 30, so the sleep runs). Retries, does not abort. Correct.

### Desk-check — Dockerfile layer placement

Runner-stage instruction order after my change, top to bottom:
```
FROM base AS runner → WORKDIR → ENV NODE_ENV/NEXT_TELEMETRY_DISABLED
→ RUN addgroup/adduser (create nextjs user)
→ COPY --from=builder public
→ RUN mkdir .next && chown
→ COPY --from=builder .next/standalone, .next/static
→ COPY --from=builder drizzle/, migrate.mjs
→ COPY docker-entrypoint.sh, RUN chmod +x
→ COPY --from=deps node_modules/drizzle-orm
→ USER nextjs
→ EXPOSE 3000
→ ARG MOMO_COMMIT=unknown / ENV MOMO_COMMIT=${MOMO_COMMIT}   ← new
→ ENV PORT=3000
→ ENV HOSTNAME
→ HEALTHCHECK
→ CMD
```
Everything before the new `ARG`/`ENV` is either a `FROM`/cross-stage `COPY --from=deps|builder` (whose cache key depends on the *source* stage's content, not on anything in `runner` below it) or a `RUN`/`COPY` whose own cache key is fixed by the Dockerfile text and copied file content up to that instruction — none of it references `MOMO_COMMIT`. Docker's layer cache invalidates an instruction only when that instruction's own line (for `RUN`) or its build context changes; a build-arg's default (`ARG MOMO_COMMIT=unknown`) does not retroactively invalidate earlier `COPY --from=deps`/`COPY --from=builder` layers, because those stages are built and cached independently and are referenced by content digest, not by anything downstream. So the `deps` stage (`npm ci`, cached on `package-lock.json`+`.npmrc`), the `builder` stage (`npm run build`, cached on source + the `.next/cache` mount), and every `COPY --from=…` line above `USER nextjs` keep their cache on a rebuild that only changes the commit SHA. Only `ARG MOMO_COMMIT`, `ENV MOMO_COMMIT`, and the four lines after it (`ENV PORT`, `ENV HOSTNAME`, `HEALTHCHECK`, `CMD`) are metadata-only Dockerfile instructions with no `RUN`/`COPY` cost — invalidating them on every commit costs nothing.

### RED — mutation test for the new cache-TTL coverage

The cache-TTL tests exercise pre-existing (already-correct) logic, not a live bug, so I verified they're load-bearing by breaking `lib/update-checker.ts:177`'s back-date amount (`CACHE_TTL_MS - 5*60*1000` → `CACHE_TTL_MS - 60*60*1000`, i.e. "retry within 1h" instead of "within 5min"), then reverted:

```
$ npm test -- update-checker
 ❯ __tests__/update-checker.test.ts (20 tests | 1 failed)
     × wiederholt nach einem Fehler innerhalb von ~5 Minuten, nicht erst nach 24 h
AssertionError: expected "fetch" to be called 2 times, but got 1 times
 ❯ __tests__/update-checker.test.ts:287:22
```

Restored the file (`diff` against the pre-mutation copy confirmed byte-identical), reran:

```
$ npm test -- update-checker
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

GREEN. The 24h-boundary test (test 1) was not separately mutation-tested — it follows the identical pattern one line above the error-retry test, checking `cache.cachedAt` on the success path, which has no separate "backdate fudge factor" to mutate; its correctness is structural (same `Date.now() - cachedAt < CACHE_TTL_MS` comparison already covered by the other describe block's non-fake-timer cache test).

### Verification commands — full output

```
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-and-publish.yml')); print('YAML OK')"
YAML OK

$ npx tsc --noEmit
(no output — success)

$ npm run lint
✖ 11 problems (0 errors, 11 warnings)
```
Same 11 pre-existing warnings as before this round (`react-hooks/set-state-in-effect` / `jsx-a11y` in files untouched by this round: `task-form.tsx`, `topic-form.tsx`, `wishlist-form.tsx`, `checkbox.tsx`, plus others already listed in the prior round). Zero errors.

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 2205 Verstoesse, keiner neu.
```
Unchanged — the `unknown` branch's new `border-[var(--border)] bg-[var(--bg-elevated)]` are token-arbitrary-value classes (`var(--…)`), not hex/rgb/palette-utility literals, so the color-category regex doesn't match them (same reasoning already proven true for `rounded-[var(--radius-md)]` in the prior round; confirmed against `components/ui/input.tsx`, which uses the identical `border border-[var(--border)] bg-[var(--bg-elevated)]` pair with zero counted violations).

```
$ npm run check:i18n
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1025 translation key references across source files.
✓ All translation keys are present in every language file.
```
Unchanged — no i18n keys touched (admin page's version block is German-only by existing convention, per Task 7's original report).

```
$ npm test -- update-status update-checker api-misc-route
 Test Files  3 passed (3)
      Tests  36 passed (36)
```
34 from the prior round + 2 new cache-TTL tests.

```
$ curl -s localhost:3000/api/health
{"status":"ok","version":"0.6.0","commit":null,"timestamp":"2026-08-27T09:00:58.342Z","cron":{"lastRunAt":null,"minutesSinceLastRun":null}}
```
`version` and `commit` both present; `commit` is `null` because the dev server isn't a built Docker image (`MOMO_COMMIT` is unset in this environment) — the documented-correct value, not a defect.

### Self-review — what I could not verify

1. **The workflow step's real execution.** Per the task's own constraint, I did not and could not run it (no `act`, no `gh workflow run`, no push). Verified: YAML parses, and the desk-check above walks all three branches of its logic by hand against the actual script text. Its first real signal is still its first run on `main`.
2. **The `sed` extraction pattern against the real `Response.json()` output.** I confirmed locally (`curl -s localhost:3000/api/health`) that the JSON shape is `"commit":"<value>"` with no extra whitespace around the colon (Next's `Response.json()` uses compact `JSON.stringify`), which is what the brief's suggested `sed` pattern expects. I did not test the pattern against a build where `commit` is a real 40-character SHA rather than `null` — only inspected the regex logic (`[^"]*` correctly captures any non-quote run, including a full hex SHA).
3. **The 503 error path's `version`/`commit` fields have no automated test.** I read the code (both fields are set unconditionally from `CURRENT_VERSION`/`process.env.MOMO_COMMIT`, neither touches `db`) and manually confirmed neither depends on the try block's DB call, but did not add a mock-DB-failure test, since `__tests__/api-misc-route.test.ts` has no existing DB-mocking harness for any route and adding one was outside this round's scope. This is the one code path in this round backed by reading, not a passing/failing test.
4. **Dockerfile cache-layer claim** is a desk-check against Docker's documented caching model (content-addressed stage builds, per-instruction cache keys), not an actual `docker build` run with a BuildKit cache — I did not build the image in this session (no Docker daemon access confirmed/attempted here; out of scope for a review-findings-only round with a running dev server that must not be disturbed).
5. **`app/CLAUDE.md`'s route table** still says `health/route.ts → GET (liveness probe, returns 200 OK)`, which was already stale before this round (the route has returned a JSON body with `version`/`cron` since the prior round) and is stale again now (`commit` added). Left untouched — it's project-structure documentation, not named in any of the five findings, and touching it risks scope creep into a file not listed in this task's `docs-site/`-only documentation obligation.

## Fix round 2 — R26/R27 (the gate can read what it asks for)

### Changes per file

**`.github/workflows/build-and-publish.yml`**
- Dropped `-f` from the `curl` call at the health-check gate, added `--max-time 10`, and rewrote the surrounding comment to state why: the gate asks "was the container swapped?", not "is the app healthy?" — a 503 whose body carries a matching commit means the swap happened, and a DB outage is a different watchdog's alarm. `-f` made curl print nothing and exit 22 on that 503, so `sed` never saw the body.
- Added `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: true }` **inside the `deploy` job only**, with a comment stating it is job-scoped on purpose (cancelling `build`/`merge` mid-manifest-push would be worse than a stale rollout gate). Fixes Finding 2: two close pushes to `main` no longer leave an older run polling for a commit the instance has already moved past.

**`app/api/health/route.ts`**
- Rewrote the comment at the old lines 28-32, which asserted that the 503 body's `commit`/`version` fields alone prevent the DB-outage misdiagnosis. That was false as of the previous round: `curl -sf` blocked the body regardless of what fields it carried. The comment now states the actual mechanism — the fields matter only because the workflow's `curl` call has no `-f`, and says so explicitly, naming the exit code (22) `-f` produced.

**`__tests__/update-checker.test.ts`**
- Finding 3: changed `vi.setSystemTime(new Date("2026-01-02T00:00:01.000Z"))` to `...T00:00:00.000Z` — exactly `CACHE_TTL_MS` after the cached fetch, matching the comment's claim of "genau an der 24h-Grenze". Chose to fix the time rather than the comment: a real boundary test (`<` vs `<=`) is more valuable than a past-the-TTL one with a corrected comment, and the boundary case is what the surrounding describes to future readers.
- Finding 4: changed `fetchSpy.mockResolvedValue(ghResponse(...))` to `fetchSpy.mockImplementation(async () => ghResponse(...))` so each call gets a fresh, unconsumed `Response`. Added `expect(second.error).toBeUndefined()` and `expect(second.latestVersion).toBe("9.9.9")` after the refetch so the test proves the refetch produced a good result, not just that it occurred.

**`docs-site/deployment.md`**
- Finding 5: "fragt dieses Feld ... ab" → "fragt das Feld `commit` ... ab", removing the ambiguous referent after the five-row table.

### Five-case curl desk-check (with `-f` dropped, `--max-time 10` added, `set -euo pipefail` active as in the real script)

Ran a local Python HTTP server on `127.0.0.1:8931` and executed the exact pipeline `curl -s --max-time 10 "$url/api/health" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || echo '?'` against each scenario (script text quoted, output captured):

| Case | `got` | Mechanism | Loop behavior |
|---|---|---|---|
| HTTP 200, matching commit | `deadbeef1234567890` | `sed` matches the body | `got = $EXPECTED` → confirmed, exit 0 |
| HTTP 503, body carries matching commit | `deadbeef1234567890` | No `-f`: curl exits 0 regardless of HTTP status, prints body; `sed` matches | `got = $EXPECTED` → confirmed as a successful rollout, exit 0 (this is the fix — Finding 1) |
| HTML 502 from a proxy | *(empty)* | `sed` finds no `"commit":"..."` in the HTML body; curl itself exits 0 (it got a response) | `got != $EXPECTED` (empty vs sha) → retries |
| Connection refused (no listener) | `?` | curl exits 7 (connection failed); `pipefail` propagates curl's exit code past `sed`'s exit 0; `|| echo '?'` catches it | `got != $EXPECTED` → retries |
| Hang (server never responds) | `?` | `--max-time` aborts the connection (curl exit 28, timeout); same `pipefail` + `|| echo '?'` path as connection-refused | `got != $EXPECTED` → retries, bounded to ~10s instead of hanging indefinitely |

(Timeout case run with `--max-time 2` against a server that sleeps 30s, to keep the check fast; measured elapsed time 2s, confirming the bound triggers rather than the connection completing.)

Commands and raw output:
```
$ curl -s --max-time 10 http://127.0.0.1:8931/api/health | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'
deadbeef1234567890                                          # 200, matching commit

$ curl -s --max-time 10 http://127.0.0.1:8931/api/health -w "\nHTTPCODE:%{http_code}\n" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p; /^HTTPCODE/p'
deadbeef1234567890
HTTPCODE:503                                                 # 503, matching commit — the fix in action

$ curl -s --max-time 10 http://127.0.0.1:8931/api/health | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'
                                                               # HTML 502 — no match, empty output

$ set -euo pipefail; got="$(curl -s --max-time 10 http://127.0.0.1:8931/api/health | sed -n '...' || echo '?')"; echo "got=[$got]"
got=[?]                                                       # connection refused, pipefail + || catches curl's exit 7

$ set -euo pipefail; got="$(curl -s --max-time 2 http://127.0.0.1:8931/api/health | sed -n '...' || echo '?')"; echo "got=[$got] elapsed=${elapsed}s"
got=[?] elapsed=2s                                            # hang, --max-time aborts, pipefail + || catches curl's exit 28
```

### Finding 3 — which option, and why

Chose to fix the **time**, not the comment: moved `vi.setSystemTime` from `T00:00:01.000Z` (TTL + 1000ms, a past-the-TTL test) to `T00:00:00.000Z` (exactly `CACHE_TTL_MS` after the cached fetch). This makes the test a genuine boundary check on `Date.now() - cache.cachedAt.getTime() < CACHE_TTL_MS` — at the exact boundary the difference equals `CACHE_TTL_MS`, `<` is false, so the cache is (correctly) considered expired. A `<` → `<=` regression would flip this test red; the old past-the-TTL version would not have caught it. Verified green after the change (see test output below).

### Finding 4 — RED then GREEN

RED (temporarily reverted to the buggy `mockResolvedValue`, same `Response` object reused across both fetches):
```
 ❯ __tests__/update-checker.test.ts (20 tests | 1 failed) 356ms
     × fragt nach 24 h erneut ab, statt den Cache weiter zu bedienen 9ms

 FAIL  __tests__/update-checker.test.ts > checkForUpdates: Cache-TTL-Grenzen > fragt nach 24 h erneut ab, statt den Cache weiter zu bedienen
AssertionError: expected 'Body is unusable: Body has already be…' to be undefined
- Expected:
undefined
+ Received:
"Body is unusable: Body has already been read"
 ❯ __tests__/update-checker.test.ts:277:26
    277|     expect(second.error).toBeUndefined();
 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
```
This is exactly the bug Finding 4 describes: a drained `Response` body throwing on the second `.json()`, silently downgraded to an `error` result — caught only by the new assertions, not by the pre-existing call-count check.

GREEN (reverted to `mockImplementation`, the shipped fix):
```
 Test Files  2 passed (2)
      Tests  31 passed (31)
```

### YAML parse

```
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-and-publish.yml'))"
YAML_OK
```

### Full verification commands

```
$ npx tsc --noEmit
(no output — clean)

$ npm run lint
✖ 11 problems (0 errors, 11 warnings)
```
All 11 warnings are pre-existing (`react-hooks/set-state-in-effect` in `task-form.tsx`, `topic-form.tsx`, `wishlist-form.tsx`; `jsx-a11y/role-supports-aria-props` in `checkbox.tsx`) — none in files touched this round, 0 errors.

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 2205 Verstoesse, keiner neu.
```
Ratchet unchanged at 2205, none new.

```
$ npm run check:i18n
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1025 translation key references across source files.
✓ All translation keys are present in every language file.
```

```
$ npm test -- update-checker api-misc-route
 Test Files  2 passed (2)
      Tests  31 passed (31)
```

### Self-review — what I could not verify

1. **The workflow step's real execution**, as in the prior round — no `act`, no `gh workflow run`, no push, per the task's own constraint. The five-case desk-check above is a local reproduction of the exact pipeline text against a controlled HTTP server, not a run of the workflow itself.
2. **`concurrency:` at job level actually cancels an in-flight `deploy` run** — GitHub Actions' concurrency-group semantics for job-scoped (vs workflow-scoped) groups are documented behavior I did not observe firsthand (no live Actions run available in this session).
