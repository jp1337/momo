# Securing the Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four approved items of ROADMAP.md Thema 1 ("Absichern") — rate limiting on every reachable mutation route, nodemailer off the advisory list, dependency automation that cannot silently stall again, and the two lint warnings left over from next 16.3.1 — then ship them as v0.6.0.

**Architecture:** Four independent pull requests against `main`, each self-contained and revertible on its own, followed by a release PR that bumps the version and closes the `[Unreleased]` CHANGELOG block. Nothing here introduces a new subsystem: the rate limiter, the mail transport, and the passkey components all already exist, and the dependency-automation change swaps one config file for another. Error tracking (ROADMAP Thema 1, item 5) is deliberately **not** in this plan — it needs its own design round.

**Tech Stack:** TypeScript (strict), Next.js 16.3.1 App Router, Drizzle ORM, Vitest 4 (integration tests against a real `momo_test` Postgres), Playwright (E2E), Renovate, GitHub Actions.

**Spec:** `ROADMAP.md` § "Die drei Themen" → "1. Absichern — das Fundament halten". This plan implements the first four sub-headings of that section verbatim. The scope and the two design decisions that deviate from it (15 routes rather than 17; Renovate rather than a repaired `dependabot.yml`) were approved in the brainstorming round that produced this plan and are justified inline below.

---

## Global Constraints

- **Language:** TypeScript only. No new `.js`/`.mjs` files.
- **No `any`.** Use `unknown` and narrow. Test doubles use `as never` where a full type is impractical — this is the established idiom in `__tests__/`.
- **Commits:** Conventional Commits, `<type>(<scope>): <description>`. Scopes available: `auth`, `tasks`, `topics`, `recurring`, `daily-quest`, `gamification`, `wishlist`, `push`, `pwa`, `ui`, `db`, `api`, `deploy`, `docs`, `config`.
- **`main` is branch-protected.** Direct pushes are rejected regardless of what CLAUDE.md says. Every change goes through a PR. Never force-push, never merge to `main` from the CLI.
- **`CHANGELOG.md` is updated in the same commit** as the change it describes, under `## [Unreleased]`.
- **Tests need Postgres.** `npm test` connects to `postgresql://momo:password@localhost:5432/momo_test` (override with `TEST_DATABASE_URL`). In this environment it is provided by a podman container named `momo-test-pg`; start it with:
  ```bash
  podman start momo-test-pg || podman run -d --name momo-test-pg \
    -e POSTGRES_USER=momo -e POSTGRES_PASSWORD=password -e POSTGRES_DB=momo_test \
    -p 5432:5432 docker.io/library/postgres:16
  ```
- **Lint baseline:** on `main` at `ab5cfab`, `npm run lint` reports **three** warnings, not two: the two `no-location-assign-relative-destination` in the passkey components (Task 4 removes them) plus a pre-existing `jsx-a11y/role-supports-aria-props` at `components/ui/checkbox.tsx:31`. That third one is unrelated to anything here and is **out of scope** — do not fix it, do not treat it as a failure. The gate everywhere in this plan is **no new warnings**, never "zero warnings".
- **Branches are independent, and that has two consequences.** Every task cuts from `origin/main`; none stacks on another. So (a) each task's `CHANGELOG.md` bullet will conflict with its siblings' at merge time — expected, resolves by keeping both bullets, and each PR body says so; and (b) Tasks 1–4 do **not** contain Task 0's fix, because Task 0's PR is not merged during this session. Their test gate is therefore "everything passes except `__tests__/webhooks.test.ts` → *aborts fetch via AbortController*". **Any other failure is yours.** Only Task 5, which runs after the merges, gates on a fully green suite.
- **Known baseline:** on `main` at `ab5cfab`, `npm test` is **1683 passed / 1 failed / 1684 total**. The single failure is `__tests__/webhooks.test.ts > "aborts fetch via AbortController when delivery takes longer than timeout"`. It is a pre-existing race, documented in ROADMAP.md § "Offene technische Schulden" → "Flaky Webhook-Test". Task 0 fixes it. Until Task 0 lands, "the suite is green" means "1 failure, and it is that one".
- **Rate-limit window default** is `60_000` ms. Deviations (`5 * 60 * 1000`) are called out per route and must carry a comment saying why.
- **Verification is evidence, not assertion.** Every step that says "run X" means run it and read the output before ticking the box.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `__tests__/webhooks.test.ts` | Modify — make the delivery-log assertion wait for the fire-and-forget insert | 0 |
| `__tests__/api-rate-limits.test.ts` | **Create** — one table-driven suite asserting the 429 guard on all 15 newly limited handlers | 1 |
| `lib/openapi.ts` | Modify — add `"429"` to the 7 documented operations that now have a limit | 1 |
| 15 route files under `app/api/**` | Already modified in commit `ae1a5a8` — guards only, no tests | 1 |
| `app/api/cron/route.ts` | Already modified in `ae1a5a8` — doc comment recording why it is exempt | 1 |
| `app/api/admin/seed/route.ts` | Modify — same exemption comment, not yet written | 1 |
| `package.json` | Modify — `nodemailer` at two places, `@types/nodemailer` | 2 |
| `renovate.json` | **Create** — dependency automation in the house style | 3 |
| `.github/dependabot.yml` | **Delete** | 3 |
| `components/auth/passkey-login-button.tsx` | Modify — navigation + remove the lint-silencing dead node | 4 |
| `components/auth/passkey-second-factor-button.tsx` | Modify — navigation | 4 |
| `CHANGELOG.md` | Modify in every task | 0–5 |
| `ROADMAP.md` | Modify — tick the four items off | 5 |
| `README.md` | Modify — nothing structural; see Task 5 for why the status table does **not** change | 5 |

---

## Why 15 routes and not the 17 the spec names

Two of the 17 are exempt by argument, not by oversight, and both get a comment in the source so the next audit does not re-open them:

- **`app/api/cron/route.ts`** — there is no user identity to key a bucket on. The only available key is the caller's IP, and that caller is one scheduler hitting the route every five minutes. The `CRON_SECRET` bearer check with `timingSafeEqual` already rejects everyone else before any work happens, so a limit protects nothing while risking a lockout of the one legitimate caller (e.g. after a container restart storm). Each job's own idempotency guard is what makes duplicate calls harmless.
- **`app/api/admin/seed/route.ts`** — returns `403` unless `NODE_ENV === "development"`, before touching auth or the database. In production it is not reachable at all.

---

## Task 0: Make the flaky webhook delivery test wait for its insert

> **DECISION REQUIRED BEFORE STARTING.** This task is not one of the four approved roadmap items — it comes from ROADMAP.md § "Offene technische Schulden". It is first because without it, every later task's "suite is green" gate has a permanent red in it, and a known-red suite is exactly how a real regression gets waved through. It touches test code only; production code is untouched. If the decision is to skip it, then every later verification step reads "1683 passed, 1 failed (the known webhooks flake)" instead of "all passed", and Task 5 must not claim a green suite.

**Files:**
- Modify: `__tests__/webhooks.test.ts:697-711`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on. Its only output is a suite whose only red is a real red.

**Why the test is wrong and the code is right:** `fireWebhookEvent` logs the delivery with a deliberately un-`await`ed `db.insert(...)` (`lib/webhooks.ts:470`) so that a slow or failing log never delays or breaks a webhook delivery. That is the correct production behaviour. The test then `await`s `fireWebhookEvent` and immediately `SELECT`s the row — a race it loses locally and usually wins in CI. The fix belongs in the test: poll until the row lands.

- [ ] **Step 1: Run the test and watch it fail**

```bash
podman start momo-test-pg
npx vitest run __tests__/webhooks.test.ts -t "aborts fetch via AbortController"
```

Expected: FAIL with `AssertionError: expected undefined to be defined` at `__tests__/webhooks.test.ts:708`. If it passes, run it three more times — it is a race, and a single pass does not mean it is fixed. Do not proceed until you have seen it fail; you cannot verify a fix for a failure you have not reproduced.

- [ ] **Step 2: Add a polling helper near the top of the file's helper section**

Place it next to the other module-level helpers in `__tests__/webhooks.test.ts` (after the imports, before the first `describe`):

```ts
/**
 * Waits for the fire-and-forget delivery log in `fireWebhookEvent` to land.
 *
 * `lib/webhooks.ts` deliberately does not await its `db.insert` for the
 * delivery record, so that a slow or broken log never delays a webhook
 * delivery. That makes "the row exists" eventually-true rather than true on
 * return, and asserting it directly is a race the test loses locally and
 * usually wins in CI. Polling turns the race into a bounded wait.
 *
 * @param timeoutMs - How long to keep polling before giving up
 * @returns The most recent webhook delivery row
 * @throws If no delivery row appears within the timeout
 */
async function waitForLatestDelivery(
  timeoutMs = 2_000
): Promise<typeof webhookDeliveries.$inferSelect> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [row] = await db
      .select()
      .from(webhookDeliveries)
      .orderBy(desc(webhookDeliveries.deliveredAt))
      .limit(1);
    if (row) return row;
    if (Date.now() >= deadline) {
      throw new Error(
        `No webhook delivery row appeared within ${timeoutMs}ms — the ` +
          `fire-and-forget insert in lib/webhooks.ts never completed.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
