/**
 * Integration tests for daily-quest mutation routes and energy check-in.
 *
 * Covers:
 *  POST /api/daily-quest/postpone
 *  POST /api/daily-quest/restore
 *  POST /api/energy-checkin
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
import { POST as POSTPostpone } from "@/app/api/daily-quest/postpone/route";
import { POST as POSTRestore } from "@/app/api/daily-quest/restore/route";
import { POST as POSTEnergyCheckin } from "@/app/api/energy-checkin/route";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
});

function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

// ─── POST /api/daily-quest/postpone ──────────────────────────────────────────

describe("POST /api/daily-quest/postpone", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", { taskId: FAKE_UUID })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", { taskId: FAKE_UUID })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for a missing taskId", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", {})
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 for a non-UUID taskId", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", { taskId: "not-a-uuid" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with postpone info when task is the active daily quest", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Quest Task",
      type: "DAILY_ELIGIBLE",
      isDailyQuest: true,
      dailyQuestDate: new Date().toISOString().slice(0, 10),
    });
    authAs(user.id);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", {
        taskId: task.id,
        timezone: "Europe/Berlin",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; postponesToday: number; postponeLimit: number };
    expect(body.ok).toBe(true);
    expect(typeof body.postponesToday).toBe("number");
    expect(typeof body.postponeLimit).toBe("number");
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badJsonReq = new Request("http://localhost/api/daily-quest/postpone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not-valid-json }",
    });
    const res = await POSTPostpone(badJsonReq);
    expect(res.status).toBe(400);
  });

  it("returns 404 when taskId does not belong to user", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTPostpone(
      req("POST", "/api/daily-quest/postpone", { taskId: FAKE_UUID })
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/daily-quest/restore ───────────────────────────────────────────

describe("POST /api/daily-quest/restore", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTRestore(
      req("POST", "/api/daily-quest/restore", { taskId: FAKE_UUID })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTRestore(
      req("POST", "/api/daily-quest/restore", { taskId: FAKE_UUID })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid input (missing taskId)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTRestore(
      req("POST", "/api/daily-quest/restore", {})
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with { quest } for a valid task pin", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Pinnable Task",
      type: "DAILY_ELIGIBLE",
    });
    authAs(user.id);
    const res = await POSTRestore(
      req("POST", "/api/daily-quest/restore", {
        taskId: task.id,
        timezone: "Europe/Berlin",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown };
    expect("quest" in body).toBe(true);
  });
});

// ─── POST /api/energy-checkin ────────────────────────────────────────────────

describe("POST /api/energy-checkin", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "HIGH" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "HIGH" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid energyLevel", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "EXTREME" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with { quest, swapped } for a valid energy check-in", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "HIGH" })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { quest: unknown; swapped: boolean };
    expect("quest" in body).toBe(true);
    expect(typeof body.swapped).toBe("boolean");
  });

  it("returns 200 with MEDIUM energy level", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "MEDIUM", timezone: "Europe/Berlin" })
    );
    expect(res.status).toBe(200);
  });

  it("returns 200 with LOW energy level", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTEnergyCheckin(
      req("POST", "/api/energy-checkin", { energyLevel: "LOW" })
    );
    expect(res.status).toBe(200);
  });
});
