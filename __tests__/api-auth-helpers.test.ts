/**
 * Tests for the pure helper functions in lib/api-auth.ts
 *
 * Covers:
 *  - verifiedAuthErrorResponse(): the three 2FA-gate reason codes produce 401
 *    with correct `code` and `error` fields, and the BEARER_SESSION_REQUIRED
 *    reason (used by resolveSessionOnlyApiUser) produces a distinct 403
 *  - readonlyKeyResponse(): produces 403 with Forbidden error
 *
 * These are pure Response-building functions — no Next.js runtime, no DB,
 * no auth() calls needed.
 *
 * Because lib/api-auth.ts has transitive imports through next-auth / next/headers
 * that are not available in the Vitest Node.js environment, we mock those
 * modules at the boundary so only the pure helpers are exercised.
 */

import { describe, it, expect, vi } from "vitest";

// ── Mock the transitive Next.js / auth imports ────────────────────────────────
// These modules are only used by resolveApiUser / resolveVerifiedApiUser,
// not by the two pure functions we are testing.

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api-keys", () => ({
  resolveApiKeyUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/totp", () => ({
  isSessionSecondFactorVerified: vi.fn().mockResolvedValue(false),
  readSessionTokenFromCookieStore: vi.fn().mockReturnValue(undefined),
  userHasSecondFactor: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/sessions", () => ({
  maybeUpdateSessionMetadata: vi.fn(),
}));

// ── Now import the functions under test ───────────────────────────────────────

import {
  verifiedAuthErrorResponse,
  readonlyKeyResponse,
} from "@/lib/api-auth";

// ─── verifiedAuthErrorResponse ────────────────────────────────────────────────

describe("verifiedAuthErrorResponse", () => {
  it("returns a 401 response for UNAUTHORIZED reason", async () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    expect(response.status).toBe(401);
  });

  it("returns correct code field for UNAUTHORIZED", async () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    const body = await response.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns a non-empty error message for UNAUTHORIZED", async () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns 401 for TOTP_SETUP_REQUIRED reason", async () => {
    const response = verifiedAuthErrorResponse("TOTP_SETUP_REQUIRED");
    expect(response.status).toBe(401);
  });

  it("returns correct code field for TOTP_SETUP_REQUIRED", async () => {
    const response = verifiedAuthErrorResponse("TOTP_SETUP_REQUIRED");
    const body = await response.json();
    expect(body.code).toBe("TOTP_SETUP_REQUIRED");
  });

  it("returns a descriptive error message for TOTP_SETUP_REQUIRED", async () => {
    const response = verifiedAuthErrorResponse("TOTP_SETUP_REQUIRED");
    const body = await response.json();
    expect(body.error).toMatch(/two-factor/i);
  });

  it("returns 401 for TOTP_REQUIRED reason", async () => {
    const response = verifiedAuthErrorResponse("TOTP_REQUIRED");
    expect(response.status).toBe(401);
  });

  it("returns correct code field for TOTP_REQUIRED", async () => {
    const response = verifiedAuthErrorResponse("TOTP_REQUIRED");
    const body = await response.json();
    expect(body.code).toBe("TOTP_REQUIRED");
  });

  it("returns a descriptive error message for TOTP_REQUIRED", async () => {
    const response = verifiedAuthErrorResponse("TOTP_REQUIRED");
    const body = await response.json();
    expect(body.error).toMatch(/two-factor|verify/i);
  });

  it("returns a Response object (not a plain object)", () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    expect(response).toBeInstanceOf(Response);
  });

  it("UNAUTHORIZED error message says 'Unauthorized'", async () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("all three reasons produce distinct error messages", async () => {
    const responses = await Promise.all([
      verifiedAuthErrorResponse("UNAUTHORIZED").json(),
      verifiedAuthErrorResponse("TOTP_SETUP_REQUIRED").json(),
      verifiedAuthErrorResponse("TOTP_REQUIRED").json(),
    ]);
    const errors = responses.map((b) => b.error);
    const uniqueErrors = new Set(errors);
    expect(uniqueErrors.size).toBe(3);
  });

  it("all three reasons produce distinct code fields", async () => {
    const responses = await Promise.all([
      verifiedAuthErrorResponse("UNAUTHORIZED").json(),
      verifiedAuthErrorResponse("TOTP_SETUP_REQUIRED").json(),
      verifiedAuthErrorResponse("TOTP_REQUIRED").json(),
    ]);
    const codes = responses.map((b) => b.code);
    expect(codes).toEqual(
      expect.arrayContaining(["UNAUTHORIZED", "TOTP_SETUP_REQUIRED", "TOTP_REQUIRED"])
    );
  });

  it("response Content-Type is application/json", () => {
    const response = verifiedAuthErrorResponse("UNAUTHORIZED");
    const contentType = response.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });

  it("body contains both error and code fields", async () => {
    for (const reason of ["UNAUTHORIZED", "TOTP_SETUP_REQUIRED", "TOTP_REQUIRED"] as const) {
      const body = await verifiedAuthErrorResponse(reason).json();
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");
    }
  });

  it("returns a 403 (not 401) for BEARER_SESSION_REQUIRED — distinct from the other three, which are 401", async () => {
    const response = verifiedAuthErrorResponse("BEARER_SESSION_REQUIRED");
    expect(response.status).toBe(403);
  });

  it("returns correct code field for BEARER_SESSION_REQUIRED", async () => {
    const response = verifiedAuthErrorResponse("BEARER_SESSION_REQUIRED");
    const body = await response.json();
    expect(body.code).toBe("BEARER_SESSION_REQUIRED");
  });

  it("BEARER_SESSION_REQUIRED message explains the refusal, not a generic invalid-credentials message", async () => {
    const response = verifiedAuthErrorResponse("BEARER_SESSION_REQUIRED");
    const body = await response.json();
    expect(body.error).toMatch(/session|browser/i);
    expect(body.error).not.toBe("Unauthorized");
  });
});

