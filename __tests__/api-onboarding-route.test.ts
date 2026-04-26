/**
 * Integration tests for POST /api/onboarding/complete
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
import { POST } from "@/app/api/onboarding/complete/route";
import { createTestUser } from "./helpers/fixtures";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
});

function req(method: string, url: string): Request {
  return new Request(`http://localhost${url}`, { method });
}

function asUser(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

// ─── POST /api/onboarding/complete ────────────────────────────────────────────

describe("POST /api/onboarding/complete", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST", "/api/onboarding/complete"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with { success: true } after successful completion", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await POST(req("POST", "/api/onboarding/complete"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("sets onboardingCompleted=true in the database", async () => {
    const user = await createTestUser();
    asUser(user.id);
    await POST(req("POST", "/api/onboarding/complete"));
    const rows = await db
      .select({ onboardingCompleted: users.onboardingCompleted })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    expect(rows[0]?.onboardingCompleted).toBe(true);
  });

  it("is idempotent — can be called multiple times without error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    await POST(req("POST", "/api/onboarding/complete"));
    asUser(user.id);
    const res = await POST(req("POST", "/api/onboarding/complete"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
