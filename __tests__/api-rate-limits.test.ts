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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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
/**
 * A handler invoked with a Request plus awaited dynamic route params.
 *
 * `ctx.params` is typed `Promise<never>` rather than `Promise<Record<string,
 * string>>`: each real route's params shape is narrower (e.g. `{ id: string
 * }`), and under `strictFunctionTypes` a function parameter position is
 * contravariant, so a wider declared type here is not assignable from a
 * narrower one. `never` is the bottom type, so it is assignable into every
 * route's concrete shape, and the union below stays a real, checked type
 * instead of `unknown` — a typo'd or wrong-shaped import still fails `tsc`.
 */
type ParamHandler = (
  req: never,
  ctx: { params: Promise<never> }
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
}

const CASES: readonly Case[] = [
  { name: "POST /api/daily-quest", handler: questPOST, method: "POST", path: "/api/daily-quest" },
  { name: "POST /api/daily-quest/restore", handler: questRestorePOST, method: "POST", path: "/api/daily-quest/restore" },
  { name: "POST /api/locale", handler: localePOST, method: "POST", path: "/api/locale", body: { locale: "de" } },
  { name: "PATCH /api/push/devices/:id", handler: pushDevicePATCH, method: "PATCH", path: "/api/push/devices/x", body: { enabled: false }, params: { id: FAKE_ID } },
  { name: "DELETE /api/push/devices/:id", handler: pushDeviceDELETE, method: "DELETE", path: "/api/push/devices/x", params: { id: FAKE_ID } },
  { name: "POST /api/push/subscribe", handler: pushSubPOST, method: "POST", path: "/api/push/subscribe", body: {} },
  { name: "PATCH /api/push/subscribe", handler: pushSubPATCH, method: "PATCH", path: "/api/push/subscribe", body: {} },
  { name: "DELETE /api/push/subscribe", handler: pushSubDELETE, method: "DELETE", path: "/api/push/subscribe", body: {} },
  { name: "PATCH /api/settings/budget", handler: budgetPATCH, method: "PATCH", path: "/api/settings/budget", body: { monthlyBudget: 10 } },
  { name: "DELETE /api/settings/notification-channels/:type", handler: channelTypeDELETE, method: "DELETE", path: "/api/settings/notification-channels/email", params: { type: "email" } },
  { name: "POST /api/tasks/:id/breakdown", handler: breakdownPOST, method: "POST", path: "/api/tasks/x/breakdown", body: { subtasks: ["a"] }, params: { id: FAKE_ID } },
  { name: "PATCH /api/tasks/:id", handler: taskPATCH, method: "PATCH", path: "/api/tasks/x", body: { title: "x" }, params: { id: FAKE_ID } },
  { name: "DELETE /api/tasks/:id", handler: taskDELETE, method: "DELETE", path: "/api/tasks/x", params: { id: FAKE_ID } },
  { name: "PATCH /api/topics/:id", handler: topicPATCH, method: "PATCH", path: "/api/topics/x", body: { name: "x" }, params: { id: FAKE_ID } },
  { name: "DELETE /api/topics/:id", handler: topicDELETE, method: "DELETE", path: "/api/topics/x", params: { id: FAKE_ID } },
  { name: "DELETE /api/user/api-keys/:id", handler: apiKeyDELETE, method: "DELETE", path: "/api/user/api-keys/x", params: { id: FAKE_ID } },
  { name: "POST /api/wishlist/:id/buy", handler: buyPOST, method: "POST", path: "/api/wishlist/x/buy", params: { id: FAKE_ID } },
  { name: "DELETE /api/wishlist/:id/buy", handler: buyDELETE, method: "DELETE", path: "/api/wishlist/x/buy", params: { id: FAKE_ID } },
  { name: "POST /api/wishlist/:id/discard", handler: discardPOST, method: "POST", path: "/api/wishlist/x/discard", params: { id: FAKE_ID } },
  { name: "DELETE /api/wishlist/:id/discard", handler: discardDELETE, method: "DELETE", path: "/api/wishlist/x/discard", params: { id: FAKE_ID } },
  { name: "PATCH /api/wishlist/:id", handler: wishlistPATCH, method: "PATCH", path: "/api/wishlist/x", body: { title: "x" }, params: { id: FAKE_ID } },
  { name: "DELETE /api/wishlist/:id", handler: wishlistDELETE, method: "DELETE", path: "/api/wishlist/x", params: { id: FAKE_ID } },
  { name: "POST /api/auth/link-request", handler: linkRequestPOST, method: "POST", path: "/api/auth/link-request", body: { provider: "github" } },
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
      params: Promise.resolve(c.params) as never,
    });
  }
  return (c.handler as PlainHandler)(req);
}

/**
 * Mutation routes deliberately left without a rate-limit guard. Each has its
 * own justification recorded in its own file's header comment — see
 * `app/api/cron/route.ts` (no user identity to key a bucket on; CRON_SECRET
 * rejects everyone else first) and `app/api/admin/seed/route.ts` (403 outside
 * NODE_ENV=development, before auth and before the database). Keep this list
 * and those two comments in sync — if a route stops qualifying, fix the
 * route, not this list.
 */
const RATE_LIMIT_EXEMPT = new Set<string>([
  "app/api/admin/seed/route.ts",
  "app/api/cron/route.ts",
]);

const MUTATION_EXPORT = /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)\b/;

/** Recursively collects every `route.ts` file under `dir`. */
function findRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findRouteFiles(full));
    } else if (entry === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

/**
 * Walks `app/api/**\/route.ts`, keeps every file that exports a mutation
 * method, and returns the relative paths of any that neither call
 * `checkRateLimit` nor appear in `RATE_LIMIT_EXEMPT`. Mirrors the brief's
 * Step 1 verification command so the same check keeps running after this
 * task closes, not just while it was written.
 */
function findUnguardedMutationRoutes(): string[] {
  const apiDir = join(process.cwd(), "app", "api");
  const offenders: string[] = [];

  for (const file of findRouteFiles(apiDir)) {
    const source = readFileSync(file, "utf8");
    if (!MUTATION_EXPORT.test(source)) continue;

    const relPath = relative(process.cwd(), file);
    if (RATE_LIMIT_EXEMPT.has(relPath)) continue;
    if (!source.includes("checkRateLimit")) offenders.push(relPath);
  }

  return offenders;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiUser.mockResolvedValue({ userId: USER_ID, readonly: false } as ApiUser);
  mockSession.mockResolvedValue({
    user: { id: USER_ID, email: "rl@example.com" },
  } as never);
});

afterEach(() => {
  // `mockReturnValueOnce` queues a value on the spy; `clearAllMocks` in
  // `beforeEach` wipes call history but not that queue. Every case here
  // consumes its own queued value today, so nothing has leaked yet — but the
  // first case whose route doesn't reach the guard would leave a live
  // `limited: true` sitting on the module for the next test to trip over.
  // `restoreAllMocks` drops the spy (and its queue) entirely between tests.
  vi.restoreAllMocks();
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

  it("rate-limits every mutation route except the recorded exemptions", () => {
    const offenders = findUnguardedMutationRoutes();
    expect(
      offenders,
      `Mutation routes missing a rate-limit guard: ${offenders.join(", ")}. ` +
        `Add a checkRateLimit() call per CLAUDE.md's "rate limiting on all ` +
        `mutation API routes" rule, or add the route to RATE_LIMIT_EXEMPT ` +
        `above with a comment justifying the exemption in the route's own header.`
    ).toEqual([]);
  });
});
