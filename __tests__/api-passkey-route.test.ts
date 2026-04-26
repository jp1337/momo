/**
 * Integration tests for the /api/auth/passkey/* routes.
 *
 * All WebAuthn crypto (createRegistrationOptions, verifyRegistration, etc.)
 * is mocked so tests focus on the HTTP layer: auth enforcement, rate
 * limiting, body validation, cookie handling, and response codes.
 *
 * Routes covered:
 *   POST /api/auth/passkey/register/options
 *   POST /api/auth/passkey/register/verify
 *   POST /api/auth/passkey/login/options
 *   POST /api/auth/passkey/login/verify
 *   POST /api/auth/passkey/second-factor/options
 *   POST /api/auth/passkey/second-factor/verify
 *   PATCH /api/auth/passkey/[id]
 *   DELETE /api/auth/passkey/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/webauthn", () => ({
  createRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  createDiscoverableLoginOptions: vi.fn(),
  createLoginOptionsForUser: vi.fn(),
  verifyLogin: vi.fn(),
  createPasskeyLoginSession: vi.fn(),
  signChallengeToken: vi.fn(),
  verifyChallengeToken: vi.fn(),
  renamePasskey: vi.fn(),
  deletePasskey: vi.fn(),
  listUserPasskeys: vi.fn(),
  CHALLENGE_COOKIE_NAME: "momo_webauthn_challenge",
  CHALLENGE_TTL_SECONDS: 300,
  SESSION_COOKIE_NAME: "authjs.session-token",
  SECURE_SESSION_COOKIE_NAME: "__Secure-authjs.session-token",
  PASSKEY_SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000,
}));

vi.mock("@/lib/totp", () => ({
  markSessionSecondFactorVerified: vi.fn(),
  readSessionTokenFromCookieStore: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ limited: false, resetAt: 0 })),
  rateLimitResponse: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    NODE_ENV: "test",
    AUTH_SECRET: "test-secret-32-chars-long-enough!!",
    REQUIRE_2FA: false,
    WEBAUTHN_RP_ID: "localhost",
    WEBAUTHN_RP_NAME: "Momo Test",
  },
  clientEnv: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock @/lib/db for routes that query the DB directly
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import * as webauthn from "@/lib/webauthn";
import * as totp from "@/lib/totp";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCookies = cookies as ReturnType<typeof vi.fn>;

// Helper to build a mock cookie store
function makeCookieStore(cookieMap: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) =>
      cookieMap[name] ? { name, value: cookieMap[name] } : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

// Helper to make a mock authenticated session
function makeSession(userId = "user-abc", email = "test@example.com") {
  return { user: { id: userId, email, name: "Test User" } };
}

// Helper to build a minimal AuthenticationResponseJSON body
function authResponse() {
  return {
    response: {
      id: "credid",
      rawId: "credid",
      type: "public-key" as const,
      response: {
        clientDataJSON: "abc123",
        authenticatorData: "def456",
        signature: "sig789",
      },
      clientExtensionResults: {},
    },
  };
}

// Helper to build a minimal RegistrationResponseJSON body
function regResponse(name?: string) {
  return {
    name: name ?? null,
    response: {
      id: "newcredid",
      rawId: "newcredid",
      type: "public-key" as const,
      response: {
        clientDataJSON: "clientdata",
        attestationObject: "attestation",
      },
      clientExtensionResults: {},
    },
  };
}

function makeRequest(body?: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/auth/passkey/test", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json", ...headers },
  });
}

// ─── register/options ─────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/register/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.createRegistrationOptions).mockResolvedValue({
      challenge: "test-challenge",
      rp: { id: "localhost", name: "Momo Test" },
      user: { id: new Uint8Array(), name: "test@example.com", displayName: "Test" },
      pubKeyCredParams: [],
      timeout: 60000,
      excludeCredentials: [],
      authenticatorSelection: {},
      attestation: "none",
      extensions: {},
    } as unknown as Awaited<ReturnType<typeof webauthn.createRegistrationOptions>>);
    vi.mocked(webauthn.signChallengeToken).mockReturnValue("signed.token");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/passkey/register/options/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 200 with WebAuthn options when authenticated", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const { POST } = await import("@/app/api/auth/passkey/register/options/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("test-challenge");
  });

  it("calls signChallengeToken with 'reg' kind and userId", async () => {
    mockAuth.mockResolvedValue(makeSession("user-xyz"));
    const { POST } = await import("@/app/api/auth/passkey/register/options/route");
    await POST();
    expect(webauthn.signChallengeToken).toHaveBeenCalledWith("reg", "test-challenge", "user-xyz");
  });
});

// ─── register/verify ──────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/register/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue("stored-challenge");
    vi.mocked(webauthn.verifyRegistration).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "newcredid",
          publicKey: new Uint8Array(),
          counter: 0,
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
      },
    } as unknown as Awaited<ReturnType<typeof webauthn.verifyRegistration>>);
    mockCookies.mockResolvedValue(makeCookieStore({ momo_webauthn_challenge: "signed.token" }));
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest(regResponse()));
    expect(res.status).toBe(401);
  });

  it("returns 410 when challenge cookie is missing", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockCookies.mockResolvedValue(makeCookieStore({}));
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest(regResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 410 when verifyChallengeToken returns null", async () => {
    mockAuth.mockResolvedValue(makeSession());
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue(null);
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest(regResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 400 for invalid body", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest({ name: "ok" /* missing response */ }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with credential info on successful registration", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest(regResponse("My Key")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.credentialID).toBe("newcredid");
    expect(body.deviceType).toBe("singleDevice");
  });

  it("returns 422 when verifyRegistration throws", async () => {
    mockAuth.mockResolvedValue(makeSession());
    vi.mocked(webauthn.verifyRegistration).mockRejectedValue(new Error("registration_failed"));
    const { POST } = await import("@/app/api/auth/passkey/register/verify/route");
    const res = await POST(makeRequest(regResponse()));
    expect(res.status).toBe(422);
  });
});