```

- [ ] **Step 3: Use the helper in the failing test**

Replace the tail of the test — the block currently at `__tests__/webhooks.test.ts:701-711`:

```ts
    // Delivery should be logged as a failure
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .orderBy(desc(webhookDeliveries.deliveredAt))
      .limit(1);

    expect(delivery).toBeDefined();
    expect(delivery.status).toBe("failure");
    expect(delivery.errorMessage).toContain("aborted");
```

with:

```ts
    // Delivery should be logged as a failure. The insert is fire-and-forget,
    // so wait for it rather than racing it — see waitForLatestDelivery.
    const delivery = await waitForLatestDelivery();

    expect(delivery.status).toBe("failure");
    expect(delivery.errorMessage).toContain("aborted");
```

Note that `setTimeoutSpy.mockRestore()` already runs before this block, so the helper's own `setTimeout` is the real one and not the 5000ms-intercepting stub. Do not move the `mockRestore()` call.

- [ ] **Step 4: Run the test five times and verify it passes every time**

```bash
npx vitest run __tests__/webhooks.test.ts -t "aborts fetch via AbortController"
```

Expected: PASS. Run it five times. A race fixed by luck passes once; a race fixed properly passes every time.

- [ ] **Step 5: Run the whole suite**

```bash
npm test 2>&1 | tail -20
```

Expected: `Test Files 73 passed (73)`, `Tests 1684 passed (1684)`. Zero failures. This is the number every later task compares against.

- [ ] **Step 6: Update CHANGELOG**

Under `## [Unreleased]` → `### Fixed`, add as the first bullet:

```markdown
- **Flaky Webhook-Delivery-Test entschärft** — Der Test „aborts fetch via AbortController when delivery takes longer than timeout" hat gegen den absichtlich nicht `await`-eten `db.insert` in `lib/webhooks.ts` gerannt: lokal verlor er das Rennen zuverlässig, in CI gewann er es meistens. Der Test wartet den Insert jetzt mit einem 2-s-Polling ab, statt ihn zu erwischen. Produktionscode unverändert — fire-and-forget beim Delivery-Log ist gewollt, damit ein langsames Log keine Webhook-Auslieferung aufhält.
```

- [ ] **Step 7: Add `.superpowers/` to `.gitignore`**

Unrelated to the flake, folded in here because this task lands first. The subagent-driven workflow writes its ledger, briefs and review packages to `<repo>/.superpowers/`, which `.gitignore` does not cover — one `git add -A` and that scratch state lands in the repository. Append to `.gitignore`:

```gitignore

# superpowers subagent-driven-development scratch state
.superpowers/
```

- [ ] **Step 8: Commit**

```bash
git checkout -b test/webhook-delivery-race origin/main
git add __tests__/webhooks.test.ts CHANGELOG.md .gitignore
git commit -m "test(api): wait for the fire-and-forget delivery insert instead of racing it"
git push -u origin test/webhook-delivery-race
gh pr create --title "test(api): fix the flaky webhook delivery-log race" --body "$(cat <<'EOF'
## What

`__tests__/webhooks.test.ts` → "aborts fetch via AbortController when delivery takes longer than timeout" asserted on a row written by a deliberately un-awaited `db.insert` (`lib/webhooks.ts:470`). The test now polls for the row (2 s budget, 25 ms interval) instead of racing it.

## Why the test and not the code

The fire-and-forget insert is correct: a slow or failing delivery log must never delay or break an actual webhook delivery. What was wrong is asserting an eventually-true fact as if it were true on return.

## Verification

- Reproduced the failure locally 4/4 runs before the change.
- 5/5 passes after.
- Full suite: 1684 passed, 0 failed (was 1683/1, the 1 being this test).

Closes the "Flaky Webhook-Test" item under ROADMAP.md § Offene technische Schulden.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

---

## Task 1: Rate-limit guards — tests, spec, and the exemption record

**Files:**
- Test: `__tests__/api-rate-limits.test.ts` (create)
- Modify: `lib/openapi.ts` — add `"429": { $ref: "#/components/responses/TooManyRequests" }` to 11 operations
- Modify: `app/api/admin/seed/route.ts` — exemption comment
- Modify: `CHANGELOG.md`
- Already done in commit `ae1a5a8` on branch `feat/rate-limit-mutation-routes`: the guards in 15 route files plus the exemption comment in `app/api/cron/route.ts`

**Interfaces:**
- Consumes: `checkRateLimit(key: string, limit: number, windowMs: number): { limited: boolean; remaining: number; resetAt: number }` and `rateLimitResponse(resetAt: number): NextResponse`, both from `@/lib/rate-limit`. Unchanged — this task adds callers, not capability.
- Produces: the bucket keys below. Later tasks do not depend on them, but anything that adds a mutation route must reuse a key from this table or add a row to it.

**Bucket keys as committed in `ae1a5a8`** — verify each one is present and matches before writing tests:

| Route | Methods | Key | Limit | Window |
|---|---|---|---|---|
| `app/api/auth/link-request/route.ts` | POST | `auth-link-request:${session.user.id}` | 5 | 5 min |
| `app/api/daily-quest/route.ts` | POST | `quest-generate:${user.userId}` | 10 | 1 min |
| `app/api/daily-quest/restore/route.ts` | POST | `quest-restore:${user.userId}` | 10 | 1 min |
| `app/api/locale/route.ts` | POST | `locale:${ip}` | 20 | 1 min |
| `app/api/push/devices/[id]/route.ts` | PATCH, DELETE | `push-device-mutate:${user.userId}` | 20 | 1 min |
| `app/api/push/subscribe/route.ts` | POST, PATCH, DELETE | `push-subscribe:${user.userId}` | 20 | 1 min |
| `app/api/settings/budget/route.ts` | PATCH | `settings-budget:${user.userId}` | 10 | 1 min |
| `app/api/settings/notification-channels/[type]/route.ts` | DELETE | `notif-channel:${user.userId}` | 10 | 1 min |
| `app/api/tasks/[id]/breakdown/route.ts` | POST | `tasks-breakdown:${user.userId}` | 10 | 1 min |
| `app/api/tasks/[id]/route.ts` | PATCH, DELETE | `tasks-mutate:${user.userId}` | 60 | 1 min |
| `app/api/topics/[id]/route.ts` | PATCH, DELETE | `topics-mutate:${user.userId}` | 30 | 1 min |
| `app/api/user/api-keys/[id]/route.ts` | DELETE | `api-keys-delete:${user.userId}` | 10 | 1 min |
| `app/api/wishlist/[id]/buy/route.ts` | POST, DELETE | `wishlist-buy:${user.userId}` | 20 | 1 min |
| `app/api/wishlist/[id]/discard/route.ts` | POST, DELETE | `wishlist-discard:${user.userId}` | 30 | 1 min |
| `app/api/wishlist/[id]/route.ts` | PATCH, DELETE | `wishlist-mutate:${user.userId}` | 30 | 1 min |

Two keys are intentionally shared across methods: `wishlist-buy` covers buy and un-buy, `notif-channel` is the same bucket the existing `PUT /api/settings/notification-channels` already uses. One bucket per user per concern, not per verb.

`app/api/locale/route.ts` is the only one keyed by IP rather than user: it answers unauthenticated callers too (setting just the cookie), so for half its traffic there is no user id to key on. Its guard sits before the body parse and before `auth()`, so a flood costs neither a DB round-trip nor a session lookup.

- [ ] **Step 1: Check out the branch and confirm the starting state**

```bash
git checkout feat/rate-limit-mutation-routes
git log --oneline -1
npx tsc --noEmit
grep -rlE "export (async )?function (POST|PUT|PATCH|DELETE)" app/api --include=route.ts | xargs grep -rL "checkRateLimit" | sort
```

Expected: HEAD is `ae1a5a8`; `tsc` prints nothing; the last command lists exactly two files, `app/api/admin/seed/route.ts` and `app/api/cron/route.ts`. If it lists anything else, a guard is missing — add it following the table above before continuing.

- [ ] **Step 2: Write the failing test file**

Create `__tests__/api-rate-limits.test.ts`:

```ts
/**
 * Rate-limit guards on the mutation routes.
 *
 * One table-driven suite rather than a 429 case scattered across eight route
 * test files. Every entry asserts one thing: when `checkRateLimit` reports
 * "limited", the handler answers 429. Because the guard sits directly behind
 * the auth check in each route, a 429 here also proves the guard runs before
 * the handler touches the database.
 *
 * `checkRateLimit` is stubbed with `mockReturnValueOnce` rather than being
 * driven over its real limit: the limits range from 5 to 60 requests, and
 * hammering each route that many times would turn a 20 ms assertion into a
 * multi-second one while testing the limiter's arithmetic a second time.
 * `__tests__/rate-limit.test.ts` already covers the arithmetic.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn(),
  resolveVerifiedApiUser: vi.fn(),
  readonlyKeyResponse: () =>
    Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    ),
  verifiedAuthErrorResponse: (reason: string) =>
    Response.json({ error: reason, code: reason }, { status: 401 }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { resolveApiUser } from "@/lib/api-auth";
import type { ApiUser } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import * as rateLimitLib from "@/lib/rate-limit";

import { POST as questPOST } from "@/app/api/daily-quest/route";
import { POST as questRestorePOST } from "@/app/api/daily-quest/restore/route";
import { POST as localePOST } from "@/app/api/locale/route";
import {
  PATCH as pushDevicePATCH,
  DELETE as pushDeviceDELETE,
} from "@/app/api/push/devices/[id]/route";
import {
  POST as pushSubPOST,
  PATCH as pushSubPATCH,
  DELETE as pushSubDELETE,
} from "@/app/api/push/subscribe/route";
import { PATCH as budgetPATCH } from "@/app/api/settings/budget/route";
import { DELETE as channelTypeDELETE } from "@/app/api/settings/notification-channels/[type]/route";
import { POST as breakdownPOST } from "@/app/api/tasks/[id]/breakdown/route";
import {
  PATCH as taskPATCH,
  DELETE as taskDELETE,
} from "@/app/api/tasks/[id]/route";
import {
  PATCH as topicPATCH,
  DELETE as topicDELETE,
} from "@/app/api/topics/[id]/route";
import { DELETE as apiKeyDELETE } from "@/app/api/user/api-keys/[id]/route";
import {
  POST as buyPOST,
  DELETE as buyDELETE,
} from "@/app/api/wishlist/[id]/buy/route";
import {
  POST as discardPOST,
  DELETE as discardDELETE,
} from "@/app/api/wishlist/[id]/discard/route";
import {
  PATCH as wishlistPATCH,
  DELETE as wishlistDELETE,
} from "@/app/api/wishlist/[id]/route";
import { POST as linkRequestPOST } from "@/app/api/auth/link-request/route";

const mockApiUser = vi.mocked(resolveApiUser);
const mockSession = vi.mocked(auth);

/** Any syntactically valid uuid — no route gets far enough to look it up. */
const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const FAKE_ID = "00000000-0000-0000-0000-0000000000bb";

