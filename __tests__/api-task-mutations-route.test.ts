/**
 * Integration tests for task mutation API routes.
 *
 * Covers:
 *  POST   /api/tasks/:id/snooze
 *  DELETE /api/tasks/:id/snooze
 *  PATCH  /api/tasks/bulk
 *  POST   /api/tasks/:id/breakdown
 *  POST   /api/tasks/:id/promote-to-topic
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
import {
  POST as POSTSnooze,
  DELETE as DELETESnooze,
} from "@/app/api/tasks/[id]/snooze/route";
import { PATCH as PATCHBulk } from "@/app/api/tasks/bulk/route";
import { POST as POSTBreakdown } from "@/app/api/tasks/[id]/breakdown/route";
import { POST as POSTPromoteToTopic } from "@/app/api/tasks/[id]/promote-to-topic/route";
import { createTestUser, createTestTask, createTestTopic } from "./helpers/fixtures";
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

const FAKE_ID = "00000000-0000-0000-0000-000000000000";
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

// ─── POST /api/tasks/:id/snooze ───────────────────────────────────────────────

describe("POST /api/tasks/:id/snooze", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${FAKE_ID}/snooze`, { snoozedUntil: TOMORROW }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${FAKE_ID}/snooze`, { snoozedUntil: TOMORROW }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for a missing snoozedUntil", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${FAKE_ID}/snooze`, {}),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${FAKE_ID}/snooze`, { snoozedUntil: TOMORROW }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with the snoozed task", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Snooze Me" });
    authAs(user.id);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${task.id}/snooze`, { snoozedUntil: TOMORROW }),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { snoozedUntil: string | null } };
    expect(body.task.snoozedUntil).toBe(TOMORROW);
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badJsonReq = new Request(`http://localhost/api/tasks/${FAKE_ID}/snooze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await POSTSnooze(badJsonReq, { params: Promise.resolve({ id: FAKE_ID }) });
    expect(res.status).toBe(400);
  });

  it("returns 409 when trying to snooze an already-completed task", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { completedAt: new Date() });
    authAs(user.id);
    const res = await POSTSnooze(
      req("POST", `/api/tasks/${task.id}/snooze`, { snoozedUntil: TOMORROW }),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(409);
  });
});

// ─── DELETE /api/tasks/:id/snooze ────────────────────────────────────────────

describe("DELETE /api/tasks/:id/snooze", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETESnooze(
      req("DELETE", `/api/tasks/${FAKE_ID}/snooze`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETESnooze(
      req("DELETE", `/api/tasks/${FAKE_ID}/snooze`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with the unsnoozed task", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Snoozed Task",
      snoozedUntil: TOMORROW,
    });
    authAs(user.id);
    const res = await DELETESnooze(
      req("DELETE", `/api/tasks/${task.id}/snooze`),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { snoozedUntil: string | null } };
    expect(body.task.snoozedUntil).toBeNull();
  });

  it("returns 404 when unsnoozing a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETESnooze(
      req("DELETE", `/api/tasks/${FAKE_ID}/snooze`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/tasks/bulk ────────────────────────────────────────────────────

describe("PATCH /api/tasks/bulk", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", { action: "delete", taskIds: [] })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", { action: "delete", taskIds: [] })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid action", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", { action: "explode", taskIds: [] })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with { success: true, affected: N } for bulk delete", async () => {
    const user = await createTestUser();
    const task1 = await createTestTask(user.id, { title: "Delete Me 1" });
    const task2 = await createTestTask(user.id, { title: "Delete Me 2" });
    authAs(user.id);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", {
        action: "delete",
        taskIds: [task1.id, task2.id],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; affected: number };
    expect(body.success).toBe(true);
    expect(body.affected).toBe(2);
  });

  it("returns 422 for empty taskIds array (min 1 required)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", { action: "delete", taskIds: [] })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 for bulk setPriority", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Priority Task" });
    authAs(user.id);
    const res = await PATCHBulk(
      req("PATCH", "/api/tasks/bulk", {
        action: "setPriority",
        taskIds: [task.id],
        priority: "HIGH",
      })
    );
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/tasks/:id/breakdown ───────────────────────────────────────────

describe("POST /api/tasks/:id/breakdown", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTBreakdown(
      req("POST", `/api/tasks/${FAKE_ID}/breakdown`, {
        subtaskTitles: ["Sub 1", "Sub 2"],
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTBreakdown(
      req("POST", `/api/tasks/${FAKE_ID}/breakdown`, {
        subtaskTitles: ["Sub 1", "Sub 2"],
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when fewer than 2 subtasks are provided", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTBreakdown(
      req("POST", `/api/tasks/${FAKE_ID}/breakdown`, {
        subtaskTitles: ["Only One"],
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 when the task does not exist", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTBreakdown(
      req("POST", `/api/tasks/${FAKE_ID}/breakdown`, {
        subtaskTitles: ["Sub 1", "Sub 2"],
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with topicId and tasks after breakdown", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Break Me Down" });
    authAs(user.id);
    const res = await POSTBreakdown(
      req("POST", `/api/tasks/${task.id}/breakdown`, {
        subtaskTitles: ["Part One", "Part Two"],
      }) as never,
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { topicId: string; tasks: unknown[] };
    expect(typeof body.topicId).toBe("string");
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks.length).toBe(2);
  });
});

// ─── POST /api/tasks/:id/promote-to-topic ────────────────────────────────────

describe("POST /api/tasks/:id/promote-to-topic", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTPromoteToTopic(
      req("POST", `/api/tasks/${FAKE_ID}/promote-to-topic`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTPromoteToTopic(
      req("POST", `/api/tasks/${FAKE_ID}/promote-to-topic`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTPromoteToTopic(
      req("POST", `/api/tasks/${FAKE_ID}/promote-to-topic`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when task already belongs to a topic", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id);
    const task = await createTestTask(user.id, {
      title: "Already In Topic",
      topicId: topic.id,
    });
    authAs(user.id);
    const res = await POSTPromoteToTopic(
      req("POST", `/api/tasks/${task.id}/promote-to-topic`),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(409);
  });

  it("returns 201 with new topic when promoting a standalone task", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Promote Me",
      topicId: null,
    });
    authAs(user.id);
    const res = await POSTPromoteToTopic(
      req("POST", `/api/tasks/${task.id}/promote-to-topic`),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { topic: { id: string } };
    expect(typeof body.topic.id).toBe("string");
  });
});