// ─── login/options ────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/login/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.createDiscoverableLoginOptions).mockResolvedValue({
      challenge: "login-challenge",
      allowCredentials: [],
      rpId: "localhost",
      timeout: 60000,
      userVerification: "preferred",
    } as unknown as Awaited<ReturnType<typeof webauthn.createDiscoverableLoginOptions>>);
    vi.mocked(webauthn.signChallengeToken).mockReturnValue("login.signed.token");
  });

  it("returns 200 without authentication (public endpoint)", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/options/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("login-challenge");
  });

  it("calls signChallengeToken with 'login' kind (no userId)", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/options/route");
    await POST(makeRequest());
    expect(webauthn.signChallengeToken).toHaveBeenCalledWith("login", "login-challenge");
  });
});

// ─── login/verify ─────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/login/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue("stored-challenge");
    vi.mocked(webauthn.verifyLogin).mockResolvedValue({
      userId: "user-abc",
      credentialID: "credid",
    });
    vi.mocked(webauthn.createPasskeyLoginSession).mockResolvedValue("new-session-token");
    mockCookies.mockResolvedValue(makeCookieStore({ momo_webauthn_challenge: "login.token" }));
  });

  it("returns 410 when challenge cookie is missing", async () => {
    mockCookies.mockResolvedValue(makeCookieStore({}));
    const { POST } = await import("@/app/api/auth/passkey/login/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 410 when challenge token is invalid", async () => {
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue(null);
    const { POST } = await import("@/app/api/auth/passkey/login/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 422 when assertion fails", async () => {
    vi.mocked(webauthn.verifyLogin).mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/passkey/login/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ASSERTION_FAILED");
  });

  it("returns 400 for invalid body", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/verify/route");
    const res = await POST(makeRequest({ invalid: true }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and creates a session on success", async () => {
    const { POST } = await import("@/app/api/auth/passkey/login/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(200);
    expect(webauthn.createPasskeyLoginSession).toHaveBeenCalledWith("user-abc", expect.any(Object));
  });
});

// ─── second-factor/options ────────────────────────────────────────────────────

describe("POST /api/auth/passkey/second-factor/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.createLoginOptionsForUser).mockResolvedValue({
      challenge: "sf-challenge",
      allowCredentials: [{ id: "cred1", type: "public-key" }],
      rpId: "localhost",
      timeout: 60000,
      userVerification: "preferred",
    } as unknown as Awaited<ReturnType<typeof webauthn.createLoginOptionsForUser>>);
    vi.mocked(webauthn.signChallengeToken).mockReturnValue("sf.signed.token");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    // Mock DB to return empty passkey list
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    });
    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select);

    const { POST } = await import("@/app/api/auth/passkey/second-factor/options/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 409 when user has no passkeys", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    });
    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select);

    const { POST } = await import("@/app/api/auth/passkey/second-factor/options/route");
    const res = await POST();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("NO_PASSKEYS");
  });

  it("returns 200 with assertion options when passkeys exist", async () => {
    mockAuth.mockResolvedValue(makeSession("user-sf"));
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "cred1" }]),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select);

    const { POST } = await import("@/app/api/auth/passkey/second-factor/options/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("sf-challenge");
  });
});