/** A handler invoked with a plain Request and no route params. */
type PlainHandler = (req: never) => Promise<Response>;
/** A handler invoked with a Request plus awaited dynamic route params. */
type ParamHandler = (
  req: never,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

interface Case {
  /** Test name — "<METHOD> <path>". */
  readonly name: string;
  readonly handler: PlainHandler | ParamHandler;
  readonly method: string;
  readonly path: string;
  /** Body to send. Omitted means no body at all. */
  readonly body?: unknown;
  /** Dynamic route params, if the handler takes them. */
  readonly params?: Record<string, string>;
  /** How the route establishes identity. Drives which mock is primed. */
  readonly authVia: "apiKey" | "session" | "none";
}

const CASES: readonly Case[] = [
  { name: "POST /api/daily-quest", handler: questPOST, method: "POST", path: "/api/daily-quest", authVia: "apiKey" },
  { name: "POST /api/daily-quest/restore", handler: questRestorePOST, method: "POST", path: "/api/daily-quest/restore", authVia: "apiKey" },
  { name: "POST /api/locale", handler: localePOST, method: "POST", path: "/api/locale", body: { locale: "de" }, authVia: "none" },
  { name: "PATCH /api/push/devices/:id", handler: pushDevicePATCH, method: "PATCH", path: "/api/push/devices/x", body: { enabled: false }, params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/push/devices/:id", handler: pushDeviceDELETE, method: "DELETE", path: "/api/push/devices/x", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "POST /api/push/subscribe", handler: pushSubPOST, method: "POST", path: "/api/push/subscribe", body: {}, authVia: "apiKey" },
  { name: "PATCH /api/push/subscribe", handler: pushSubPATCH, method: "PATCH", path: "/api/push/subscribe", body: {}, authVia: "apiKey" },
  { name: "DELETE /api/push/subscribe", handler: pushSubDELETE, method: "DELETE", path: "/api/push/subscribe", body: {}, authVia: "apiKey" },
  { name: "PATCH /api/settings/budget", handler: budgetPATCH, method: "PATCH", path: "/api/settings/budget", body: { monthlyBudget: 10 }, authVia: "apiKey" },
  { name: "DELETE /api/settings/notification-channels/:type", handler: channelTypeDELETE, method: "DELETE", path: "/api/settings/notification-channels/email", params: { type: "email" }, authVia: "apiKey" },
  { name: "POST /api/tasks/:id/breakdown", handler: breakdownPOST, method: "POST", path: "/api/tasks/x/breakdown", body: { subtasks: ["a"] }, params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "PATCH /api/tasks/:id", handler: taskPATCH, method: "PATCH", path: "/api/tasks/x", body: { title: "x" }, params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/tasks/:id", handler: taskDELETE, method: "DELETE", path: "/api/tasks/x", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "PATCH /api/topics/:id", handler: topicPATCH, method: "PATCH", path: "/api/topics/x", body: { name: "x" }, params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/topics/:id", handler: topicDELETE, method: "DELETE", path: "/api/topics/x", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/user/api-keys/:id", handler: apiKeyDELETE, method: "DELETE", path: "/api/user/api-keys/x", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "POST /api/wishlist/:id/buy", handler: buyPOST, method: "POST", path: "/api/wishlist/x/buy", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/wishlist/:id/buy", handler: buyDELETE, method: "DELETE", path: "/api/wishlist/x/buy", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "POST /api/wishlist/:id/discard", handler: discardPOST, method: "POST", path: "/api/wishlist/x/discard", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/wishlist/:id/discard", handler: discardDELETE, method: "DELETE", path: "/api/wishlist/x/discard", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "PATCH /api/wishlist/:id", handler: wishlistPATCH, method: "PATCH", path: "/api/wishlist/x", body: { title: "x" }, params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "DELETE /api/wishlist/:id", handler: wishlistDELETE, method: "DELETE", path: "/api/wishlist/x", params: { id: FAKE_ID }, authVia: "apiKey" },
  { name: "POST /api/auth/link-request", handler: linkRequestPOST, method: "POST", path: "/api/auth/link-request", body: { provider: "github" }, authVia: "session" },
];

function buildRequest(c: Case): Request {
  return new Request(`http://localhost${c.path}`, {
    method: c.method,
    headers: c.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: c.body !== undefined ? JSON.stringify(c.body) : undefined,
  });
}

async function invoke(c: Case): Promise<Response> {
  const req = buildRequest(c) as never;
  if (c.params) {
    return (c.handler as ParamHandler)(req, {
      params: Promise.resolve(c.params),
    });
  }
  return (c.handler as PlainHandler)(req);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiUser.mockResolvedValue({ userId: USER_ID, readonly: false } as ApiUser);
  mockSession.mockResolvedValue({
    user: { id: USER_ID, email: "rl@example.com" },
  } as never);
});

describe("rate limiting on mutation routes", () => {
  for (const c of CASES) {
    it(`${c.name} answers 429 when the limit is exceeded`, async () => {
      const spy = vi
        .spyOn(rateLimitLib, "checkRateLimit")
        .mockReturnValueOnce({
          limited: true,
          remaining: 0,
          resetAt: Date.now() + 60_000,
        });

      const res = await invoke(c);

      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body).toMatchObject({ code: "RATE_LIMITED" });
      expect(res.headers.get("Retry-After")).not.toBeNull();
    });
  }

  it("covers every rate-limited mutation handler", () => {
    // A guard against the quiet failure mode: someone adds a mutation route,
    // adds a limit, and forgets the case here. 23 handlers across 15 route files —
    // see the table in docs/superpowers/plans/2026-08-20-securing-the-foundation.md.
    expect(CASES).toHaveLength(23);
  });
});
```

Note the count: the key table lists 15 route files carrying **23** guarded handlers between them (eight files guard one method, six guard two, one guards three — 8 + 12 + 3 = 23). Recount against that table if the length assertion fails, rather than editing the number to match.

- [ ] **Step 3: Run the new test file and read every failure**

```bash
npx vitest run __tests__/api-rate-limits.test.ts 2>&1 | tail -40
```

Expected at this point: most cases PASS (the guards are already committed in `ae1a5a8`). This is not a TDD red — the implementation preceded the test, which is why this step exists: any case that **fails** is a real defect in `ae1a5a8`, not a missing feature.

For each failure, diagnose before fixing:
- **Got 401/403 instead of 429** — the mock for that route's auth path is wrong (`authVia`), or the guard sits above the auth check and must move below it. The guard belongs *after* auth so unauthenticated floods are rejected as 401 by the cheaper check.
- **Got 400** — the route parsed the body before reaching the guard. For every route except `locale` that is a bug: move the guard above the parse. For `locale` it is expected to be *impossible*, since its guard is the first statement in the handler.
- **Got 500** — the guard is below a database call. Move it up.
- **`spy` not called** — that route has no guard. Add it per the key table.

- [ ] **Step 4: Add the exemption comment to the seed route**

In `app/api/admin/seed/route.ts`, extend the existing JSDoc header block. Insert after the `Returns: { message: string, count: number }` line:

```ts
 *
 * Deliberately NOT rate limited, unlike every other mutation route. The first
 * statement rejects anything outside `NODE_ENV=development` with a 403, before
 * auth and before the database — in production this route does not exist as far
 * as a caller is concerned, so a limit would guard a door that is already
 * bricked up. See also app/api/cron/route.ts for the other exemption.
```

- [ ] **Step 5: Add the missing 429 responses to the OpenAPI spec**

`lib/openapi.ts` already defines `components.responses.TooManyRequests` (line ~765) and already references it from 11 of the operations touched here — the spec documented a 429 that the code did not yet produce. Seven operations now have a limit and no `"429"` entry. For each, add the line

```ts
          "429": { $ref: "#/components/responses/TooManyRequests" },
```

immediately **above** the existing `"500": { $ref: "#/components/responses/InternalServerError" },` line, matching the ordering used everywhere else in the file.

The eleven operations, verified absent at the time of writing:

| Path | Operation |
|---|---|
| `/api/daily-quest` | `post` |
| `/api/daily-quest/restore` | `post` |
| `/api/push/subscribe` | `post` |
| `/api/push/subscribe` | `patch` |
| `/api/push/subscribe` | `delete` |
| `/api/settings/notification-channels/{type}` | `delete` |
| `/api/tasks/{id}/breakdown` | `post` |

Four of the fifteen routes are absent from the spec entirely — `/api/locale`, `/api/push/devices/{id}`, `/api/auth/link-request`, and the `delete` operation of `/api/wishlist/{id}/discard`. **Do not document them here.** That is the "OpenAPI-Spec-Drift" debt in ROADMAP.md, whose real fix is a test that diffs the spec against `app/api/**/route.ts` — adding four hand-written entries would make the gap look smaller without making it smaller. Leave them.

Verify the count afterwards:

```bash
grep -c '"429"' lib/openapi.ts
```

Expected: 49 (was 42; seven operations listed above, of which `/api/push/subscribe` contributes three).

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc --noEmit && npm run lint 2>&1 | tail -20
```

Expected: `tsc` silent. Lint shows at most the two pre-existing `no-location-assign-relative-destination` warnings in the passkey components (fixed in Task 4) and no new ones.

- [ ] **Step 7: Run the full suite**

```bash
npm test 2>&1 | tail -20
```

Expected: **1706 passed / 1 failed**, the failure being the known `webhooks.test.ts` flake and nothing else (1684 baseline − 1 flake + 23 new = 1706 passing). Task 0 fixes that flake on its own branch, which this branch does not contain. Any *other* failure belongs to this task.

Watch specifically for **new** failures in `api-task-mutations-route.test.ts`, `api-topic-mutations-route.test.ts`, `api-wishlist-route.test.ts`, `api-push-route.test.ts`, `api-daily-quest-route.test.ts`, `api-settings-route.test.ts` and `api-keys.test.ts`. Those files exercise the newly guarded handlers for real, against the real limiter, whose store is a module-level `Map` shared across a file. Each test creates a fresh user via `createTestUser()`, so the bucket key differs per test and the limits (10–60/min) are far above what any single test spends — but if one of those files does reuse a user id across more calls than its limit allows, it will now go 429. The fix in that case is in the test (fresh user per case), not a raised limit.

- [ ] **Step 8: Update CHANGELOG**

Under `## [Unreleased]` → `### Fixed`:

```markdown
- **Rate-Limiting auf allen erreichbaren Mutation-Routen** — `CLAUDE.md` verlangt „rate limiting on all mutation API routes"; tatsächlich hatten 17 von 57 keins. 15 sind jetzt nachgezogen (Task-, Topic- und Wishlist-`[id]`-Mutationen, Buy/Discard, Task-Breakdown, Daily-Quest inkl. Restore, Push-Subscribe und -Devices, Budget-Settings, Notification-Channel-Delete, API-Key-Delete, Account-Linking, Locale). Am meisten wehgetan hätten `POST /api/wishlist/[id]/buy` — bucht atomar Coins ab — und `POST /api/auth/link-request`, das unbegrenzt `linking_request`-Records erzeugen konnte. Authentifiziert waren alle Routen bereits korrekt; es fehlte die Bremse, nicht die Tür.
- **`/api/cron` und `/api/admin/seed` bleiben bewusst ohne Limit** — beide Ausnahmen sind jetzt im Quellcode begründet, damit die nächste Prüfung sie nicht erneut als Befund meldet: bei `/api/cron` gibt es keine User-Identität zum Keyen und der `CRON_SECRET`-Check weist alles andere vorher ab, bei `/api/admin/seed` greift außerhalb `NODE_ENV=development` schon vor Auth und DB ein 403.
- **OpenAPI: 429 bei sieben Operationen nachgetragen** — die Spec dokumentierte `TooManyRequests` bereits für elf Operationen, deren Code gar kein Limit hatte. Jetzt stimmen Spec und Code überein.
```

- [ ] **Step 9: Commit and open the PR**

```bash
git add __tests__/api-rate-limits.test.ts lib/openapi.ts app/api/admin/seed/route.ts CHANGELOG.md
git commit -m "feat(api): rate-limit the remaining reachable mutation routes"
git push -u origin feat/rate-limit-mutation-routes
gh pr create --title "feat(api): rate-limit the remaining reachable mutation routes" --body "$(cat <<'EOF'
## What

`CLAUDE.md` requires rate limiting on all mutation API routes. 17 of 57 had none. This adds guards to 15 of them and records, in the source, why the other two are exempt.

The two that mattered most:
- `POST /api/wishlist/[id]/buy` — debits coins atomically. An unthrottled write straight onto the currency system.
- `POST /api/auth/link-request` — created `linking_request` rows without bound.

All 17 were already correctly authenticated. What was missing was the brake, not the door.

## Exemptions, argued rather than overlooked

- `app/api/cron/route.ts` — no user identity to key a bucket on; the only key available is the IP of a single scheduler calling every five minutes. `CRON_SECRET` + `timingSafeEqual` rejects everyone else before any work happens, so a limit protects nothing and risks locking out the one legitimate caller.
- `app/api/admin/seed/route.ts` — returns 403 outside `NODE_ENV=development`, before auth and before the database.

Both now carry a comment saying so, so the next audit does not re-open them.

## Bonus: the spec was ahead of the code

`lib/openapi.ts` already referenced `TooManyRequests` on 11 operations that had no limit — the documented contract was aspirational. Seven more operations that now have a limit were missing the response. Both directions are reconciled. The four routes absent from the spec entirely are left alone deliberately; that is the spec-drift debt in ROADMAP.md, and hand-adding four entries would shrink the appearance of the gap without shrinking the gap.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new warnings.
- `npm test` — full suite green.
- New `__tests__/api-rate-limits.test.ts`: 23 cases, one per guarded handler, each asserting 429 + `RATE_LIMITED` + a `Retry-After` header.

Closes the "Rate-Limiting auf 17 Mutation-Routen" item in ROADMAP.md § Absichern.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

---

## Task 2: nodemailer 8 → 9

**Files:**
- Modify: `package.json:49` (`dependencies.nodemailer`), `package.json:67` (`overrides.nodemailer`), `package.json:83` (`devDependencies.@types/nodemailer`)
- Modify: `package-lock.json` (generated)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks consume. The only call sites are `nodemailer.createTransport({ host, port, secure, auth })` at `lib/notifications.ts:262` and `transporter.sendMail({ from, to, subject, text, html })` at `lib/notifications.ts:314`. Neither signature changes in v9; if either did, this task would grow a code change and the plan would be wrong — check.

**The trap, from the spec:** `nodemailer` appears **twice** in `package.json`, as a dependency and as an `overrides` entry, both `^8.0.7`. The override pins the 8.x line across the whole dependency tree. Bumping only the dependency gets silently dragged back by the override. Both change together.

**Why do it, honestly:** none of the four advisories is reachable in Momo. There is exactly one `sendMail` call and it sets only `from`, `to`, `subject`, `text`, `html`; a search across the mail code finds zero occurrences of `raw`, `attachments`, `jsonTransport`, `oauth2`, `disableFileAccess` or `disableUrlAccess`; SMTP auth is `SMTP_USER`/`SMTP_PASS`, not OAuth2; no `List-*` header is ever set. This clears four of five Dependabot alerts and the distribution phase sends visitors to the repo's Security tab. It is hygiene and reputation, not an incident — and the PR body must say so rather than implying a fix for an exploited hole.

- [ ] **Step 1: Branch and confirm the two pins**

```bash
git checkout -b chore/nodemailer-9 origin/main
grep -n "nodemailer" package.json
```

Expected: three lines — `"nodemailer": "^8.0.7"` twice (dependencies and overrides) and `"@types/nodemailer": "^8.0.0"` once.

- [ ] **Step 2: Check what v9 actually changed before touching anything**

```bash
npm view nodemailer version
npm view nodemailer@9.0.0 engines
```

Expected: latest `9.0.5`, `engines.node >= 6.0.0` (so no Node floor problem — the Dockerfile is on `node:22-alpine`).

Then read the release notes for breaking changes to `createTransport` and `sendMail`:

```bash
gh api repos/nodemailer/nodemailer/releases --jq '.[] | select(.tag_name | startswith("v9")) | "\(.tag_name)\n\(.body)\n---"' | head -60
```

If anything in there changes the `createTransport({host, port, secure, auth})` or `sendMail({from, to, subject, text, html})` shapes, **stop and report it** — this task's premise is that the surface is untouched, and that premise is now falsified.

- [ ] **Step 3: Bump both pins and the types**

Edit `package.json` — all three occurrences:

```json
"nodemailer": "^9.0.5",
```
in `dependencies`, and
```json
"nodemailer": "^9.0.5",
```
in `overrides`, and
```json
"@types/nodemailer": "^7.0.0",
```
in `devDependencies`.

`@types/nodemailer` does not track nodemailer's major line one-for-one. Resolve the right one rather than guessing:

```bash
npm view @types/nodemailer version
npm view @types/nodemailer versions --json | tail -20
```

Use the newest published major. If `@types/nodemailer` has been deprecated in favour of bundled types (nodemailer 9 may ship its own `.d.ts`), remove the `@types/nodemailer` devDependency entirely instead — check with:

```bash
npm view nodemailer@9.0.5 types
```

- [ ] **Step 4: Install and verify the tree has no 8.x left**

```bash
npm install
npm ls nodemailer
```

Expected: every `nodemailer` in the tree on 9.0.5. If any 8.x remains, the override did not take — recheck step 3.

- [ ] **Step 5: Typecheck, lint, test**

```bash
npx tsc --noEmit && npm run lint 2>&1 | tail -5 && npm test 2>&1 | tail -20
```

Expected: `tsc` silent; lint unchanged from the three-warning baseline; suite green except the known webhooks flake (see Global Constraints). Note what this does **not** prove: `__tests__/notifications-channels.test.ts:45` does `vi.mock("nodemailer", ...)`, so the real transport is never exercised. A green suite here means the types and the call shapes still line up, nothing more.

- [ ] **Step 6: Check the advisory count actually moved**

```bash
npm audit --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['metadata']['vulnerabilities']); print([k for k in d.get('vulnerabilities',{})])"
```

Expected: the `nodemailer` entry is gone. What remains should be the `@babel/core` low only. If `nodemailer` is still listed, the bump did not resolve the advisories and the whole point of the task is unmet — report rather than proceed.

- [ ] **Step 7: Verify the real mail path by hand — this is not optional**

`npm test` mocks nodemailer, so nothing automated covers the actual SMTP send. Use the path the app already has:

1. Run the app with SMTP configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
2. Settings → Notifications → add the email channel with a real address.
3. Press the channel's **Test** button. That calls `POST /api/settings/notification-channels/email/test`, which runs `sendTestNotification` → `EmailChannel.send` → `transporter.sendMail` — the exact code path in question.
4. Confirm the mail arrives, and that its subject and both bodies (text and HTML) render.

**This step needs the repository owner** — it requires real SMTP credentials. If you are an agent without them, stop here, leave the PR as a draft, and say plainly in the PR body that the manual mail verification is outstanding. Do not tick this box on the strength of a green unit suite.

- [ ] **Step 8: Update CHANGELOG**

Under `## [Unreleased]` → `### Changed`:

```markdown
- **nodemailer 8.0.7 → 9.0.5** — Räumt vier der fünf offenen Dependabot-Alerts auf einen Schlag ab (der HIGH zur `raw`-Option, die OAuth2-TLS-Validierung, CRLF-Injection in `List-*`-Headern und der `jsonTransport`-Bypass). **Keiner der vier Pfade war in Momo erreichbar**: es gibt genau einen `sendMail`-Aufruf (`lib/notifications.ts:314`), der ausschließlich `from`, `to`, `subject`, `text` und `html` setzt — kein `raw`, keine Attachments, kein `jsonTransport`, kein OAuth2, kein `List-*`-Header. Das hier ist Hygiene und Reputation vor der Verbreitungs-Phase, kein Sicherheits-Notfall. Wichtig war die doppelte Pinnung: `nodemailer` stand als Dependency *und* als `overrides`-Eintrag auf `^8.0.7` — nur eine der beiden zu heben, hätte der Override still zurückgezogen.
```

- [ ] **Step 9: Commit and open the PR**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(deps): bump nodemailer 8.0.7 to 9.0.5 at both pin sites"
git push -u origin chore/nodemailer-9
gh pr create --title "chore(deps): bump nodemailer 8 to 9" --body "$(cat <<'EOF'
## What