// ─── readonlyKeyResponse ─────────────────────────────────────────────────────

describe("readonlyKeyResponse", () => {
  it("returns a 403 status", () => {
    const response = readonlyKeyResponse();
    expect(response.status).toBe(403);
  });

  it("returns a Response object", () => {
    const response = readonlyKeyResponse();
    expect(response).toBeInstanceOf(Response);
  });

  it("includes an error field with 'Forbidden'", async () => {
    const response = readonlyKeyResponse();
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("includes a descriptive message field mentioning read-only", async () => {
    const response = readonlyKeyResponse();
    const body = await response.json();
    expect(typeof body.message).toBe("string");
    expect(body.message).toMatch(/read-only/i);
  });

  it("response Content-Type is application/json", () => {
    const response = readonlyKeyResponse();
    const contentType = response.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });

  it("is not a 401 response (distinct from auth failure)", () => {
    const response = readonlyKeyResponse();
    expect(response.status).not.toBe(401);
  });

  it("includes a machine-readable code field of READONLY_KEY", async () => {
    const response = readonlyKeyResponse();
    const body = await response.json();
    // readonlyKeyResponse now carries 'code' alongside 'message', matching
    // its sibling helpers (RATE_LIMITED, BEARER_SESSION_REQUIRED, etc.) and
    // CLAUDE.md's { error, code? } contract for API errors.
    expect(body.code).toBe("READONLY_KEY");
  });

  it("mentions the read-write key suggestion in the message", async () => {
    const response = readonlyKeyResponse();
    const body = await response.json();
    expect(body.message).toMatch(/read-write/i);
  });

  it("calling it multiple times always returns 403", () => {
    for (let i = 0; i < 5; i++) {
      const response = readonlyKeyResponse();
      expect(response.status).toBe(403);
    }
  });

  it("body has error and message fields", async () => {
    const body = await readonlyKeyResponse().json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("message");
  });
});
