/**
 * Integration tests for POST /api/energy-checkin.
 *
 * recordEnergyCheckin and reselectQuestForEnergy are mocked to avoid
 * real DB side-effects and to control error scenarios.
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

vi.mock("@/lib/energy", async (orig) => {
  const actual = await orig<typeof import("@/lib/energy")>();
  return {
    ...actual,
    recordEnergyCheckin: vi.fn().mockResolvedValue(undefined),
    getEnergyCheckinStreak: vi.fn().mockResolvedValue(1),
  };
});

vi.mock("@/lib/daily-quest", async (orig) => {
  const actual = await orig<typeof import("@/lib/daily-quest")>();
  return {
    ...actual,
    reselectQuestForEnergy: vi.fn().mockResolvedValue({
      quest: null,
      swapped: false,
      previousQuestId: undefined,
      previousQuestTitle: undefined,
    }),
  };
});

vi.mock("@/lib/gamification", async (orig) => {
  const actual = await orig<typeof import("@/lib/gamification")>();
  return {
    ...actual,
    checkAndUnlockAchievements: vi.fn().mockResolvedValue({ unlocked: [], coinsAwarded: 0 }),
  };
});

import { resolveApiUser } from "@/lib/api-auth";
import { recordEnergyCheckin } from "@/lib/energy";
import { reselectQuestForEnergy } from "@/lib/daily-quest";
import { POST } from "@/app/api/energy-checkin/route";
import { createTestUser } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);
const mockRecord = vi.mocked(recordEnergyCheckin);
const mockReselect = vi.mocked(reselectQuestForEnergy);

beforeEach(() => {
  mockAuth.mockReset();
  mockRecord.mockReset();
  mockReselect.mockReset();
  mockRecord.mockResolvedValue(undefined);
  mockReselect.mockResolvedValue({
    quest: null,
    swapped: false,
    previousQuestId: undefined,
    previousQuestTitle: undefined,
  } as never);
});

function req(body?: unknown): Request {
  if (body === undefined) {
    return new Request("http://localhost/api/energy-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
  }
  return new Request("http://localhost/api/energy-checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

describe("POST /api/energy-checkin", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req({ energyLevel: "HIGH" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(req({ energyLevel: "HIGH" }) as never);
    expect(res.status).toBe(403);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req() as never);
    expect(res.status).toBe(400);
  });

  it("returns 422 for an invalid energyLevel", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req({ energyLevel: "ULTRA" }) as never);
    expect(res.status).toBe(422);
  });

  it("returns 200 with quest and swapped when energyLevel is valid", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req({ energyLevel: "MEDIUM" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: null; swapped: boolean };
    expect(body.swapped).toBe(false);
    expect(body.quest).toBeNull();
  });

  it("returns 500 when recordEnergyCheckin throws", async () => {
    const user = await createTestUser();
    authAs(user.id);
    mockRecord.mockRejectedValueOnce(new Error("DB failed"));

    const res = await POST(req({ energyLevel: "LOW" }) as never);
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Failed to process energy check-in");
  });
});