`nodemailer` `^8.0.7` → `^9.0.5`, at **both** places it is pinned: the `dependencies` entry and the `overrides` entry. The override pins the 8.x line across the whole tree, so bumping only the dependency would have been silently reverted.

This clears four of the five open Dependabot alerts. Dependabot could never have raised this PR: `.github/dependabot.yml` ignores every major for every package, so the fix was structurally invisible. (Task 3 replaces that config.)

## Not a security incident — read before merging

None of the four advisories is reachable in Momo:

| Advisory | Why it cannot fire here |
|---|---|
| HIGH — `raw` bypasses `disableFileAccess`/`disableUrlAccess` | Momo never passes `raw` and uses no attachments |
| MED — TLS validation in the OAuth2 token fetch | SMTP auth is `SMTP_USER`/`SMTP_PASS`, not OAuth2 |
| MED — CRLF injection in `List-*` header comments | Momo sets no `List-*` header |
| MED — `jsonTransport` bypasses the same flags | Real SMTP transport via `host`/`port` |

There is exactly one `sendMail` call (`lib/notifications.ts:314`) and it sets only `from`, `to`, `subject`, `text`, `html`. The reason to merge is that the distribution phase sends visitors to this repo's Security tab.

## Verification

- `npm ls nodemailer` — no 8.x left anywhere in the tree.
- `npm audit` — the nodemailer entry is gone; only the `@babel/core` low remains.
- `npx tsc --noEmit`, `npm run lint`, `npm test` — clean.
- **Manual SMTP send** via Settings → Notifications → Test: see the checklist in the plan. `__tests__/notifications-channels.test.ts` mocks `nodemailer` outright, so the automated suite proves the call shapes still typecheck and nothing about the real transport.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

---

## Task 3: Replace Dependabot with Renovate

**Files:**
- Create: `renovate.json`
- Delete: `.github/dependabot.yml`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing in code. Its output is repository behaviour, and two manual GitHub steps that only the owner can perform (see Step 5).

**Why replace rather than repair.** The spec names four causes of the 19-PR pileup. Renovate removes three of them structurally rather than by getting a config right once:

- **`alexa-skill/` had no entry at all**, so its four PRs arrived only as security alerts. Renovate discovers package files itself — `alexa-skill/package.json` and its lockfile are picked up without being named, so the omission cannot recur.
- **Security updates bypassed the grouping**, producing twelve competing PRs against one `package-lock.json`, each invalidating the rest on every merge. Renovate applies the same `packageRules` and concurrency limits to vulnerability PRs.
- **Majors were globally ignored**, which is why the nodemailer fix in Task 2 had to be done by hand. Renovate splits majors into their own PRs and additionally lists them on the Dependency Dashboard, so a stalled major is visible rather than absent.

Plus `lockFileMaintenance`, which Dependabot has no equivalent for.

**House style.** `~/projects/easywall`, `~/projects/wdk-ansible` and `~/projects/k8s` share a shape: `config:recommended` + `:dependencyDashboard` + `:semanticCommits`, `Europe/Berlin`, a 2–5 am window, `prConcurrentLimit: 10` / `prHourlyLimit: 4`, `platformAutomerge: true`, `rebaseWhen: "behind-base-branch"`, and `packageRules` bucketed by update type with per-bucket labels. `easywall/renovate.json` also carries the `vulnerabilityAlerts` block with the reasoning for switching GitHub's own security updates off. Momo follows all of it.

**Automerge policy, as decided:** devDependencies minor **and** patch automerge; runtime dependencies **patch only**; runtime minors and every major are manual. Renovate applies `packageRules` in order and later rules win, so the ordering below is load-bearing — do not reorder.

- [ ] **Step 1: Branch and write the config**

```bash
git checkout -b chore/renovate origin/main
```

