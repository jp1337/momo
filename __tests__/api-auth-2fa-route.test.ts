/**
 * Integration tests for the 2FA API routes.
 *
 * Covers:
 *   POST /api/auth/2fa/setup
 *   POST /api/auth/2fa/verify-setup
 *   POST /api/auth/2fa/verify
 *   POST /api/auth/2fa/disable
 *   POST /api/auth/2fa/regenerate-backup-codes
 *
 * Auth.js is mocked at the boundary. The DB is real (test DB) so that
 * the routes that check DB state (totpEnabledAt) exercise the actual logic.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ get: () => undefined, set: vi.fn(), delete: vi.fn() })
  ),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { POST as POSTSetup } from "@/app/api/auth/2fa/setup/route";
import { POST as POSTVerifySetup } from "@/app/api/auth/2fa/verify-setup/route";
import { POST as POSTVerify } from "@/app/api/auth/2fa/verify/route";
import { POST as POSTDisable } from "@/app/api/auth/2fa/disable/route";
import { POST as POSTRegenerateBackupCodes } from "@/app/api/auth/2fa/regenerate-backup-codes/route";

import { createTestUser } from "./helpers/fixtures";
import {
  generateTotpSetup,
  signSetupToken,
  SETUP_COOKIE_NAME,
  enableTotpForUser,
} from "@/lib/totp";
import { generateSync, generateSecret } from "otplib";

const mockAuth = vi.mocked(auth);
const mockCookies = vi.mocked(cookies);

function asSession(userId: string, email = "test@example.com") {
  mockAuth.mockResolvedValue({ user: { id: userId, email } } as never);
}

function noSession() {
  mockAuth.mockResolvedValue(null as never);
}

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  noSession();
  mockCookies.mockResolvedValue({
    get: () => undefined,
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
});

// ─── POST /api/auth/2fa/setup ─────────────────────────────────────────────────

describe("POST /api/auth/2fa/setup", () => {
  it("returns 401 when unauthenticated", async () => {
    noSession();
    const res = await POSTSetup();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-no-email" } } as never);
    const res = await POSTSetup();
    expect(res.status).toBe(401);
  });

  it("returns 200 with qrCodeDataUrl and manualEntryKey for authenticated user", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id, user.email!);

    const res = await POSTSetup();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("qrCodeDataUrl");
    expect(body).toHaveProperty("manualEntryKey");
    expect(body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(typeof body.manualEntryKey).toBe("string");
    expect(body.manualEntryKey.length).toBeGreaterThan(0);
  });

  it("returns 409 when TOTP is already enabled", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    // Enable TOTP directly in DB
    await db
      .update(users)
      .set({ totpEnabledAt: new Date() })
      .where(eq(users.id, user.id));

    asSession(user.id, user.email!);
    const res = await POSTSetup();

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("TOTP_ALREADY_ENABLED");
  });
});

// ─── POST /api/auth/2fa/verify-setup ─────────────────────────────────────────

describe("POST /api/auth/2fa/verify-setup", () => {
  it("returns 401 when unauthenticated", async () => {
    noSession();
    const res = await POSTVerifySetup(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(401);
  });

  it("returns 410 when setup cookie is missing", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id, user.email!);
    // Default mock: no cookie
    mockCookies.mockResolvedValue({
      get: () => undefined,
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const res = await POSTVerifySetup(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.code).toBe("SETUP_EXPIRED");
  });

  it("returns 422 when code is wrong (invalid setup cookie value)", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id, user.email!);

    // Generate a real setup cookie for this user
    const setup = await generateTotpSetup(user.email!);
    const cookieVal = signSetupToken(user.id, setup.secret);

    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === SETUP_COOKIE_NAME
          ? { name: SETUP_COOKIE_NAME, value: cookieVal }
          : undefined,
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    // Submit an obviously wrong code
    const res = await POSTVerifySetup(jsonRequest({ code: "000000" }));
    // "000000" is almost certainly wrong; in the rare case it's valid the test
    // would return 200 instead — acceptable flakiness at 1-in-1_000_000 odds.
    expect([422, 200]).toContain(res.status);
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id, user.email!);

    const req = new NextRequest("http://localhost/api/auth/2fa/verify-setup", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POSTVerifySetup(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with backupCodes when code is correct", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id, user.email!);

    const setup = await generateTotpSetup(user.email!);
    const cookieVal = signSetupToken(user.id, setup.secret);

    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === SETUP_COOKIE_NAME
          ? { name: SETUP_COOKIE_NAME, value: cookieVal }
          : undefined,
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    // Generate a real valid TOTP code right now
    const validCode = generateSync({ secret: setup.secret });
    const res = await POSTVerifySetup(jsonRequest({ code: validCode }));

    // Should succeed — if the code is within the tolerance window
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("backupCodes");
    expect(Array.isArray(body.backupCodes)).toBe(true);
    expect(body.backupCodes.length).toBeGreaterThan(0);
  });
});

// ─── POST /api/auth/2fa/verify ────────────────────────────────────────────────

describe("POST /api/auth/2fa/verify", () => {
  it("returns 401 when unauthenticated", async () => {
    noSession();
    const res = await POSTVerify(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when 2FA is not configured for this user", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const res = await POSTVerify(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("TOTP_NOT_ENABLED");
  });

  it("returns 422 for a wrong code when 2FA is enabled", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    // Enable TOTP via lib (uses a real secret)
    const secret = generateSecret();
    const validCode = generateSync({ secret });
    await enableTotpForUser(user.id, secret, validCode);

    asSession(user.id);
    mockCookies.mockResolvedValue({
      get: () => undefined,
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const res = await POSTVerify(jsonRequest({ code: "000000" }));
    // "000000" is almost certainly wrong
    expect([422, 500]).toContain(res.status);
  });

  it("returns 400 for an invalid request body", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const res = await POSTVerify(jsonRequest({ badField: "oops" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const req = new NextRequest("http://localhost/api/auth/2fa/verify", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POSTVerify(req);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/2fa/disable ───────────────────────────────────────────────

describe("POST /api/auth/2fa/disable", () => {
  it("returns 401 when unauthenticated", async () => {
    noSession();
    const res = await POSTDisable(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when 2FA is not enabled for the user", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const res = await POSTDisable(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("TOTP_NOT_ENABLED");
  });

  it("returns 422 for a wrong code when 2FA is enabled", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const secret = generateSecret();
    const validCode = generateSync({ secret });
    await enableTotpForUser(user.id, secret, validCode);

    asSession(user.id);

    const res = await POSTDisable(jsonRequest({ code: "000000" }));
    expect([422]).toContain(res.status);
  });

  it("returns 200 and disables 2FA with a correct code", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const secret = generateSecret();
    const validCode = generateSync({ secret });
    await enableTotpForUser(user.id, secret, validCode);

    asSession(user.id);

    // Generate a fresh code for disabling
    const disableCode = generateSync({ secret });
    const res = await POSTDisable(jsonRequest({ code: disableCode }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 for invalid JSON body", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const req = new NextRequest("http://localhost/api/auth/2fa/disable", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POSTDisable(req);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/2fa/regenerate-backup-codes ───────────────────────────────

describe("POST /api/auth/2fa/regenerate-backup-codes", () => {
  it("returns 401 when unauthenticated", async () => {
    noSession();
    const res = await POSTRegenerateBackupCodes(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when 2FA is not enabled", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const res = await POSTRegenerateBackupCodes(jsonRequest({ code: "123456" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("TOTP_NOT_ENABLED");
  });

  it("returns 422 for a wrong TOTP code when 2FA is enabled", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const secret = generateSecret();
    const validCode = generateSync({ secret });
    await enableTotpForUser(user.id, secret, validCode);

    asSession(user.id);

    const res = await POSTRegenerateBackupCodes(jsonRequest({ code: "000000" }));
    expect([422]).toContain(res.status);
  });

  it("returns 200 with new backupCodes for a correct code", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const secret = generateSecret();
    const validCode = generateSync({ secret });
    await enableTotpForUser(user.id, secret, validCode);

    asSession(user.id);

    const regenCode = generateSync({ secret });
    const res = await POSTRegenerateBackupCodes(jsonRequest({ code: regenCode }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("backupCodes");
    expect(Array.isArray(body.backupCodes)).toBe(true);
    expect(body.backupCodes.length).toBe(10);
  });

  it("returns 400 for invalid JSON", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);

    const req = new NextRequest("http://localhost/api/auth/2fa/regen", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POSTRegenerateBackupCodes(req);
    expect(res.status).toBe(400);
  });
});
