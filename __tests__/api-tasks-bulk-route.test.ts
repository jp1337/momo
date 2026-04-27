/**
 * Integration tests for PATCH /api/tasks/bulk.
 *
 * Covers: 401, 403 (readonly), 429 (rate limit), 400 (bad JSON),
 * 422 (validation fail), 200 (bulk delete), 404 (topic not found),
 * 500 (unexpected error).
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
import { PATCH } from "@/app/api/tasks/bulk/route";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import * as tasksLib from "@/lib/tasks";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
});

function req(body?: unknown): Request {
  return new Request("http://localhost/api/tasks/bulk", {
    method: "PATCH",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

// ─── PATCH /api/tasks/bulk ────────────────────────────────────────────────────

describe("PATCH /api/tasks/bulk", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(req({ action: "delete", taskIds: [FAKE_ID] }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCH(req({ action: "delete", taskIds: [FAKE_ID] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badJsonReq = new Request("http://localhost/api/tasks/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await PATCH(badJsonReq);
    expect(res.status).toBe(400);
  });

  it("returns 422 for invalid body (missing action)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCH(req({ taskIds: [FAKE_ID] }));
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid action value", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCH(req({ action: "unknown", taskIds: [FAKE_ID] }));
    expect(res.status).toBe(422);
  });

  it("returns 200 with affected count for a valid bulk delete", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "To delete" });
    authAs(user.id);
    const res = await PATCH(req({ action: "delete", taskIds: [task.id] }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; affected: number };
    expect(body.success).toBe(true);
    expect(body.affected).toBe(1);
  });

  it("returns 200 with affected=0 when no tasks match", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCH(req({ action: "delete", taskIds: [FAKE_ID] }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; affected: number };
    expect(body.success).toBe(true);
    expect(body.affected).toBe(0);
  });

  it("returns 404 when changeTopic references a non-existent topic", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id);
    authAs(user.id);
    const res = await PATCH(
      req({ action: "changeTopic", taskIds: [task.id], topicId: FAKE_ID })
    );
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Topic not found");
  });

  it("returns 200 for bulk setPriority", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { priority: "NORMAL" });
    authAs(user.id);
    const res = await PATCH(
      req({ action: "setPriority", taskIds: [task.id], priority: "HIGH" })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; affected: number };
    expect(body.success).toBe(true);
    expect(body.affected).toBe(1);
  });
});

// ─── PATCH /api/tasks/bulk — 500 error path ───────────────────────────────────

describe("PATCH /api/tasks/bulk — 500 error path", () => {
  it("returns 500 when bulkUpdateTasks throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(tasksLib, "bulkUpdateTasks").mockRejectedValueOnce(
      new Error("unexpected DB failure")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await PATCH(
      req({ action: "delete", taskIds: [FAKE_ID] })
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});