Create `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":dependencyDashboard",
    ":semanticCommits"
  ],
  "timezone": "Europe/Berlin",
  "schedule": ["after 2am and before 5am"],
  "prConcurrentLimit": 10,
  "prHourlyLimit": 4,
  "labels": ["renovate", "dependencies"],
  "reviewers": ["jp1337"],
  "platformAutomerge": true,
  "rebaseWhen": "behind-base-branch",
  "semanticCommitType": "chore",
  "semanticCommitScope": "deps",
  "lockFileMaintenance": {
    "description": "The thing Dependabot has no equivalent for. Refreshes transitive pins that no direct bump touches — which is how a lockfile accumulates advisories nobody raised a PR for.",
    "enabled": true,
    "schedule": ["before 5am on monday"],
    "automerge": true
  },
  "packageRules": [
    {
      "description": "Patch, pin and digest: auto-merge once CI is green. Applies to runtime and dev alike — a patch that breaks the 1684-test suite does not merge, and one that doesn't is noise.",
      "matchUpdateTypes": ["patch", "pin", "digest"],
      "automerge": true,
      "automergeType": "pr",
      "labels": ["renovate", "automerge", "patch"]
    },
    {
      "description": "Runtime minors: manual. next, react, next-auth, drizzle and nodemailer are what the app is made of; a minor there deserves a pair of eyes even with a green suite.",
      "matchUpdateTypes": ["minor"],
      "automerge": false,
      "labels": ["renovate", "minor", "needs-review"]
    },
    {
      "description": "devDependency minors: auto-merge. Test, lint and build tooling cannot reach production, and the suite is the thing that would notice. Must stay AFTER the runtime-minor rule — later rules win in Renovate.",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["minor"],
      "automerge": true,
      "automergeType": "pr",
      "labels": ["renovate", "automerge", "dev-minor"]
    },
    {
      "description": "Majors: always manual, always with release notes. This is the bucket the old dependabot.yml ignored wholesale, which is how nodemailer 8 sat on four advisories without ever producing a PR.",
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["renovate", "major", "breaking-change"],
      "addLabels": ["needs-release-notes"]
    },
    {
      "description": "GitHub Actions in one grouped PR instead of four separate ones. Non-major automerges: the workflows are themselves what validates the change.",
      "matchManagers": ["github-actions"],
      "groupName": "github-actions",
      "semanticCommitScope": "ci",
      "labels": ["renovate", "dependencies", "ci"]
    },
    {
      "description": "Container images in Dockerfile and docker-compose.yml — coverage Dependabot never had here.",
      "matchManagers": ["dockerfile", "docker-compose"],
      "semanticCommitScope": "docker",
      "labels": ["renovate", "dependencies", "docker"]
    },
    {
      "description": "Postgres majors break the data directory: an image-tag jump from 18 to 19 leaves the cluster unreadable and needs a planned pg_dump/restore. Never automerge, whatever the update-type rules above say. The pg_dump cronjob (profiles: [backup]) is what makes the restore possible — verify a fresh dump exists before merging.",
      "matchDatasources": ["docker"],
      "matchPackageNames": ["postgres", "/^postgres$/"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "addLabels": ["breaking-change", "needs-manual-migration"],
      "prBodyNotes": [
        "Do NOT merge without a verified backup: `docker compose --profile backup run --rm db-backup`, then confirm the dump restores into a scratch container. A Postgres major moves the on-disk format; the old datadir will not mount."
      ]
    },
    {
      "description": "The Alexa Lambda is a separate npm project with its own lockfile. It had no dependabot.yml entry at all, which is why its four PRs only ever arrived as security alerts. Renovate finds it without being told; this rule only scopes its commits so they are legible in the log.",
      "matchFileNames": ["alexa-skill/**"],
      "semanticCommitScope": "deps",
      "labels": ["renovate", "dependencies", "alexa"]
    }
  ],
  "vulnerabilityAlerts": {
    "description": "A fix for a known vulnerability does not wait for the nightly window. GitHub's own 'Dependabot security updates' setting is switched off in favour of this, so one tool raises the PR rather than two raising it for the same advisory. The alerts themselves stay on — they are what this reads.",
    "enabled": true,
    "schedule": ["at any time"],
    "labels": ["renovate", "security"],
    "semanticCommitType": "fix"
  }
}
```

- [ ] **Step 2: Delete the Dependabot config**

```bash
git rm .github/dependabot.yml
```

- [ ] **Step 3: Validate the config before committing it**

A malformed `renovate.json` fails silently on the server side — the bot logs and does nothing. Validate locally:

```bash
npx --yes --package renovate renovate-config-validator renovate.json
```

Expected: `INFO: Validating renovate.json` followed by `INFO: Config validated successfully`. Fix anything it reports. If the package cannot be fetched in this environment, at minimum confirm the file is valid JSON:

```bash
python3 -c "import json;json.load(open('renovate.json'));print('valid json')"
```

and say in the PR body that schema validation did not run.

- [ ] **Step 4: Update CHANGELOG**

Under `## [Unreleased]` → `### Changed`:

```markdown
- **Dependabot durch Renovate ersetzt** — `.github/dependabot.yml` ist weg, `renovate.json` da. Nicht aus Geschmack: Renovate löst drei der vier Stau-Ursachen strukturell statt per einmalig richtig gesetzter Config. `alexa-skill/` hatte gar keinen Eintrag — Renovate findet Package-Files selbst, der Fehler ist damit nicht mehr möglich. Security-Updates umgingen die Gruppierung und erzeugten zwölf konkurrierende `package-lock.json`-PRs — Renovate behandelt Vulnerability-PRs mit denselben `packageRules` und Limits. Majors waren pauschal ignoriert (weshalb der nodemailer-Fix von Hand kommen musste) — Renovate trennt sie in eigene PRs und listet sie zusätzlich im Dependency Dashboard, wo ein hängender Major sichtbar ist statt abwesend. Dazu `lockFileMaintenance`, wofür es bei Dependabot keine Entsprechung gibt. Automerge-Politik: devDependencies mergen Patch und Minor selbst, Runtime-Dependencies nur Patches, Runtime-Minors und alle Majors bleiben Handarbeit. Postgres-Majors sind explizit gesperrt — ein Image-Tag-Sprung macht das Datadir unlesbar und braucht ein geplantes `pg_dump`/Restore. Neu abgedeckt sind außerdem `Dockerfile` und `docker-compose.yml`, die Dependabot hier nie angesehen hat.
```

- [ ] **Step 5: Commit and open the PR — with the two manual steps stated in the body**

```bash
git add renovate.json CHANGELOG.md
git commit -m "chore(config): replace Dependabot with Renovate"
git push -u origin chore/renovate
gh pr create --title "chore(config): replace Dependabot with Renovate" --body "$(cat <<'EOF'
## What

`.github/dependabot.yml` out, `renovate.json` in, in the same shape as `easywall`, `wdk-ansible` and `k8s`.

## Two steps I cannot do from here

Both are GitHub UI, both are needed for this to work:

1. **Install the Renovate app** on `jp1337/momo` — https://github.com/apps/renovate
2. **Turn off "Dependabot security updates"** in Settings → Code security. Otherwise every advisory produces two PRs, one from each bot. The *alerts* stay on — Renovate's `vulnerabilityAlerts` block is what reads them.

Until step 1 happens, this repo has no dependency automation at all, because this PR deletes the Dependabot config. Merge and install together.

## Why not just repair dependabot.yml

The pileup had four causes. Renovate removes three of them structurally rather than by getting a config right once:

| Cause | Repair under Dependabot | Under Renovate |
|---|---|---|
| `alexa-skill/` had no entry | Add one, remember it next time | Package files are discovered; omission impossible |
| Security PRs bypassed grouping → 12 competing lockfile PRs | Not configurable | Same `packageRules` and limits apply to vulnerability PRs |
| Majors globally ignored → nodemailer invisible for months | Loosen the ignore | Majors get their own PRs *and* a Dependency Dashboard row |
| `github-actions` ungrouped | Add a group | Grouped, plus non-major automerge |

And `lockFileMaintenance`, which has no Dependabot equivalent — it refreshes transitive pins that no direct bump touches, which is exactly how a lockfile collects advisories nobody raised a PR for.

## Automerge policy

- devDependencies: patch **and** minor automerge
- runtime dependencies: patch only
- runtime minors, all majors: manual
- Postgres majors: hard-blocked with a backup note — an image-tag jump leaves the datadir unreadable

Rule order in `packageRules` is load-bearing (later rules win); the dev-minor rule sits after the runtime-minor rule on purpose.

## New coverage

`Dockerfile` and `docker-compose.yml` were never looked at by Dependabot here. They are now.

## Verification

- `renovate-config-validator` passes.
- No code changes, so `tsc`/`lint`/`test` are unaffected — the diff is one config file added and one deleted.

Closes the "`dependabot.yml` reparieren" item in ROADMAP.md § Absichern, by replacing it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

---

## Task 4: The two passkey navigations

**Files:**
- Modify: `components/auth/passkey-login-button.tsx:62` and its lint-silencing dead node at lines 92–93
- Modify: `components/auth/passkey-second-factor-button.tsx:52`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing. Two component-internal changes.

**Read this before editing — the spec is too short here.** ROADMAP.md says "der Fix ist `useRouter().push()`". That is what the new `@next/next/no-location-assign-relative-destination` rule advises, and the rule is a **warning**, not an error. But the line it flags carries a comment explaining itself:

```ts
// Hard navigate so server components re-run with the new session cookie.
window.location.href = "/dashboard";
```

The full reload is the *point*: the `fetch` just before it sets a new session cookie, and the destination is a server-rendered dashboard that must be produced with that cookie. A bare `router.push()` is a client-side navigation that can be served from the Router Cache, and if it is, the user lands on a dashboard rendered for the session they had *before* logging in. On an auth flow, that failure mode is a bounce back to the login screen.

There is also a second, smaller thing the spec does not mention. `passkey-login-button.tsx` already imports `useRouter` and holds a `router` it never uses, kept alive by a dead render node:

```tsx
{/* Silence the Next hook by still using router — ensures push is valid */}
<span hidden>{router ? "" : ""}</span>
```

That is a lint workaround standing in for the change this task makes. It goes.

**And know what is not covering you:** the Playwright specs touch passkeys only in `e2e/settings.spec.ts` (registration). **No E2E test exercises passkey login or the second-factor step.** There is no automated net under this change, which is why Step 4 is a manual verification and why it is mandatory.

The fix is `router.refresh()` before `router.push()`. `refresh()` invalidates the Router Cache, so the subsequent `push()` cannot be served a payload rendered for the old session. This satisfies the lint rule and preserves the original intent.

- [ ] **Step 1: Branch and confirm the two warnings exist**

```bash
git checkout -b fix/passkey-client-navigation origin/main
npm run lint 2>&1 | grep -A2 "no-location-assign-relative-destination"
```

Expected: two warnings, one per component. If there are none, the rule is not active and this task's premise is wrong — stop and report.

- [ ] **Step 2: Fix the login button**

In `components/auth/passkey-login-button.tsx`, replace:

```ts
      // Hard navigate so server components re-run with the new session cookie.
      window.location.href = "/dashboard";
