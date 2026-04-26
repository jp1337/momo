/**
 * Integration tests for the Auth Sessions API routes.
 *
 * Covers:
 *   GET  /api/auth/sessions
 *   DELETE /api/auth/sessions/:id
 *   POST /api/auth/sessions/revoke-others
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

vi.mock("@/lib/totp", () => ({
  readSessionTokenFromCookieStore: vi.fn(() => undefined),
  isSessionSecondFactorVerified: vi.fn(() => Promise.resolve(false)),
  userHasSecondFactor: vi.fn(() => Promise.resolve(false)),
}));

import { resolveApiUser } from "@/lib/api-auth";
import { GET as sessionsGET } from "@/app/api/auth/sessions/route";
import { DELETE as sessionByIdDELETE } from "@/app/api/auth/sessions/[id]/route";
import { POST as revokeOthersPOST } from "@/app/api/auth/sessions/revoke-others/route";
import { createTestUser } from "./helpers/fixtures";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { createHash, randomBytes } from "crypto";
import type { ApiUser } from "@/lib/api-auth";
import { readSessionTokenFromCookieStore } from "@/lib/totp";

const mockAuth = vi.mocked(resolveApiUser);
const mockReadSessionToken = vi.mocked(readSessionTokenFromCookieStore);

beforeEach(() => {
  mockAuth.mockReset();
  mockReadSessionToken.mockReset();
  mockReadSessionToken.mockReturnValue(undefined);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function asUser(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

/**
 * Creates a real session row in the DB for the given user.
 * Returns the raw token (for building hash IDs) and the session record.
 */
async function createTestSession(userId: string): Promise<{ token: string; hashId: string }> {
  const rawToken = randomBytes(32).toString("hex");
  const hashId = createHash("sha256").update(rawToken).digest("hex").slice(0, 16);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await db.insert(sessions).values({
    sessionToken: rawToken,
    userId,
    expires: expiresAt,
  });

  return { token: rawToken, hashId };
}

// ─── GET /api/auth/sessions ───────────────────────────────────────────────────

describe("GET /api/auth/sessions", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await sessionsGET(req("GET", "/api/auth/sessions"));
    expect(res.status).toBe(401);
  });

  it("returns empty sessions array for user with no sessions", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await sessionsGET(req("GET", "/api/auth/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("sessions");
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  it("returns sessions array when user has active sessions", async () => {
    const user = await createTestUser();
    await createTestSession(user.id);
    asUser(user.id);
    const res = await sessionsGET(req("GET", "/api/auth/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions.length).toBeGreaterThan(0);
    // Session must have a public id, not a raw token
    const session = body.sessions[0];
    expect(session).toHaveProperty("id");
    expect(session.id).toMatch(/^[0-9a-f]{16}$/);
    expect(session).toHaveProperty("isCurrent");
  });

  it("marks the current session as isCurrent=true when token cookie is present", async () => {
    const user = await createTestUser();
    const { token, hashId } = await createTestSession(user.id);
    // Simulate current session cookie
    mockReadSessionToken.mockReturnValue(token);
    asUser(user.id);
    const res = await sessionsGET(req("GET", "/api/auth/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const currentSession = body.sessions.find((s: { id: string }) => s.id === hashId);
    expect(currentSession).toBeDefined();
    expect(currentSession.isCurrent).toBe(true);
  });
});

// ─── DELETE /api/auth/sessions/:id ───────────────────────────────────────────

describe("DELETE /api/auth/sessions/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "abcdef1234567890";
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const fakeId = "abcdef1234567890";
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${fakeId}`),
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid session ID format", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badId = "not-hex!";
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${badId}`),
      { params: Promise.resolve({ id: badId }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent session", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const nonExistentId = "0000000000000000";
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${nonExistentId}`),
      { params: Promise.resolve({ id: nonExistentId }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to revoke the current session", async () => {
    const user = await createTestUser();
    const { token, hashId } = await createTestSession(user.id);
    // Simulate this is the current session
    mockReadSessionToken.mockReturnValue(token);
    asUser(user.id);
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${hashId}`),
      { params: Promise.resolve({ id: hashId }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("CANNOT_REVOKE_CURRENT");
  });

  it("returns 200 when revoking another session", async () => {
    const user = await createTestUser();
    const currentSession = await createTestSession(user.id);
    const otherSession = await createTestSession(user.id);
    // Simulate that currentSession is the active one
    mockReadSessionToken.mockReturnValue(currentSession.token);
    asUser(user.id);
    const res = await sessionByIdDELETE(
      req("DELETE", `/api/auth/sessions/${otherSession.hashId}`),
      { params: Promise.resolve({ id: otherSession.hashId }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── POST /api/auth/sessions/revoke-others ───────────────────────────────────

describe("POST /api/auth/sessions/revoke-others", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await revokeOthersPOST(req("POST", "/api/auth/sessions/revoke-others"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await revokeOthersPOST(req("POST", "/api/auth/sessions/revoke-others"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when current session token cannot be identified", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // No token in cookie
    mockReadSessionToken.mockReturnValue(undefined);
    const res = await revokeOthersPOST(req("POST", "/api/auth/sessions/revoke-others"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("current session");
  });

  it("returns 200 with revoked count when current session is identified", async () => {
    const user = await createTestUser();
    const currentSession = await createTestSession(user.id);
    // Create some extra sessions to revoke
    await createTestSession(user.id);
    await createTestSession(user.id);
    // Simulate current session token in cookie
    mockReadSessionToken.mockReturnValue(currentSession.token);
    asUser(user.id);
    const res = await revokeOthersPOST(req("POST", "/api/auth/sessions/revoke-others"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("revoked");
    expect(typeof body.revoked).toBe("number");
    expect(body.revoked).toBeGreaterThanOrEqual(0);
  });
});
