/**
 * Integration tests for the daily-quest API routes.
 *
 * Covers: GET /api/daily-quest, POST /api/daily-quest
 *
 * Strategy: resolveApiUser is fully mocked. Lib functions hit the real test DB.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn(),
  readonlyKeyResponse: () =>
    Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { resolveApiUser } from "@/lib/api-auth";
import { GET, POST } from "@/app/api/daily-quest/route";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

// ─── GET /api/daily-quest ─────────────────────────────────────────────────────

describe("GET /api/daily-quest", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req("GET", "/api/daily-quest"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with { quest: null } for a user with no eligible tasks", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/daily-quest"));
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown };
    expect(body.quest).toBeNull();
  });

  it("returns 200 with { quest: Task } for a user with an eligible task", async () => {
    const user = await createTestUser();
    await createTestTask(user.id, {
      title: "Daily Eligible Task",
      type: "DAILY_ELIGIBLE",
    });
    authAs(user.id);
    const res = await GET(req("GET", "/api/daily-quest"));
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: { title: string } | null };
    expect(body.quest).not.toBeNull();
    expect(body.quest?.title).toBe("Daily Eligible Task");
  });

  it("accepts ?timezone=Europe/Berlin query parameter", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/daily-quest?timezone=Europe%2FBerlin"));
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown };
    // Should not error out even with a timezone parameter
    expect("quest" in body).toBe(true);
  });
});

// ─── POST /api/daily-quest ────────────────────────────────────────────────────

describe("POST /api/daily-quest", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST", "/api/daily-quest", {}));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(req("POST", "/api/daily-quest", {}));
    expect(res.status).toBe(403);
  });

  it("returns 200 with { quest } after force-selecting a new quest", async () => {
    const user = await createTestUser();
    await createTestTask(user.id, {
      title: "Force Quest",
      type: "DAILY_ELIGIBLE",
    });
    authAs(user.id);
    const res = await POST(req("POST", "/api/daily-quest", { timezone: "Europe/Berlin" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown };
    expect("quest" in body).toBe(true);
  });

  it("returns 200 with { quest: null } when no eligible tasks exist", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req("POST", "/api/daily-quest", {}));
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown };
    expect(body.quest).toBeNull();
  });
});
