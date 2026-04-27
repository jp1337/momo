/**
 * Integration tests for POST /api/admin/seed
 *
 * Covers: NODE_ENV gate (403), unauthenticated (401), read-only key (403),
 * success (200), and seedAchievements error path (500).
 *
 * resolveApiUser is mocked; seedAchievements uses a pass-through vi.fn so the
 * success path exercises the real seeding, and the error path can use mockRejectedValueOnce.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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

vi.mock("@/lib/gamification", async (orig) => {
  const actual = await orig<typeof import("@/lib/gamification")>();
  return { ...actual, seedAchievements: vi.fn(actual.seedAchievements) };
});

import { resolveApiUser } from "@/lib/api-auth";
import { seedAchievements } from "@/lib/gamification";
import { POST } from "@/app/api/admin/seed/route";
import { createTestUser } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockResolveApiUser = vi.mocked(resolveApiUser);
const mockSeedAchievements = vi.mocked(seedAchievements);

function makeRequest(): Request {
  return new Request("http://localhost/api/admin/seed", { method: "POST" });
}

describe("POST /api/admin/seed", () => {
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    savedNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = savedNodeEnv ?? "test";
  });

  it("returns 403 when NODE_ENV is not development (default: test)", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Only available in development");
  });

  it("returns 401 when unauthenticated in development mode", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    mockResolveApiUser.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when using a read-only API key in development mode", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    mockResolveApiUser.mockResolvedValue({ id: "user-1", readonly: true } as ApiUser);
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns 200 with achievement count when seeding succeeds", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    mockResolveApiUser.mockResolvedValue({ id: user.id, readonly: false } as ApiUser);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { message: string; count: number };
    expect(body.message).toBe("Achievements seeded successfully");
    expect(typeof body.count).toBe("number");
    expect(body.count).toBeGreaterThan(0);
  });

  it("returns 500 when seedAchievements throws", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    mockResolveApiUser.mockResolvedValue({ id: user.id, readonly: false } as ApiUser);
    mockSeedAchievements.mockRejectedValueOnce(new Error("seed failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Failed to seed achievements");
    consoleSpy.mockRestore();
  });
});
