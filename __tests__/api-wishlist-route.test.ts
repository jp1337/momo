/**
 * Integration tests for the wishlist API routes.
 *
 * Covers:
 *  GET  /api/wishlist
 *  POST /api/wishlist
 *  PATCH   /api/wishlist/:id
 *  DELETE  /api/wishlist/:id
 *  POST    /api/wishlist/:id/buy
 *  DELETE  /api/wishlist/:id/buy
 *  POST    /api/wishlist/:id/discard
 *  DELETE  /api/wishlist/:id/discard
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
import { GET, POST } from "@/app/api/wishlist/route";
import {
  PATCH as PATCHById,
  DELETE as DELETEById,
} from "@/app/api/wishlist/[id]/route";
import {
  POST as POSTBuy,
  DELETE as DELETEBuy,
} from "@/app/api/wishlist/[id]/buy/route";
import {
  POST as POSTDiscard,
  DELETE as DELETEDiscard,
} from "@/app/api/wishlist/[id]/discard/route";
import {
  createTestUser,
  createTestWishlistItem,
} from "./helpers/fixtures";
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

// ─── GET /api/wishlist ────────────────────────────────────────────────────────

describe("GET /api/wishlist", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req("GET", "/api/wishlist"));
    expect(res.status).toBe(401);
  });

  it("returns { items: [], budget } for a user with no items", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await GET(req("GET", "/api/wishlist"));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; budget: unknown };
    expect(body.items).toEqual([]);
    expect(body.budget).toBeDefined();
  });

  it("returns existing wishlist items", async () => {
    const user = await createTestUser();
    await createTestWishlistItem(user.id, { title: "Gaming Chair" });
    authAs(user.id);
    const res = await GET(req("GET", "/api/wishlist"));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Array<{ title: string }> };
    expect(body.items.length).toBe(1);
    expect(body.items[0].title).toBe("Gaming Chair");
  });

  it("isolates items between users", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestWishlistItem(userA.id, { title: "User A Item" });
    authAs(userB.id);
    const res = await GET(req("GET", "/api/wishlist"));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });
});

// ─── POST /api/wishlist ───────────────────────────────────────────────────────

describe("POST /api/wishlist", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST", "/api/wishlist", { title: "PS5" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(req("POST", "/api/wishlist", { title: "PS5" }));
    expect(res.status).toBe(403);
  });

  it("returns 422 for an empty title", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(req("POST", "/api/wishlist", { title: "" }));
    expect(res.status).toBe(422);
  });

  it("returns 201 with the created item", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POST(
      req("POST", "/api/wishlist", { title: "PS5", price: 500, priority: "WANT" })
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { item: { title: string } };
    expect(body.item.title).toBe("PS5");
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const badJsonReq = new Request("http://localhost/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await POST(badJsonReq);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/wishlist/:id ──────────────────────────────────────────────────

describe("PATCH /api/wishlist/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCHById(
      req("PATCH", `/api/wishlist/${FAKE_ID}`, { title: "New Title" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await PATCHById(
      req("PATCH", `/api/wishlist/${FAKE_ID}`, { title: "New Title" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with the updated item", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, { title: "Old Title" });
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/wishlist/${item.id}`, { title: "New Title" }),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { item: { title: string } };
    expect(body.item.title).toBe("New Title");
  });

  it("returns 404 for a non-existent item", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await PATCHById(
      req("PATCH", `/api/wishlist/${FAKE_ID}`, { title: "Irrelevant" }),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when trying to update another user's item", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const item = await createTestWishlistItem(userA.id, { title: "A Item" });
    authAs(userB.id);
    const res = await PATCHById(
      req("PATCH", `/api/wishlist/${item.id}`, { title: "Stolen Title" }),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/wishlist/:id ─────────────────────────────────────────────────

describe("DELETE /api/wishlist/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEById(
      req("DELETE", `/api/wishlist/${FAKE_ID}`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEById(
      req("DELETE", `/api/wishlist/${FAKE_ID}`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with { success: true } on successful deletion", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, { title: "To Delete" });
    authAs(user.id);
    const res = await DELETEById(
      req("DELETE", `/api/wishlist/${item.id}`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 404 for a non-existent or foreign item", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEById(
      req("DELETE", `/api/wishlist/${FAKE_ID}`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/wishlist/:id/buy ───────────────────────────────────────────────

describe("POST /api/wishlist/:id/buy", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTBuy(
      req("POST", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTBuy(
      req("POST", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with { item, coinsSpent: 0 } for an item without coin threshold", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, {
      title: "Free Item",
      coinUnlockThreshold: null,
    });
    authAs(user.id);
    const res = await POSTBuy(
      req("POST", `/api/wishlist/${item.id}/buy`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { item: { status: string }; coinsSpent: number };
    expect(body.item.status).toBe("BOUGHT");
    expect(body.coinsSpent).toBe(0);
  });

  it("returns 422 INSUFFICIENT_COINS when user lacks coins for threshold item", async () => {
    const user = await createTestUser({ coins: 0 });
    const item = await createTestWishlistItem(user.id, {
      title: "Expensive Item",
      coinUnlockThreshold: 9999,
    });
    authAs(user.id);
    const res = await POSTBuy(
      req("POST", `/api/wishlist/${item.id}/buy`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("INSUFFICIENT_COINS");
  });

  it("returns 404 when item does not exist", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTBuy(
      req("POST", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/wishlist/:id/buy ─────────────────────────────────────────────

describe("DELETE /api/wishlist/:id/buy (unmark as bought)", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEBuy(
      req("DELETE", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEBuy(
      req("DELETE", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with { item, coinsRefunded } after unmarking a bought item", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, {
      title: "Bought Item",
      status: "BOUGHT",
      coinUnlockThreshold: null,
    });
    authAs(user.id);
    const res = await DELETEBuy(
      req("DELETE", `/api/wishlist/${item.id}/buy`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { item: { status: string }; coinsRefunded: number };
    expect(body.item.status).toBe("OPEN");
    expect(typeof body.coinsRefunded).toBe("number");
  });

  it("returns 404 when item does not exist", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEBuy(
      req("DELETE", `/api/wishlist/${FAKE_ID}/buy`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when item is not currently marked as bought", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, {
      title: "Open Item",
      status: "OPEN",
    });
    authAs(user.id);
    const res = await DELETEBuy(
      req("DELETE", `/api/wishlist/${item.id}/buy`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/wishlist/:id/discard ──────────────────────────────────────────

describe("POST /api/wishlist/:id/discard", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POSTDiscard(
      req("POST", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POSTDiscard(
      req("POST", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with { item } where status is DISCARDED", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, { title: "To Discard" });
    authAs(user.id);
    const res = await POSTDiscard(
      req("POST", `/api/wishlist/${item.id}/discard`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { item: { status: string } };
    expect(body.item.status).toBe("DISCARDED");
  });

  it("returns 404 for non-existent item", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await POSTDiscard(
      req("POST", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/wishlist/:id/discard ────────────────────────────────────────

describe("DELETE /api/wishlist/:id/discard (restore)", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETEDiscard(
      req("DELETE", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a readonly API key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await DELETEDiscard(
      req("DELETE", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with restored item (status OPEN) after restoring a discarded item", async () => {
    const user = await createTestUser();
    const item = await createTestWishlistItem(user.id, {
      title: "Discarded Item",
      status: "DISCARDED",
    });
    authAs(user.id);
    const res = await DELETEDiscard(
      req("DELETE", `/api/wishlist/${item.id}/discard`),
      { params: Promise.resolve({ id: item.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { item: { status: string } };
    expect(body.item.status).toBe("OPEN");
  });

  it("returns 404 when item does not exist", async () => {
    const user = await createTestUser();
    authAs(user.id);
    const res = await DELETEDiscard(
      req("DELETE", `/api/wishlist/${FAKE_ID}/discard`),
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(404);
  });
});