```

with:

```ts
      // `refresh()` before `push()`, not `push()` alone: the fetch above just
      // set a new session cookie, and /dashboard is server-rendered from it.
      // A bare push can be served from the Router Cache — i.e. a dashboard
      // rendered for the pre-login session, which bounces the user straight
      // back here. refresh() invalidates that cache first. This replaces a
      // `window.location.href` hard navigation, which achieved the same thing
      // by reloading the world.
      router.refresh();
      router.push("/dashboard");
```

Then delete the dead node that was keeping `router` "used" — remove both lines:

```tsx
      {/* Silence the Next hook by still using router — ensures push is valid */}
      <span hidden>{router ? "" : ""}</span>
```

`useRouter` is already imported at line 18 and `const router = useRouter()` already exists at line 26 — leave both.

- [ ] **Step 3: Fix the second-factor button**

`components/auth/passkey-second-factor-button.tsx` has no `useRouter` import yet. Add it after the `useState` import (line 10):

```ts
import { useRouter } from "next/navigation";
```

Add the hook alongside the component's other hooks, next to its `useState` calls:

```ts
  const router = useRouter();
```

Then replace:

```ts
      window.location.href = "/dashboard";
```

with:

```ts
      // See the note in passkey-login-button.tsx: refresh() before push() so
      // /dashboard is rendered with the session this verify call just
      // established, not one served from the Router Cache.
      router.refresh();
      router.push("/dashboard");
```

- [ ] **Step 4: Typecheck, lint, test**

```bash
npx tsc --noEmit && npm run lint 2>&1 | tail -10 && npm test 2>&1 | tail -10
```

Expected: `tsc` silent; **one** warning left — the pre-existing `jsx-a11y/role-supports-aria-props` at `components/ui/checkbox.tsx:31`, which is unrelated and out of scope. The two passkey warnings are gone. Suite green except the known webhooks flake. `npm test` does not cover these components — it is a regression check, not evidence for this change.

- [ ] **Step 5: Verify both flows by hand — mandatory, nothing automated covers them**

1. Run the app. Register a passkey (Settings → Security) if you have none.
2. Sign out. Sign in **with the passkey**. You must land on a dashboard showing *your* data — not the login page, not an empty dashboard.
3. Enable TOTP or passkey second factor, sign out, sign in, and complete the **second-factor** step. Same expectation.
4. Do both once more with a hard-reloaded tab, so the Router Cache starts cold in one case and warm in the other.

If either flow bounces back to login, `refresh()` + `push()` is insufficient for this app's session handling. In that case **revert to the hard navigation** and instead silence the rule where it fires, with the reason:

```ts
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the
      // full reload is deliberate: the session cookie was just replaced and
      // /dashboard must be server-rendered with it. router.refresh() + push()
      // was tried and bounced the user back to login.
      window.location.href = "/dashboard";
```

A documented suppression of a warning beats a broken login. Report which branch you took.

**This step needs the repository owner** — it needs a real authenticator. If you are an agent without one, leave the PR as a draft and say so in the body rather than ticking this box.

- [ ] **Step 6: Update CHANGELOG**

Under `## [Unreleased]` → `### Fixed`:

```markdown
- **Passkey-Login navigiert clientseitig statt per Full Reload** — `eslint-config-next` 16.3.1 brachte die Regel `@next/next/no-location-assign-relative-destination` mit und markierte zwei vorbestehende `window.location.href`-Navigationen in `passkey-login-button.tsx` und `passkey-second-factor-button.tsx`. Der Full Reload war dort allerdings Absicht: das `fetch` davor setzt ein neues Session-Cookie, und `/dashboard` wird serverseitig daraus gerendert. Ein blankes `router.push()` hätte aus dem Router-Cache bedient werden können — also ein Dashboard mit der Session *vor* dem Login, was den Nutzer direkt zurück auf die Login-Seite wirft. Der Fix ist deshalb `router.refresh()` vor `router.push()`: der Cache wird invalidiert, die Absicht bleibt. Nebenbei entfernt: ein `<span hidden>{router ? "" : ""}</span>`, das nur existierte, um eine Lint-Warnung über den ungenutzten `router` stumm zu schalten.
```

- [ ] **Step 7: Commit and open the PR**

```bash
git add components/auth/passkey-login-button.tsx components/auth/passkey-second-factor-button.tsx CHANGELOG.md
git commit -m "fix(auth): navigate client-side after passkey verification"
git push -u origin fix/passkey-client-navigation
gh pr create --title "fix(auth): navigate client-side after passkey verification" --body "$(cat <<'EOF'
## What

The two `window.location.href = "/dashboard"` assignments flagged by `@next/next/no-location-assign-relative-destination` (new in `eslint-config-next` 16.3.1) become `router.refresh()` + `router.push("/dashboard")`.

## Why not just `router.push()`

The line the rule flags carried a comment explaining itself: *"Hard navigate so server components re-run with the new session cookie."* The reload was deliberate. The `fetch` immediately before it replaces the session cookie, and `/dashboard` is server-rendered from that cookie. A bare `push()` is a client navigation that can be served from the Router Cache — and if it is, the user gets a dashboard rendered for the session they had before logging in, which bounces them back to login.

`refresh()` invalidates the Router Cache first, so the `push()` cannot be served stale. Rule satisfied, intent preserved.

## Also removed

```tsx
{/* Silence the Next hook by still using router — ensures push is valid */}
<span hidden>{router ? "" : ""}</span>
```

Dead render node in `passkey-login-button.tsx` whose only job was to keep an unused `router` from tripping a lint rule. Now that `router` is actually used, it goes.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — the two passkey warnings are gone; one unrelated pre-existing warning remains (`jsx-a11y/role-supports-aria-props`, `components/ui/checkbox.tsx:31`), untouched by design.
- `npm test` — green, though nothing in the suite covers these components.
- **Manual:** passkey login and the passkey second-factor step, each on a cold and a warm Router Cache. Note that `e2e/` touches passkeys only in `settings.spec.ts` (registration) — **no E2E test exercises passkey login**, so the manual pass is the only real evidence here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

---

## Task 5: Release v0.6.0

**Files:**
- Modify: `package.json` — `version`
- Modify: `CHANGELOG.md` — close `[Unreleased]` into `[0.6.0]`
- Modify: `ROADMAP.md` — tick off the four items
- Modify: `README.md` — see below; likely no change

**Interfaces:**
- Consumes: Tasks 0–4 must be **merged to `main`** first.
- Produces: tag `v0.6.0`, which is what `.github/workflows/build-and-publish.yml` triggers on (`tags: ["v*"]`).

> **This task is the repository owner's, not an agent's.** It depends on five PRs being merged into a protected `main`, and Step 7 pushes a tag that triggers image publication to GHCR, DockerHub and Quay. Merging and publishing are not an agent's calls to make. An agent executing this plan prepares everything up to and including the release PR's content, then stops and hands over — it does not merge the four PRs, and it does not push the tag.

**Why minor and not patch.** Rate limiting adds a 429 response to 15 routes of a public, documented REST API. A client that has never had to handle 429 on `PATCH /api/tasks/{id}` now can. That is a behavioural change in the public contract, so `0.5.0` → `0.6.0`.

**The README status table does not change.** Its rows are development phases, and Phase 7 already reads "Rate Limiting" as done — this release makes that claim true rather than newly true. There is no new phase here. Do not add a row for a hardening release; the CHANGELOG is where this belongs. (CLAUDE.md's "update README status table when a full phase is completed" does not apply — no phase completed.)

- [ ] **Step 1: Confirm all four PRs are merged and the tree is clean**

```bash
git checkout main
git pull
git log --oneline -8
npm ls nodemailer | head -3
ls renovate.json .github/dependabot.yml 2>&1
```

Expected: the merge commits for Tasks 1–4 present; nodemailer on 9.x; `renovate.json` exists and `.github/dependabot.yml` does not. If any is missing, that task is not merged — stop.

- [ ] **Step 2: Verify the whole thing green from a clean install**

```bash
podman start momo-test-pg
rm -rf node_modules
npm ci
npx tsc --noEmit
npm run lint 2>&1 | tail -5
npm test 2>&1 | tail -20
npm run build 2>&1 | tail -20
```

Expected: `tsc` silent; exactly one lint warning (the `components/ui/checkbox.tsx` one, unchanged from baseline); suite **fully** green — this is the one place that gate applies, because Task 0's fix is merged by now; build succeeds. `npm run build` matters here and nowhere else: it is the only step that proves the Docker image will build.

- [ ] **Step 3: Bump the version**

```bash
git checkout -b chore/release-0.6.0 origin/main
```

In `package.json`, change `"version": "0.5.0"` to `"version": "0.6.0"`. Leave `alexa-skill/package.json` at `1.0.0` — it versions independently and nothing in this release touched it.

- [ ] **Step 4: Close the CHANGELOG block**

Replace the `## [Unreleased]` heading with:

