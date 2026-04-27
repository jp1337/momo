/**
 * Integration tests for topic mutation API routes.
 *
 * Covers:
 *  PUT  /api/topics/:id/reorder
 *  POST /api/topics/import-template
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

// next-intl/server: mock both getLocale (used by the route) and
// getTranslations (used by lib/templates.ts inside importTopicFromTemplate).
// The translation function just returns the key so DB rows get populated with
// something stable — the content doesn't matter for these integration tests.
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("de"),
  getTranslations: vi.fn().mockResolvedValue((key: string) => `[${key}]`),
}));

import { resolveApiUser } from "@/lib/api-auth";
import { PUT as PUTReorder } from "@/app/api/topics/[id]/reorder/route";
import { POST as POSTImportTemplate } from "@/app/api/topics/import-template/route";
import { createTestUser, createTestTopic, createTestTask } from "./helpers/fixtures";
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

// ─── PUT /api/topics/:id/reorder ─────────────────────────────────────────────

describe("PUT /api/topics/:id/reorder", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUTReorder(
      req("PUT", `/api/topics/${FAKE_ID}/reorder`, { taskIds: [] }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PUTReorder(
      req("PUT", `/api/topics/${FAKE_ID}/reorder`, { taskIds: [] }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid body (missing taskIds)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PUTReorder(
      req("PUT", `/api/topics/${FAKE_ID}/reorder`, {}),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with { success: true } after reordering tasks", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id, { title: "Reorder Topic" });
    const task1 = await createTestTask(user.id, {
      title: "Task A",
      topicId: topic.id,
      sortOrder: 0,
    });
    const task2 = await createTestTask(user.id, {
      title: "Task B",
      topicId: topic.id,
      sortOrder: 1,
    });
    authAs(user.id);
    const res = await PUTReorder(
      req("PUT", `/api/topics/${topic.id}/reorder`, {
        taskIds: [task2.id, task1.id],
      }),
      { params: Promise.resolve({ id: topic.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badReq = new Request(`http://localhost/api/topics/${FAKE_ID}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    const res = await PUTReorder(badReq as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when a taskId does not belong to the topic", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id, { title: "Empty Topic" });
    authAs(user.id);
    const res = await PUTReorder(
      req("PUT", `/api/topics/${topic.id}/reorder`, {
        taskIds: [FAKE_ID],
      }),
      { params: Promise.resolve({ id: topic.id }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/topics/import-template ────────────────────────────────────────

describe("POST /api/topics/import-template", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTImportTemplate(
      req("POST", "/api/topics/import-template", { templateKey: "fitness" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTImportTemplate(
      req("POST", "/api/topics/import-template", { templateKey: "fitness" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid templateKey", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTImportTemplate(
      req("POST", "/api/topics/import-template", { templateKey: "nonexistent" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 201 with { topic, tasks } for the fitness template", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTImportTemplate(
      req("POST", "/api/topics/import-template", { templateKey: "fitness" })
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { topic: { id: string }; tasks: unknown[] };
    expect(typeof body.topic.id).toBe("string");
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks.length).toBeGreaterThan(0);
  });

  it("returns 201 with { topic, tasks } for the moving template", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTImportTemplate(
      req("POST", "/api/topics/import-template", { templateKey: "moving" })
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { topic: { id: string }; tasks: unknown[] };
    expect(typeof body.topic.id).toBe("string");
    expect(body.tasks.length).toBeGreaterThan(0);
  });
});
