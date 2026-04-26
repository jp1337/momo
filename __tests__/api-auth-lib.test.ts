/**
 * Unit tests for lib/api-auth.ts.
 *
 * Covers resolveApiUser and resolveVerifiedApiUser with all relevant auth
 * branches: Bearer token (valid / invalid / readonly), session cookie (with
 * and without 2FA), and the missing-session edge cases.
 *
 * The pure helper functions verifiedAuthErrorResponse and readonlyKeyResponse
 * are covered in api-auth-helpers.test.ts.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("@/lib/api-keys", () => ({
  resolveApiKeyUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ get: () => undefined, set: vi.fn(), delete: vi.fn() })
  ),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("@/lib/totp", () => ({
  isSessionSecondFactorVerified: vi.fn().mockResolvedValue(false),
  readSessionTokenFromCookieStore: vi.fn().mockReturnValue(undefined),
  userHasSecondFactor: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/sessions", () => ({
  maybeUpdateSessionMetadata: vi.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { resolveApiKeyUser } from "@/lib/api-keys";
import {
  isSessionSecondFactorVerified,
  readSessionTokenFromCookieStore,
  userHasSecondFactor,
} from "@/lib/totp";
import { cookies } from "next/headers";
import {
  resolveApiUser,
  resolveVerifiedApiUser,
} from "@/lib/api-auth";

const mockAuth = vi.mocked(auth);
const mockResolveApiKeyUser = vi.mocked(resolveApiKeyUser);
const mockIsSessionSecondFactorVerified = vi.mocked(isSessionSecondFactorVerified);
const mockReadSessionToken = vi.mocked(readSessionTokenFromCookieStore);
const mockUserHasSecondFactor = vi.mocked(userHasSecondFactor);
const mockCookies = vi.mocked(cookies);

/** Build a request with an Authorization: Bearer header. */
function bearerRequest(token: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Build a request with no auth header (session-cookie path). */
function sessionRequest(): Request {
  return new Request("http://localhost/api/test");
}

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults
  mockAuth.mockResolvedValue(null);
  mockResolveApiKeyUser.mockResolvedValue(null);
  mockIsSessionSecondFactorVerified.mockResolvedValue(false);
  mockReadSessionToken.mockReturnValue(undefined);
  mockUserHasSecondFactor.mockResolvedValue(false);
  mockCookies.mockResolvedValue({
    get: () => undefined,
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
});

// ─── resolveApiUser ───────────────────────────────────────────────────────────

describe("resolveApiUser", () => {
  it("returns { userId, readonly: false } for a valid bearer token", async () => {
    const userId = "user-uuid-1";
    mockResolveApiKeyUser.mockResolvedValue({ userId, readonly: false });

    const result = await resolveApiUser(bearerRequest("momo_live_validtoken"));

    expect(result).toEqual({ userId, readonly: false });
  });

  it("returns null for an invalid bearer token (no fallthrough to session)", async () => {
    mockResolveApiKeyUser.mockResolvedValue(null);
    // Even if a session exists it must NOT be used
    mockAuth.mockResolvedValue({ user: { id: "session-user" } } as never);

    const result = await resolveApiUser(bearerRequest("momo_live_invalid"));

    expect(result).toBeNull();
  });

  it("returns { readonly: true } for a read-only bearer token", async () => {
    const userId = "user-uuid-2";
    mockResolveApiKeyUser.mockResolvedValue({ userId, readonly: true });

    const result = await resolveApiUser(bearerRequest("momo_live_readonly"));

    expect(result).toEqual({ userId, readonly: true });
  });

  it("returns { userId, readonly: false } for a valid session when no bearer is present", async () => {
    const userId = "session-user-id";
    mockAuth.mockResolvedValue({ user: { id: userId } } as never);

    const result = await resolveApiUser(sessionRequest());

    expect(result).toEqual({ userId, readonly: false });
  });

  it("returns null when no bearer and no session", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await resolveApiUser(sessionRequest());

    expect(result).toBeNull();
  });

  it("returns null when session exists but user.id is missing", async () => {
    // session.user has no id field
    mockAuth.mockResolvedValue({ user: {} } as never);

    const result = await resolveApiUser(sessionRequest());

    expect(result).toBeNull();
  });
});

// ─── resolveVerifiedApiUser ───────────────────────────────────────────────────

describe("resolveVerifiedApiUser", () => {
  it("returns { ok: true, user } for a valid bearer token", async () => {
    const userId = "user-uuid-bearer";
    mockResolveApiKeyUser.mockResolvedValue({ userId, readonly: false });

    const result = await resolveVerifiedApiUser(bearerRequest("momo_live_valid"));

    expect(result).toEqual({ ok: true, user: { userId, readonly: false } });
  });

  it("returns { ok: false, reason: 'UNAUTHORIZED' } for an invalid bearer token", async () => {
    mockResolveApiKeyUser.mockResolvedValue(null);

    const result = await resolveVerifiedApiUser(bearerRequest("momo_live_bad"));

    expect(result).toEqual({ ok: false, reason: "UNAUTHORIZED" });
  });

  it("returns { ok: true } for a session user without 2FA configured", async () => {
    const userId = "session-no-2fa";
    mockAuth.mockResolvedValue({ user: { id: userId } } as never);
    mockUserHasSecondFactor.mockResolvedValue(false);

    const result = await resolveVerifiedApiUser(sessionRequest());

    expect(result).toEqual({ ok: true, user: { userId, readonly: false } });
  });

  it("returns { ok: false, reason: 'UNAUTHORIZED' } when session is missing", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await resolveVerifiedApiUser(sessionRequest());

    expect(result).toEqual({ ok: false, reason: "UNAUTHORIZED" });
  });

  it("returns { ok: false, reason: 'TOTP_REQUIRED' } when 2FA is configured but not verified", async () => {
    const userId = "session-2fa-unverified";
    mockAuth.mockResolvedValue({ user: { id: userId } } as never);
    mockUserHasSecondFactor.mockResolvedValue(true);
    // Cookie store returns a session token, but it is not verified
    mockReadSessionToken.mockReturnValue("some-session-token");
    mockIsSessionSecondFactorVerified.mockResolvedValue(false);

    const result = await resolveVerifiedApiUser(sessionRequest());

    expect(result).toEqual({ ok: false, reason: "TOTP_REQUIRED" });
  });

  it("returns { ok: true } when 2FA is configured and the session is verified", async () => {
    const userId = "session-2fa-verified";
    mockAuth.mockResolvedValue({ user: { id: userId } } as never);
    mockUserHasSecondFactor.mockResolvedValue(true);
    mockReadSessionToken.mockReturnValue("verified-session-token");
    mockIsSessionSecondFactorVerified.mockResolvedValue(true);

    const result = await resolveVerifiedApiUser(sessionRequest());

    expect(result).toEqual({ ok: true, user: { userId, readonly: false } });
  });

  it("returns { ok: false, reason: 'TOTP_REQUIRED' } when 2FA configured but no session token cookie", async () => {
    const userId = "session-2fa-no-cookie";
    mockAuth.mockResolvedValue({ user: { id: userId } } as never);
    mockUserHasSecondFactor.mockResolvedValue(true);
    // No cookie available
    mockReadSessionToken.mockReturnValue(undefined);

    const result = await resolveVerifiedApiUser(sessionRequest());

    expect(result).toEqual({ ok: false, reason: "TOTP_REQUIRED" });
  });
});
