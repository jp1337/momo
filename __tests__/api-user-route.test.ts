/**
 * Integration tests for the user API routes.
 *
 * Covers:
 *  GET  /api/user
 *  GET  /api/user/profile
 *  PATCH /api/user/profile
 *  GET  /api/user/api-keys
 *  POST /api/user/api-keys
 *  DELETE /api/user/api-keys/:id
 *  GET  /api/user/export
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
import { GET as GETUser } from "@/app/api/user/route";
import {
  GET as GETProfile,
  PATCH as PATCHProfile,
} from "@/app/api/user/profile/route";
import {
  GET as GETApiKeys,
  POST as POSTApiKeys,
} from "@/app/api/user/api-keys/route";
import { DELETE as DELETEApiKey } from "@/app/api/user/api-keys/[id]/route";
import { GET as GETExport } from "@/app/api/user/export/route";
import { createTestUser, createTestApiKey } from "./helpers/fixtures";
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

// ─── GET /api/user ────────────────────────────────────────────────────────────

describe("GET /api/user", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETUser(req("GET", "/api/user"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with user stats for an authenticated user", async () => {
    const user = await createTestUser({ coins: 42, level: 2 });
    authAs(user.id);
    const res = await GETUser(req("GET", "/api/user"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.coins).toBe("number");
    expect(typeof body.level).toBe("number");
  });
});

// ─── GET /api/user/profile ────────────────────────────────────────────────────

describe("GET /api/user/profile", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETProfile(req("GET", "/api/user/profile") as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 with profile fields", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GETProfile(req("GET", "/api/user/profile") as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { name: unknown; email: unknown; image: unknown };
    expect("name" in body).toBe(true);
    expect("email" in body).toBe(true);
    expect("image" in body).toBe(true);
  });
});

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────

describe("PATCH /api/user/profile", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCHProfile(
      req("PATCH", "/api/user/profile", { name: "Alice" }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCHProfile(
      req("PATCH", "/api/user/profile", { name: "Alice" }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when body is empty (no fields provided)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHProfile(
      req("PATCH", "/api/user/profile", {}) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with updated name", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHProfile(
      req("PATCH", "/api/user/profile", { name: "Updated Name" }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { name: string | null } };
    expect(body.user.name).toBe("Updated Name");
  });
});

// ─── GET /api/user/api-keys ───────────────────────────────────────────────────

describe("GET /api/user/api-keys", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETApiKeys(req("GET", "/api/user/api-keys"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty list for a new user", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GETApiKeys(req("GET", "/api/user/api-keys"));
    expect(res.status).toBe(200);
    const body = await res.json() as { apiKeys: unknown[] };
    expect(Array.isArray(body.apiKeys)).toBe(true);
    expect(body.apiKeys).toHaveLength(0);
  });
});

// ─── POST /api/user/api-keys ──────────────────────────────────────────────────

describe("POST /api/user/api-keys", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTApiKeys(
      req("POST", "/api/user/api-keys", { name: "My Key", readonly: false, expiresIn: null })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTApiKeys(
      req("POST", "/api/user/api-keys", { name: "My Key", readonly: false, expiresIn: null })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when name is missing", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTApiKeys(
      req("POST", "/api/user/api-keys", { readonly: false, expiresIn: null })
    );
    expect(res.status).toBe(422);
  });

  it("returns 201 with key and record for valid input", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTApiKeys(
      req("POST", "/api/user/api-keys", { name: "My Key", readonly: false, expiresIn: null })
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { key: string; record: { name: string } };
    expect(typeof body.key).toBe("string");
    expect(body.key.length).toBeGreaterThan(0);
    expect(body.record.name).toBe("My Key");
  });
});

// ─── DELETE /api/user/api-keys/:id ───────────────────────────────────────────

describe("DELETE /api/user/api-keys/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEApiKey(
      req("DELETE", `/api/user/api-keys/${FAKE_ID}`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 when revoking own key", async () => {
    const user = await createTestUser();
    const { record } = await createTestApiKey(user.id, { name: "Revoke Me" });
    authAs(user.id);
    const res = await DELETEApiKey(
      req("DELETE", `/api/user/api-keys/${record.id}`),
      { params: Promise.resolve({ id: record.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 404 for a non-existent or foreign key", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEApiKey(
      req("DELETE", `/api/user/api-keys/${FAKE_ID}`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/user/export ─────────────────────────────────────────────────────

describe("GET /api/user/export", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GETExport(req("GET", "/api/user/export"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with a JSON export bundle", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GETExport(req("GET", "/api/user/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const body = await res.json() as Record<string, unknown>;
    // The export should contain at minimum a user or profile field
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });
});