// ─── second-factor/verify ─────────────────────────────────────────────────────

describe("POST /api/auth/passkey/second-factor/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue("stored-sf-challenge");
    vi.mocked(webauthn.verifyLogin).mockResolvedValue({
      userId: "user-abc",
      credentialID: "credid",
    });
    vi.mocked(totp.readSessionTokenFromCookieStore).mockReturnValue("session-token");
    vi.mocked(totp.markSessionSecondFactorVerified).mockResolvedValue(undefined);
    mockCookies.mockResolvedValue(makeCookieStore({ momo_webauthn_challenge: "sf.token" }));
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(401);
  });

  it("returns 410 when challenge cookie is missing", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockCookies.mockResolvedValue(makeCookieStore({}));
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 410 when challenge token is invalid", async () => {
    mockAuth.mockResolvedValue(makeSession());
    vi.mocked(webauthn.verifyChallengeToken).mockReturnValue(null);
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(410);
  });

  it("returns 422 when assertion fails", async () => {
    mockAuth.mockResolvedValue(makeSession());
    vi.mocked(webauthn.verifyLogin).mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(422);
  });

  it("returns 422 when credential belongs to a different user", async () => {
    mockAuth.mockResolvedValue(makeSession("user-abc"));
    vi.mocked(webauthn.verifyLogin).mockResolvedValue({
      userId: "different-user",
      credentialID: "credid",
    });
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(422);
  });

  it("returns 500 when session cookie is missing", async () => {
    mockAuth.mockResolvedValue(makeSession());
    vi.mocked(totp.readSessionTokenFromCookieStore).mockReturnValue(undefined);
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(500);
  });

  it("returns 200 and marks session verified on success", async () => {
    mockAuth.mockResolvedValue(makeSession("user-abc"));
    const { POST } = await import("@/app/api/auth/passkey/second-factor/verify/route");
    const res = await POST(makeRequest(authResponse()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(totp.markSessionSecondFactorVerified).toHaveBeenCalledWith("session-token");
  });
});

// ─── [id] PATCH (rename) ──────────────────────────────────────────────────────

describe("PATCH /api/auth/passkey/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.renamePasskey).mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/auth/passkey/[id]/route");
    const req = makeRequest({ name: "New Name" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "cred1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (empty name)", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const { PATCH } = await import("@/app/api/auth/passkey/[id]/route");
    const req = makeRequest({ name: "" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "cred1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 and calls renamePasskey on success", async () => {
    mockAuth.mockResolvedValue(makeSession("user-abc"));
    const { PATCH } = await import("@/app/api/auth/passkey/[id]/route");
    const req = makeRequest({ name: "My YubiKey" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "cred1" }) });
    expect(res.status).toBe(200);
    expect(webauthn.renamePasskey).toHaveBeenCalledWith("user-abc", "cred1", "My YubiKey");
  });
});

// ─── [id] DELETE (revoke) ─────────────────────────────────────────────────────

describe("DELETE /api/auth/passkey/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webauthn.deletePasskey).mockResolvedValue(undefined);
  });

  const makeDeleteRequest = () =>
    new NextRequest("http://localhost/api/auth/passkey/cred1", { method: "DELETE" });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/auth/passkey/[id]/route");
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "cred1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 200 and calls deletePasskey on success (REQUIRE_2FA=false)", async () => {
    mockAuth.mockResolvedValue(makeSession("user-abc"));
    const { DELETE } = await import("@/app/api/auth/passkey/[id]/route");
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "cred1" }) });
    expect(res.status).toBe(200);
    expect(webauthn.deletePasskey).toHaveBeenCalledWith("user-abc", "cred1");
  });
});
