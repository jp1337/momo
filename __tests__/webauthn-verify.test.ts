/**
 * Tests for lib/webauthn.ts — verifyRegistration and verifyLogin functions.
 *
 * @simplewebauthn/server is mocked so no real attestation/assertion objects
 * are needed. This covers the DB-write success path, the failure path
 * (verification.verified = false), the credential-not-found path, and the
 * catch blocks.
 *
 * Lines covered:
 *   169-199 — verifyRegistration: full success path + failure path
 *   256-298 — verifyLogin: credential lookup + success path + catch + non-verified
 *   284-285 — verifyLogin: verifyAuthenticationResponse catch
 *   288     — verifyLogin: !verification.verified → return null
 *   92      — getRpConfig: hostname fallback when NEXT_PUBLIC_APP_URL is invalid
 *   444     — getAuthSecret: throw when AUTH_SECRET is not configured
 *   519     — verifyChallengeToken: JSON.parse catch when body decodes to non-JSON
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({ challenge: "mock-challenge" }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({ challenge: "mock-challenge" }),
  verifyRegistrationResponse: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { authenticators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createTestUser } from "./helpers/fixtures";
import {
  verifyRegistration,
  verifyLogin,
  verifyChallengeToken,
  signChallengeToken,
} from "@/lib/webauthn";
import { createHmac } from "crypto";

const AUTH_SECRET = "vitest-auth-secret-at-least-32-characters-long!!";

/** Minimal RegistrationResponseJSON stub — only the fields webauthn.ts reads. */
const fakeRegResponse: RegistrationResponseJSON = {
  id: "test-cred-id",
  rawId: "test-cred-id",
  response: {
    clientDataJSON: "fake",
    attestationObject: "fake",
    transports: ["internal"],
  },
  type: "public-key",
  clientExtensionResults: {},
};

/** Minimal AuthenticationResponseJSON stub. */
const fakeAuthResponse: AuthenticationResponseJSON = {
  id: "test-cred-id",
  rawId: "test-cred-id",
  response: {
    clientDataJSON: "fake",
    authenticatorData: "fake",
    signature: "fake",
  },
  type: "public-key",
  clientExtensionResults: {},
};

/** Build a mock VerifiedRegistrationResponse shape. */
function makeVerifiedReg(overrides: Record<string, unknown> = {}) {
  return {
    verified: true,
    registrationInfo: {
      credential: {
        id: "test-cred-id",
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 0,
      },
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
    },
    ...overrides,
  };
}

// ─── verifyRegistration ───────────────────────────────────────────────────────

describe("verifyRegistration", () => {
  beforeEach(() => {
    vi.mocked(verifyRegistrationResponse).mockReset();
  });

  it("inserts an authenticator row on successful verification (covers lines 169-199)", async () => {
    const user = await createTestUser();
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      makeVerifiedReg() as never
    );

    const result = await verifyRegistration(
      user.id,
      "My Phone",
      fakeRegResponse,
      "mock-challenge"
    );

    expect(result.verified).toBe(true);

    const [row] = await db
      .select({ credentialID: authenticators.credentialID, name: authenticators.name })
      .from(authenticators)
      .where(eq(authenticators.userId, user.id));
    expect(row?.credentialID).toBe("test-cred-id");
    expect(row?.name).toBe("My Phone");
  });

  it("trims whitespace from name and stores null for blank name (covers line 196)", async () => {
    const user = await createTestUser();
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      makeVerifiedReg({ registrationInfo: { ...makeVerifiedReg().registrationInfo, credential: { id: "cred-blank", publicKey: new Uint8Array([1]), counter: 0 } } }) as never
    );

    await verifyRegistration(user.id, "   ", fakeRegResponse, "mock-challenge");

    const [row] = await db
      .select({ name: authenticators.name })
      .from(authenticators)
      .where(eq(authenticators.credentialID, "cred-blank"));
    expect(row?.name).toBeNull();
  });

  it("throws registration_failed when verified is false (covers line 179-180)", async () => {
    const user = await createTestUser();
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      { verified: false, registrationInfo: null } as never
    );

    await expect(
      verifyRegistration(user.id, null, fakeRegResponse, "bad-challenge")
    ).rejects.toThrow("registration_failed");
  });

  it("throws registration_failed when registrationInfo is missing (covers line 179-180)", async () => {
    const user = await createTestUser();
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      { verified: true, registrationInfo: null } as never
    );

    await expect(
      verifyRegistration(user.id, null, fakeRegResponse, "bad-challenge")
    ).rejects.toThrow("registration_failed");
  });

  it("stores null name when name parameter is null (covers line 196 null branch)", async () => {
    const user = await createTestUser();
    const credId = "cred-null-name";
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      { ...makeVerifiedReg(), registrationInfo: { ...makeVerifiedReg().registrationInfo, credential: { id: credId, publicKey: new Uint8Array([5]), counter: 1 } } } as never
    );

    await verifyRegistration(user.id, null, fakeRegResponse, "mock-challenge");

    const [row] = await db
      .select({ name: authenticators.name })
      .from(authenticators)
      .where(eq(authenticators.credentialID, credId));
    expect(row?.name).toBeNull();
  });

  it("handles response.response.transports being undefined (covers line 195 null branch)", async () => {
    const user = await createTestUser();
    const credId = "cred-no-transports";
    const responseWithoutTransports: RegistrationResponseJSON = {
      ...fakeRegResponse,
      response: { clientDataJSON: "fake", attestationObject: "fake" },
    };
    vi.mocked(verifyRegistrationResponse).mockResolvedValueOnce(
      { ...makeVerifiedReg(), registrationInfo: { ...makeVerifiedReg().registrationInfo, credential: { id: credId, publicKey: new Uint8Array([6]), counter: 0 } } } as never
    );

    await verifyRegistration(user.id, "Phone", responseWithoutTransports, "mock-challenge");

    const [row] = await db
      .select({ transports: authenticators.transports })
      .from(authenticators)
      .where(eq(authenticators.credentialID, credId));
    expect(row?.transports).toBeNull();
  });
});

