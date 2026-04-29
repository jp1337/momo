/**
 * Integration tests for miscellaneous API routes.
 *
 * Covers:
 *  GET  /api/health
 *  POST /api/locale
 *  POST /api/cron
 */

import { vi, describe, it, expect } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// locale/route.ts now calls auth() to persist the locale for authenticated users.
// Mock it so unit tests don't pull in next-auth's full module graph.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null), // unauthenticated — locale-cookie path still works
}));

import { GET as GETHealth } from "@/app/api/health/route";
import { POST as POSTLocale } from "@/app/api/locale/route";
import { POST as POSTCron } from "@/app/api/cron/route";

function req(method: string, url: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(extraHeaders ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ─── GET /api/health ──────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 with { status: ok, timestamp, cron } — no auth required", async () => {
    const res = await GETHealth();
    expect(res.status).toBe(200);
    const body = await res.json() as {
      status: string;
      timestamp: string;
      cron: { lastRunAt: string | null; minutesSinceLastRun: number | null };
    };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect("cron" in body).toBe(true);
    expect("lastRunAt" in body.cron).toBe(true);
    expect("minutesSinceLastRun" in body.cron).toBe(true);
  });

  it("timestamp is a valid ISO date string", async () => {
    const res = await GETHealth();
    const body = await res.json() as { timestamp: string };
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

// ─── POST /api/locale ─────────────────────────────────────────────────────────

describe("POST /api/locale", () => {
  it("returns 400 for invalid JSON", async () => {
    const badReq = new Request("http://localhost/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POSTLocale(badReq as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unsupported locale", async () => {
    const res = await POSTLocale(req("POST", "/api/locale", { locale: "xx" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid locale");
  });

  it("returns 400 when locale is missing", async () => {
    const res = await POSTLocale(req("POST", "/api/locale", {}) as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 with { ok: true } for a supported locale (de)", async () => {
    const res = await POSTLocale(req("POST", "/api/locale", { locale: "de" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 200 with { ok: true } for a supported locale (en)", async () => {
    const res = await POSTLocale(req("POST", "/api/locale", { locale: "en" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("sets a locale cookie in the response", async () => {
    const res = await POSTLocale(req("POST", "/api/locale", { locale: "en" }) as never);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("locale=en");
  });
});

// ─── POST /api/cron ───────────────────────────────────────────────────────────

describe("POST /api/cron", () => {
  it("returns 401 when CRON_SECRET is not set and no token is provided", async () => {
    // In test env, CRON_SECRET is not set so fail-closed applies
    const res = await POSTCron(req("POST", "/api/cron") as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POSTCron(req("POST", "/api/cron", undefined) as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token does not match CRON_SECRET", async () => {
    const res = await POSTCron(
      req("POST", "/api/cron", undefined, {
        Authorization: "Bearer wrong-secret",
      }) as never
    );
    expect(res.status).toBe(401);
  });
});
