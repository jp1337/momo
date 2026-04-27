/**
 * Integration tests for the tasks API routes.
 *
 * Covers: GET /api/tasks, POST /api/tasks, GET/PATCH/DELETE /api/tasks/:id,
 * POST/DELETE /api/tasks/:id/complete
 *
 * Strategy: resolveApiUser is fully mocked so tests control auth without
 * needing real sessions. The lib functions hit the real test DB.
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

// next/headers is imported transitively — stub it so the import graph resolves
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("@/lib/tasks", async (orig) => {
  const actual = await orig<typeof import("@/lib/tasks")>();
  return {
    ...actual,
    getUserTasks: vi.fn(actual.getUserTasks),
    createTask: vi.fn(actual.createTask),
  };
});

import { resolveApiUser } from "@/lib/api-auth";
import { getUserTasks, createTask } from "@/lib/tasks";
import { GET, POST } from "@/app/api/tasks/route";
import {
  GET as GETById,
  PATCH as PATCHById,
  DELETE as DELETEById,
} from "@/app/api/tasks/[id]/route";
import {
  POST as POSTComplete,
  DELETE as DELETEUncomplete,
} from "@/app/api/tasks/[id]/complete/route";
import {
  createTestUser,
  createTestTopic,
  createTestTask,
} from "./helpers/fixtures";
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

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

// ─── GET /api/tasks ───────────────────────────────────────────────────────────

describe("GET /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req("GET", "/api/tasks"));
    expect(res.status).toBe(401);
  });

  it("returns empty array for a new user", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/tasks"));
    expect(res.status).toBe(200);
    const body = await res.json() as { tasks: unknown[] };
    expect(body.tasks).toHaveLength(0);
  });

  it("returns tasks belonging to the user", async () => {
    const user = await createTestUser();
    await createTestTask(user.id, { title: "Task Alpha" });
    await createTestTask(user.id, { title: "Task Beta" });
    authAs(user.id);
    const res = await GET(req("GET", "/api/tasks"));
    const body = await res.json() as { tasks: Array<{ title: string }> };
    expect(body.tasks).toHaveLength(2);
    const titles = body.tasks.map((t) => t.title);
    expect(titles).toContain("Task Alpha");
    expect(titles).toContain("Task Beta");
  });

  it("filters by ?topicId=<uuid>", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id);
    await createTestTask(user.id, { title: "In Topic", topicId: topic.id });
    await createTestTask(user.id, { title: "No Topic" });
    authAs(user.id);
    const res = await GET(req("GET", `/api/tasks?topicId=${topic.id}`));
    const body = await res.json() as { tasks: Array<{ title: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe("In Topic");
  });

  it("filters by ?topicId=none (tasks without a topic)", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id);
    await createTestTask(user.id, { title: "In Topic", topicId: topic.id });
    await createTestTask(user.id, { title: "No Topic" });
    authAs(user.id);
    const res = await GET(req("GET", "/api/tasks?topicId=none"));
    const body = await res.json() as { tasks: Array<{ title: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe("No Topic");
  });

  it("isolates tasks to the authenticated user", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestTask(userA.id, { title: "A's task" });
    await createTestTask(userB.id, { title: "B's task" });
    authAs(userA.id);
    const res = await GET(req("GET", "/api/tasks"));
    const body = await res.json() as { tasks: Array<{ title: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe("A's task");
  });
});

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

describe("POST /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      req("POST", "/api/tasks", { title: "X", type: "ONE_TIME", priority: "NORMAL" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(
      req("POST", "/api/tasks", { title: "X", type: "ONE_TIME", priority: "NORMAL" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badReq = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 422 for failed Zod validation (empty title)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(
      req("POST", "/api/tasks", { title: "", type: "ONE_TIME", priority: "NORMAL" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 201 with task object for a valid body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(
      req("POST", "/api/tasks", {
        title: "Buy groceries",
        type: "ONE_TIME",
        priority: "NORMAL",
        coinValue: 1,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { task: { title: string; userId: string } };
    expect(body.task.title).toBe("Buy groceries");
    expect(body.task.userId).toBe(user.id);
  });

  it("returns 404 when topicId points to a non-existent topic", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(
      req("POST", "/api/tasks", {
        title: "Orphan Task",
        type: "ONE_TIME",
        priority: "NORMAL",
        coinValue: 1,
        topicId: FAKE_ID,
      })
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────

describe("GET /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETById(req("GET", `/api/tasks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with task object for the owner", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Find Me" });
    authAs(user.id);
    const res = await GETById(req("GET", `/api/tasks/${task.id}`), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { id: string; title: string } };
    expect(body.task.id).toBe(task.id);
    expect(body.task.title).toBe("Find Me");
  });

  it("returns 404 for a non-existent task ID", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GETById(req("GET", `/api/tasks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when another user tries to access the task", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const task = await createTestTask(userA.id, { title: "Secret" });
    authAs(userB.id);
    const res = await GETById(req("GET", `/api/tasks/${task.id}`), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

describe("PATCH /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCHById(
      req("PATCH", `/api/tasks/${FAKE_ID}`, { title: "Updated" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCHById(
      req("PATCH", `/api/tasks/${FAKE_ID}`, { title: "Updated" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with updated task title", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Old Title" });
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/tasks/${task.id}`, { title: "New Title" }),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { title: string } };
    expect(body.task.title).toBe("New Title");
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/tasks/${FAKE_ID}`, { title: "Ghost" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

describe("DELETE /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEById(req("DELETE", `/api/tasks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEById(req("DELETE", `/api/tasks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with { success: true } after deleting", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Bye" });
    authAs(user.id);
    const res = await DELETEById(req("DELETE", `/api/tasks/${task.id}`), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEById(req("DELETE", `/api/tasks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/tasks/:id/complete ─────────────────────────────────────────────

describe("POST /api/tasks/:id/complete", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTComplete(req("POST", `/api/tasks/${FAKE_ID}/complete`, {}), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTComplete(req("POST", `/api/tasks/${FAKE_ID}/complete`, {}), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with completion result shape", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Complete Me", type: "ONE_TIME" });
    authAs(user.id);
    const res = await POSTComplete(
      req("POST", `/api/tasks/${task.id}/complete`, { timezone: "Europe/Berlin" }),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as {
      task: { completedAt: string | null };
      coinsEarned: number;
      streakCurrent: number;
      unlockedAchievements: unknown[];
      shieldUsed: boolean;
    };
    expect(body.coinsEarned).toBeGreaterThanOrEqual(0);
    expect(typeof body.streakCurrent).toBe("number");
    expect(Array.isArray(body.unlockedAchievements)).toBe(true);
    expect(typeof body.shieldUsed).toBe("boolean");
    expect(body.task.completedAt).not.toBeNull();
  });

  it("task is marked as completed after the call", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Done!", type: "ONE_TIME" });
    authAs(user.id);
    const res = await POSTComplete(
      req("POST", `/api/tasks/${task.id}/complete`, {}),
      { params: Promise.resolve({ id: task.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { completedAt: string | null } };
    expect(body.task.completedAt).not.toBeNull();
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTComplete(req("POST", `/api/tasks/${FAKE_ID}/complete`, {}), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when task is already completed", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Already Done",
      type: "ONE_TIME",
      completedAt: new Date(),
    });
    authAs(user.id);
    const res = await POSTComplete(req("POST", `/api/tasks/${task.id}/complete`, {}), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(409);
  });
});

// ─── DELETE /api/tasks/:id/complete (uncomplete) ──────────────────────────────

describe("DELETE /api/tasks/:id/complete", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${FAKE_ID}/complete`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${FAKE_ID}/complete`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and task is open again after uncomplete", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, {
      title: "Undo Me",
      type: "ONE_TIME",
      completedAt: new Date(),
    });
    authAs(user.id);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${task.id}/complete`), {
      params: Promise.resolve({ id: task.id }) ,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { task: { completedAt: string | null } };
    expect(body.task.completedAt).toBeNull();
  });

  it("returns 404 for a non-existent task", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${FAKE_ID}/complete`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when task is not completed", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Not Done", type: "ONE_TIME" });
    authAs(user.id);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${task.id}/complete`), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 409 when task is RECURRING (cannot be uncompleted)", async () => {
    const user = await createTestUser();
    const task = await createTestTask(user.id, { title: "Recurring", type: "RECURRING" });
    authAs(user.id);
    const res = await DELETEUncomplete(req("DELETE", `/api/tasks/${task.id}/complete`), {
      params: Promise.resolve({ id: task.id }),
    });
    expect(res.status).toBe(409);
  });
});

// ─── GET /api/tasks — additional branches ─────────────────────────────────────

describe("GET /api/tasks — additional branches", () => {
  it("filters by ?type=ONE_TIME", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/tasks?type=ONE_TIME"));
    expect(res.status).toBe(200);
    const body = await res.json() as { tasks: unknown[] };
    expect(Array.isArray(body.tasks)).toBe(true);
  });

  it("returns 500 when getUserTasks throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    vi.mocked(getUserTasks).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(req("GET", "/api/tasks"));
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/tasks — 500 error path ─────────────────────────────────────────

describe("POST /api/tasks — 500 error path", () => {
  it("returns 500 when createTask throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    vi.mocked(createTask).mockRejectedValueOnce(new Error("unexpected DB error"));
    const res = await POST(
      req("POST", "/api/tasks", { title: "Boom", type: "ONE_TIME" })
    );
    expect(res.status).toBe(500);
  });
});