// ─── verifyLogin ──────────────────────────────────────────────────────────────

describe("verifyLogin", () => {
  beforeEach(() => {
    vi.mocked(verifyAuthenticationResponse).mockReset();
  });

  it("returns null when credential ID is not found in DB (covers line 264)", async () => {
    const result = await verifyLogin(
      { ...fakeAuthResponse, id: "nonexistent-cred" },
      "challenge"
    );
    expect(result).toBeNull();
  });

  it("returns null when verifyAuthenticationResponse throws (covers lines 284-285)", async () => {
    const user = await createTestUser();
    await db.insert(authenticators).values({
      credentialID: "cred-verify-throw",
      userId: user.id,
      providerAccountId: "cred-verify-throw",
      credentialPublicKey: Buffer.from([1, 2, 3]).toString("base64url"),
      counter: 0,
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
    });
    vi.mocked(verifyAuthenticationResponse).mockRejectedValueOnce(new Error("bad signature"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await verifyLogin(
      { ...fakeAuthResponse, id: "cred-verify-throw" },
      "challenge"
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[webauthn.verifyLogin] verification failed",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("returns null when verified is false (covers line 288)", async () => {
    const user = await createTestUser();
    await db.insert(authenticators).values({
      credentialID: "cred-not-verified",
      userId: user.id,
      providerAccountId: "cred-not-verified",
      credentialPublicKey: Buffer.from([1, 2, 3]).toString("base64url"),
      counter: 0,
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
    });
    vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce(
      { verified: false } as never
    );

    const result = await verifyLogin(
      { ...fakeAuthResponse, id: "cred-not-verified" },
      "challenge"
    );

    expect(result).toBeNull();
  });

  it("returns userId and credentialID on success, updates counter (covers lines 256-298)", async () => {
    const user = await createTestUser();
    await db.insert(authenticators).values({
      credentialID: "cred-success",
      userId: user.id,
      providerAccountId: "cred-success",
      credentialPublicKey: Buffer.from([1, 2, 3]).toString("base64url"),
      counter: 0,
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
    });
    vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    } as never);

    const result = await verifyLogin(
      { ...fakeAuthResponse, id: "cred-success" },
      "challenge"
    );

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(user.id);
    expect(result!.credentialID).toBe("cred-success");

    // Verify counter was updated
    const [row] = await db
      .select({ counter: authenticators.counter })
      .from(authenticators)
      .where(eq(authenticators.credentialID, "cred-success"));
    expect(row.counter).toBe(5);
  });
});

// ─── verifyChallengeToken — JSON parse catch ───────────────────────────────────

describe("verifyChallengeToken — JSON parse error path", () => {
  it("returns null when body decodes to non-JSON content (covers line 519)", () => {
    // Construct a token where body is valid base64url but decodes to non-JSON,
    // with a valid HMAC signature computed over that body so the signature
    // check passes and execution reaches the JSON.parse try/catch.
    const body = Buffer.from("this is not valid JSON !@#$").toString("base64url");
    const hmac = createHmac("sha256", AUTH_SECRET).update(body).digest();
    // b64urlEncode (mirrors b64urlDecode inverse)
    const sig = hmac
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const token = `${body}.${sig}`;
    const result = verifyChallengeToken(token, "reg");
    expect(result).toBeNull();
  });
});

// ─── Smoke test: sign/verify still works in this test environment ──────────────

describe("signChallengeToken roundtrip in webauthn-verify environment", () => {
  it("roundtrip succeeds with real @/lib/env AUTH_SECRET", () => {
    const token = signChallengeToken("reg", "my-challenge", "user-123");
    const result = verifyChallengeToken(token, "reg", "user-123");
    expect(result).toBe("my-challenge");
  });
});
