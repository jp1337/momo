/**
 * Integration tests for webhook endpoint detail routes.
 *
 * Covers:
 *  GET    /api/settings/webhooks/:id — list delivery history
 *  PATCH  /api/settings/webhooks/:id — update webhook endpoint
 *  DELETE /api/settings/webhooks/:id — delete webhook endpoint
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
  GET,
  PATCH,
  DELETE,
} from "@/app/api/settings/webhooks/[id]/route";
import { createTestUser } from "./helpers/fixtures";
import * as webhooksLib from "@/lib/webhooks";
import * as rateLimitLib from "@/lib/rate-limit";
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
  }) as never;
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

// ─── GET /api/settings/webhooks/:id ──────────────────────────────────────────

describe("GET /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req("GET", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when listWebhookDeliveries throws 'not_found'", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "listWebhookDeliveries").mockRejectedValueOnce(
      new Error("not_found")
    );
    const res = await GET(req("GET", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
    spy.mockRestore();
  });

  it("returns 500 when listWebhookDeliveries throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "listWebhookDeliveries").mockRejectedValueOnce(
      new Error("unexpected DB failure")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req("GET", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("returns 200 with { deliveries } on success", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "listWebhookDeliveries").mockResolvedValueOnce([]);
    const res = await GET(req("GET", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { deliveries: unknown[] };
    expect(Array.isArray(body.deliveries)).toBe(true);
    spy.mockRestore();
  });
});

// ─── PATCH /api/settings/webhooks/:id ────────────────────────────────────────

describe("PATCH /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "https://example.com/hook" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "https://example.com/hook" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit").mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "https://example.com/hook" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(429);
    spy.mockRestore();
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badReq = new Request(`http://localhost/api/settings/webhooks/${FAKE_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    }) as never;
    const res = await PATCH(badReq, { params: Promise.resolve({ id: FAKE_ID }) });
    expect(res.status).toBe(400);
  });

  it("returns 422 for an invalid body (bad URL)", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "not-a-url" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 when updateWebhookEndpoint throws 'not_found'", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "updateWebhookEndpoint").mockRejectedValueOnce(
      new Error("not_found")
    );
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "https://example.com/hook" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
    spy.mockRestore();
  });

  it("returns 500 when updateWebhookEndpoint throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "updateWebhookEndpoint").mockRejectedValueOnce(
      new Error("unexpected DB failure")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await PATCH(
      req("PATCH", `/api/settings/webhooks/${FAKE_ID}`, { url: "https://example.com/hook" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── DELETE /api/settings/webhooks/:id ───────────────────────────────────────

describe("DELETE /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(req("DELETE", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETE(req("DELETE", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when deleteWebhookEndpoint throws 'not_found'", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "deleteWebhookEndpoint").mockRejectedValueOnce(
      new Error("not_found")
    );
    const res = await DELETE(req("DELETE", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
    spy.mockRestore();
  });

  it("returns 500 when deleteWebhookEndpoint throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "deleteWebhookEndpoint").mockRejectedValueOnce(
      new Error("unexpected DB failure")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await DELETE(req("DELETE", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("returns 200 with { success: true } when endpoint is deleted", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const spy = vi.spyOn(webhooksLib, "deleteWebhookEndpoint").mockResolvedValueOnce(undefined);
    const res = await DELETE(req("DELETE", `/api/settings/webhooks/${FAKE_ID}`), {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
    spy.mockRestore();
  });
});