```markdown
## [Unreleased]

## [0.6.0] - 2026-08-20
```

so the accumulated entries fall under `[0.6.0]` and `[Unreleased]` is left empty for the next cycle. Use the actual merge date, not a copied one.

Then add a short lead paragraph directly under the `## [0.6.0]` heading, before the first `###`:

```markdown
Härtungs-Release. Kein neues Feature — die Vereinfachungs-Phase hatte vorne poliert, während das Fundament bröckelte: 19 aufgestaute Dependabot-PRs und 75 Security-Alerts. Dieses Release schließt den Rest davon und stellt sicher, dass es nicht wiederkommt.
```

- [ ] **Step 5: Tick the four items off in ROADMAP.md**

The § "Absichern" section describes work now done. Update it — do not delete it, the reasoning stays valuable:

1. Under **"Rate-Limiting auf 17 Mutation-Routen"**, change the heading to `**Rate-Limiting auf den Mutation-Routen** ✅ (2026-08-20, #<PR>)` and append: `15 von 17 nachgezogen; \`/api/cron\` und \`/api/admin/seed\` sind begründete Ausnahmen und tragen die Begründung jetzt im Quellcode. Nebenbei: \`lib/openapi.ts\` dokumentierte bei elf Operationen ein 429, das der Code nicht lieferte — Spec und Code stimmen jetzt überein.`
2. Under **"nodemailer 8 → 9"**, mark `✅ (2026-08-20, #<PR>)` and append: `Vier Alerts geschlossen. Es bleibt der \`@babel/core\`-Low.`
3. Replace the **"`dependabot.yml` reparieren"** heading with `**Dependabot durch Renovate ersetzt** ✅ (2026-08-20, #<PR>)` and rewrite the body to say what Renovate does about each of the four causes instead of what a repaired `dependabot.yml` would have.
4. Under the **next 16.3.1** entry, mark the two `window.location.href` warnings resolved, noting that the fix needed `router.refresh()` alongside `push()` because the hard reload was carrying the session cookie — the roadmap's own note said `push()` and that would have been a regression.
5. In the **"Erledigt" ✅** line at the end of § "Offene technische Schulden", add the Task 0 flake fix if it was done, and remove the "Flaky Webhook-Test" subsection.
6. Update the § "Wo Momo heute steht" alert numbers: five alerts becomes one (the `@babel/core` low). Update the test count too — `npm test` reports the real number after Task 1 added 23 cases.

Replace each `#<PR>` with the actual merged PR number from `gh pr list --state merged --limit 6`.

- [ ] **Step 6: Commit, PR, merge**

```bash
git add package.json CHANGELOG.md ROADMAP.md
git commit -m "chore(config): release v0.6.0"
git push -u origin chore/release-0.6.0
gh pr create --title "chore(config): release v0.6.0" --body "$(cat <<'EOF'
## What

Version bump to 0.6.0, `[Unreleased]` closed into `[0.6.0]`, roadmap items ticked off.

Minor rather than patch: rate limiting introduces a 429 response on 15 routes of the documented public API. A client that never had to handle 429 on `PATCH /api/tasks/{id}` now does. That is a public-contract change.

## Contents

- Rate limiting on 15 mutation routes, with both exemptions argued in-source (#<PR>)
- nodemailer 8 → 9.0.5, closing four of five Dependabot alerts (#<PR>)
- Dependabot replaced by Renovate (#<PR>)
- Passkey navigation moved off `window.location.href` (#<PR>)

## Verification

Clean `npm ci` from scratch, then `tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` — all clean.

## Not in this release

Error tracking (GlitchTip vs Sentry) — ROADMAP Thema 1, item 5. It needs its own design round: a new dependency, new env vars, DSN handling and self-hosting docs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NPpeRzFmzqaq84bw5HjXtM
EOF
)"
```

- [ ] **Step 7: Tag — only after the release PR is merged**

```bash
git checkout main
git pull
git log --oneline -1
git tag -a v0.6.0 -m "v0.6.0 — Härtungs-Release: Rate-Limiting, nodemailer 9, Renovate"
git push origin v0.6.0
```

The tag must point at the merged release commit on `main`, so pull first and check that HEAD is that commit before tagging. Pushing the tag triggers `build-and-publish.yml`, which pushes images to GHCR, DockerHub and Quay — verify it goes green:

```bash
gh run list --limit 3
```

- [ ] **Step 8: Confirm the outcome that started all of this**

```bash
gh api repos/jp1337/momo/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'
npm audit --json | python3 -c "import json,sys; print(json.load(sys.stdin)['metadata']['vulnerabilities'])"
```

Expected: one open alert (the `@babel/core` low), down from five. This is the number the distribution phase's visitors will see on the Security tab, and it is the reason Thema 1 came before Thema 2.

Note that Renovate only starts working once the app is installed and Dependabot security updates are switched off — both manual, both in Task 3's PR body. Check they happened:

```bash
gh api repos/jp1337/momo/installation --jq '.app_slug' 2>/dev/null || echo "check https://github.com/jp1337/momo/settings/installations"
```

---

## Self-Review

**Spec coverage** — ROADMAP.md § "1. Absichern", item by item:

| Spec item | Task | Note |
|---|---|---|
| Rate-Limiting auf 17 Mutation-Routen | 1 | 15 done, 2 exempt with in-source reasoning |
| nodemailer 8 → 9, both pin sites | 2 | The double-pin trap is Step 3; manual mail check is Step 7 |
| next 16.3.1 leftovers (2 lint warnings) | 4 | Spec's suggested fix was insufficient; corrected with reasoning |
| `dependabot.yml` reparieren | 3 | Superseded by Renovate, per the approved decision |
| Error-Tracking | — | **Deliberately out of scope.** Needs its own design round; stated in Task 5's PR body |
| Flaky Webhook-Test (Offene Schulden) | 0 | Added because it blocks the verification gate; flagged for decision |
| OpenAPI-Spec-Drift (Offene Schulden) | 1, partially | Only the 429s on already-documented operations. The four undocumented routes and the drift test are left alone, deliberately and explicitly |

**Placeholder scan** — the `#<PR>` markers in Task 5 are the only unresolved tokens, and each carries the command that resolves it. Every code step contains the actual code. No "add appropriate error handling", no "similar to Task N".

**Type consistency** — `checkRateLimit` / `rateLimitResponse` signatures match `lib/rate-limit.ts` as read. The test file's `PlainHandler` / `ParamHandler` types cover both handler shapes actually present in the 15 routes. `waitForLatestDelivery` returns `typeof webhookDeliveries.$inferSelect`, matching the existing `db.select().from(webhookDeliveries)` usage in that file. `ApiUser` is imported as a type from `@/lib/api-auth`, matching `api-settings-route.test.ts`.

**Known risks carried forward, not hidden:**
- Task 1 Step 7 may surface pre-existing route tests that now hit a real limit. The instruction is to fix the test, not raise the limit.
- Task 2 Step 7 and Task 4 Step 5 need the repository owner. An agent must leave those PRs as drafts rather than tick the box.
- Task 3 is inert until the Renovate app is installed, and it deletes the Dependabot config on merge — there is a window with no dependency automation. Merge and install together.
