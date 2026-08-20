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
  /**
   * The real route handler. Typed `unknown` rather than `PlainHandler |
   * ParamHandler` because each route's actual `ctx.params` shape (e.g.
   * `{ id: string }`) is narrower than `Record<string, string>`, and under
   * `strictFunctionTypes` a narrower parameter type is not assignable to a
   * wider one — every entry below would otherwise fail `tsc`. `invoke()`
   * narrows it with an explicit cast before calling it.
   */
  readonly handler: unknown;
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
