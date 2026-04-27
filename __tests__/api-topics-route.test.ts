/**
 * Integration tests for the topics API routes.
 *
 * Covers: GET /api/topics, POST /api/topics,
 * GET/PATCH/DELETE /api/topics/:id
 *
 * Strategy: resolveApiUser is fully mocked — auth is controlled per test.
 * The lib functions hit the real test DB.
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
import { GET, POST } from "@/app/api/topics/route";
import {
  GET as GETById,
  PATCH as PATCHById,
  DELETE as DELETEById,
} from "@/app/api/topics/[id]/route";
import { createTestUser, createTestTopic } from "./helpers/fixtures";
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

// ─── GET /api/topics ──────────────────────────────────────────────────────────

describe("GET /api/topics", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req("GET", "/api/topics"));
    expect(res.status).toBe(401);
  });

  it("returns empty array for a new user", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/topics"));
    expect(res.status).toBe(200);
    const body = await res.json() as { topics: unknown[] };
    expect(body.topics).toHaveLength(0);
  });

  it("returns active topics belonging to the user", async () => {
    const user = await createTestUser();
    await createTestTopic(user.id, { title: "Topic Alpha" });
    await createTestTopic(user.id, { title: "Topic Beta" });
    authAs(user.id);
    const res = await GET(req("GET", "/api/topics"));
    const body = await res.json() as { topics: Array<{ title: string }> };
    expect(body.topics).toHaveLength(2);
    const titles = body.topics.map((t) => t.title);
    expect(titles).toContain("Topic Alpha");
    expect(titles).toContain("Topic Beta");
  });

  it("isolates topics to the authenticated user", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestTopic(userA.id, { title: "A's topic" });
    await createTestTopic(userB.id, { title: "B's topic" });
    authAs(userA.id);
    const res = await GET(req("GET", "/api/topics"));
    const body = await res.json() as { topics: Array<{ title: string }> };
    expect(body.topics).toHaveLength(1);
    expect(body.topics[0].title).toBe("A's topic");
  });
});

// ─── POST /api/topics ─────────────────────────────────────────────────────────

describe("POST /api/topics", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST", "/api/topics", { title: "New Topic" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(req("POST", "/api/topics", { title: "New Topic" }));
    expect(res.status).toBe(403);
  });

  it("returns 422 for an empty title", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req("POST", "/api/topics", { title: "" }));
    expect(res.status).toBe(422);
  });

  it("returns 201 with topic object for a valid body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req("POST", "/api/topics", { title: "My Topic" }));
    expect(res.status).toBe(201);
    const body = await res.json() as { topic: { title: string; userId: string } };
    expect(body.topic.title).toBe("My Topic");
    expect(body.topic.userId).toBe(user.id);
  });
});

// ─── GET /api/topics/:id ──────────────────────────────────────────────────────

describe("GET /api/topics/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETById(req("GET", `/api/topics/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with topic object for the owner", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id, { title: "Find Me" });
    authAs(user.id);
    const res = await GETById(req("GET", `/api/topics/${topic.id}`), {
      params: Promise.resolve({ id: topic.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { topic: { id: string; title: string } };
    expect(body.topic.id).toBe(topic.id);
    expect(body.topic.title).toBe("Find Me");
  });

  it("returns 404 for a non-existent topic ID", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GETById(req("GET", `/api/topics/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when another user tries to access the topic", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const topic = await createTestTopic(userA.id, { title: "Secret Topic" });
    authAs(userB.id);
    const res = await GETById(req("GET", `/api/topics/${topic.id}`), {
      params: Promise.resolve({ id: topic.id }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/topics/:id ────────────────────────────────────────────────────

describe("PATCH /api/topics/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCHById(
      req("PATCH", `/api/topics/${FAKE_ID}`, { title: "Updated" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCHById(
      req("PATCH", `/api/topics/${FAKE_ID}`, { title: "Updated" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with updated topic", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id, { title: "Old Name" });
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/topics/${topic.id}`, { title: "New Name" }),
      { params: Promise.resolve({ id: topic.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { topic: { title: string } };
    expect(body.topic.title).toBe("New Name");
  });

  it("returns 404 for a non-existent topic", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/topics/${FAKE_ID}`, { title: "Updated" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/topics/:id ───────────────────────────────────────────────────

describe("DELETE /api/topics/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEById(req("DELETE", `/api/topics/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEById(req("DELETE", `/api/topics/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with { success: true } after deleting", async () => {
    const user = await createTestUser();
    const topic = await createTestTopic(user.id, { title: "Goodbye" });
    authAs(user.id);
    const res = await DELETEById(req("DELETE", `/api/topics/${topic.id}`), {
      params: Promise.resolve({ id: topic.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 404 for a non-existent topic", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEById(req("DELETE", `/api/topics/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });
});
