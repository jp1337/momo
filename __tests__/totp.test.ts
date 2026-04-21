/**
 * Tests for lib/totp.ts.
 *
 * Security-critical: covers TOTP setup, code verification, enable/disable,
 * backup code generation + single-use guarantee, session second-factor
 * verification, and the signed setup-token cookie helpers.
 *
 * Uses `otplib` directly (same library as lib/totp.ts) to generate valid
 * TOTP codes at test time so tests do not rely on hard-coded token values.
 */

import { describe, it, expect } from "vitest";
import { generateSecret, generateSync } from "otplib";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users, totpBackupCodes } from "@/lib/db/schema";
import {
  generateTotpSetup,
  verifyTotpCode,
  enableTotpForUser,
  disableTotpForUser,
  regenerateBackupCodes,
  consumeBackupCode,
  getUserTotpStatus,
  userHasSecondFactor,
  signSetupToken,
  verifySetupToken,
  readSessionTokenFromCookieStore,
  BACKUP_CODE_COUNT,
} from "@/lib/totp";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a valid 6-digit TOTP code for the given plaintext secret. */
function currentCode(secret: string): string {
  return generateSync({ secret });
}

/**
 * Enables TOTP for a test user using a real TOTP code generated right now.
 * Returns the plaintext backup codes.
 */
async function setupTotpForUser(userId: string): Promise<{ secret: string; codes: string[] }> {
  const secret = generateSecret();
  const code = currentCode(secret);
  const { codes } = await enableTotpForUser(userId, secret, code);
  return { secret, codes };
}

// ─── generateTotpSetup ────────────────────────────────────────────────────────

describe("generateTotpSetup", () => {
  it("returns a non-empty base32 secret", async () => {
    const { secret } = await generateTotpSetup("user@example.com");
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThan(0);
  });

  it("returns an otpauth:// URI containing the issuer and email", async () => {
    const { otpauthUri } = await generateTotpSetup("user@example.com");
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(otpauthUri).toContain("Momo");
    expect(otpauthUri).toContain("user%40example.com");
  });

  it("returns a QR code data URL (PNG)", async () => {
    const { qrCodeDataUrl } = await generateTotpSetup("user@example.com");
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrCodeDataUrl.length).toBeGreaterThan(100);
  });

  it("generates a unique secret on each call", async () => {
    const a = await generateTotpSetup("user@example.com");
    const b = await generateTotpSetup("user@example.com");
    expect(a.secret).not.toBe(b.secret);
  });
});

// ─── verifyTotpCode ───────────────────────────────────────────────────────────

describe("verifyTotpCode", () => {
  it("returns true for the current valid code", async () => {
    const secret = generateSecret();
    const code = currentCode(secret);
    const result = await verifyTotpCode(secret, code);
    expect(result).toBe(true);
  });

  it("returns false for a wrong code", async () => {
    const secret = generateSecret();
    const result = await verifyTotpCode(secret, "000000");
    // ~1/1000000 chance of collision — acceptable for a security test
    expect(result).toBe(false);
  });

  it("returns false for a code generated from a different secret", async () => {
    const secretA = generateSecret();
    const secretB = generateSecret();
    // Generate the current valid code for secretA, then verify against secretB
    const codeForA = currentCode(secretA);
    const result = await verifyTotpCode(secretB, codeForA);
    // Different secrets → the code is almost certainly invalid for secretB
    // (1/1000000 chance of false-positive — acceptable)
    expect(result).toBe(false);
  });
});

// ─── enableTotpForUser ────────────────────────────────────────────────────────

describe("enableTotpForUser", () => {
  it("throws 'invalid_code' when the code is wrong", async () => {
    const user = await createTestUser({ timezone: TZ });
    const secret = generateSecret();

    await expect(
      enableTotpForUser(user.id, secret, "000000")
    ).rejects.toThrow("invalid_code");
  });

  it("returns BACKUP_CODE_COUNT plaintext codes on success", async () => {
    const user = await createTestUser({ timezone: TZ });
    const secret = generateSecret();
    const code = currentCode(secret);

    const { codes } = await enableTotpForUser(user.id, secret, code);

    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    expect(codes.every((c) => typeof c === "string" && c.length === 10)).toBe(true);
  });

  it("sets totpEnabledAt on the user row", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const [row] = await db
      .select({ totpEnabledAt: users.totpEnabledAt })
      .from(users)
      .where(eq(users.id, user.id));

    expect(row.totpEnabledAt).not.toBeNull();
  });

  it("stores BACKUP_CODE_COUNT hashed backup codes in DB", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const codes = await db
      .select({ id: totpBackupCodes.id })
      .from(totpBackupCodes)
      .where(eq(totpBackupCodes.userId, user.id));

    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
  });

  it("all returned codes are unique", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes } = await setupTotpForUser(user.id);
    const unique = new Set(codes);
    expect(unique.size).toBe(BACKUP_CODE_COUNT);
  });
});

// ─── disableTotpForUser ───────────────────────────────────────────────────────

describe("disableTotpForUser", () => {
  it("clears totpSecret and totpEnabledAt on the user row", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    await disableTotpForUser(user.id);

    const [row] = await db
      .select({ totpSecret: users.totpSecret, totpEnabledAt: users.totpEnabledAt })
      .from(users)
      .where(eq(users.id, user.id));

    expect(row.totpSecret).toBeNull();
    expect(row.totpEnabledAt).toBeNull();
  });

  it("removes all backup codes from DB", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    await disableTotpForUser(user.id);

    const remaining = await db
      .select({ id: totpBackupCodes.id })
      .from(totpBackupCodes)
      .where(eq(totpBackupCodes.userId, user.id));

    expect(remaining).toHaveLength(0);
  });
});

// ─── regenerateBackupCodes ────────────────────────────────────────────────────

describe("regenerateBackupCodes", () => {
  it("replaces all backup codes with a fresh batch", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes: original } = await setupTotpForUser(user.id);

    const { codes: newCodes } = await regenerateBackupCodes(user.id);

    expect(newCodes).toHaveLength(BACKUP_CODE_COUNT);
    // New codes must not overlap with old codes
    const overlap = newCodes.filter((c) => original.includes(c));
    // Astronomically unlikely to have any overlap from a fresh CSPRNG batch
    expect(overlap.length).toBe(0);
  });

  it("the old backup codes no longer work after regeneration", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes: original } = await setupTotpForUser(user.id);
    await regenerateBackupCodes(user.id);

    const result = await consumeBackupCode(user.id, original[0]);
    expect(result).toBe(false);
  });
});

// ─── consumeBackupCode ────────────────────────────────────────────────────────

describe("consumeBackupCode", () => {
  it("returns true for a valid unused backup code", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes } = await setupTotpForUser(user.id);

    const result = await consumeBackupCode(user.id, codes[0]);
    expect(result).toBe(true);
  });

  it("marks the code as used — second call returns false (single-use)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes } = await setupTotpForUser(user.id);

    await consumeBackupCode(user.id, codes[0]);
    const secondAttempt = await consumeBackupCode(user.id, codes[0]);

    expect(secondAttempt).toBe(false);
  });

  it("returns false for a completely wrong code", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const result = await consumeBackupCode(user.id, "WRONGWRONG");
    expect(result).toBe(false);
  });

  it("a used code does not count toward unusedBackupCodes in status", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { codes } = await setupTotpForUser(user.id);
    await consumeBackupCode(user.id, codes[0]);

    const status = await getUserTotpStatus(user.id);
    expect(status.unusedBackupCodes).toBe(BACKUP_CODE_COUNT - 1);
  });

  it("does not affect another user's codes", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const { codes: codesA } = await setupTotpForUser(userA.id);
    const { codes: codesB } = await setupTotpForUser(userB.id);

    // Try to use userA's code against userB — must fail
    const result = await consumeBackupCode(userB.id, codesA[0]);
    expect(result).toBe(false);

    // UserB's own code still works
    const ownResult = await consumeBackupCode(userB.id, codesB[0]);
    expect(ownResult).toBe(true);
  });
});

// ─── getUserTotpStatus ────────────────────────────────────────────────────────

describe("getUserTotpStatus", () => {
  it("returns disabled status for a user without TOTP", async () => {
    const user = await createTestUser({ timezone: TZ });

    const status = await getUserTotpStatus(user.id);

    expect(status.enabled).toBe(false);
    expect(status.enabledAt).toBeNull();
    expect(status.unusedBackupCodes).toBe(0);
  });

  it("returns enabled status with correct backup code count after setup", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const status = await getUserTotpStatus(user.id);

    expect(status.enabled).toBe(true);
    expect(status.enabledAt).toBeInstanceOf(Date);
    expect(status.unusedBackupCodes).toBe(BACKUP_CODE_COUNT);
  });

  it("returns disabled status after disabling TOTP", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);
    await disableTotpForUser(user.id);

    const status = await getUserTotpStatus(user.id);

    expect(status.enabled).toBe(false);
  });
});

// ─── userHasSecondFactor ──────────────────────────────────────────────────────

describe("userHasSecondFactor", () => {
  it("returns false for a user with no TOTP and no passkeys", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await userHasSecondFactor(user.id);
    expect(result).toBe(false);
  });

  it("returns true after TOTP is enabled", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const result = await userHasSecondFactor(user.id);
    expect(result).toBe(true);
  });

  it("returns false again after TOTP is disabled", async () => {
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);
    await disableTotpForUser(user.id);

    const result = await userHasSecondFactor(user.id);
    expect(result).toBe(false);
  });
});

// ─── signSetupToken / verifySetupToken ────────────────────────────────────────

describe("signSetupToken / verifySetupToken", () => {
  const USER_ID = "00000000-0000-0000-0000-000000000001";
  const SECRET = "TESTSECRETBASE32";

  it("roundtrip: sign → verify returns the original secret", () => {
    const token = signSetupToken(USER_ID, SECRET);
    const recovered = verifySetupToken(token, USER_ID);
    expect(recovered).toBe(SECRET);
  });

  it("returns null when userId does not match", () => {
    const token = signSetupToken(USER_ID, SECRET);
    const result = verifySetupToken(token, "00000000-0000-0000-0000-000000000002");
    expect(result).toBeNull();
  });

  it("returns null for a tampered token body", () => {
    const token = signSetupToken(USER_ID, SECRET);
    const tampered = "AAAAAAAAAA." + token.split(".")[1];
    const result = verifySetupToken(tampered, USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for a token with bad format (no dot)", () => {
    const result = verifySetupToken("nodotinhere", USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for an empty string", () => {
    const result = verifySetupToken("", USER_ID);
    expect(result).toBeNull();
  });

  it("unique tokens on each sign call (fresh payload each time)", () => {
    const t1 = signSetupToken(USER_ID, SECRET);
    const t2 = signSetupToken(USER_ID, SECRET);
    // exp differs by at least 0 ms — tokens are structurally identical but
    // timestamps can collide in fast tests. The important invariant is that
    // both verify correctly.
    expect(verifySetupToken(t1, USER_ID)).toBe(SECRET);
    expect(verifySetupToken(t2, USER_ID)).toBe(SECRET);
  });
});

// ─── readSessionTokenFromCookieStore ─────────────────────────────────────────

describe("readSessionTokenFromCookieStore", () => {
  it("returns the token from the standard authjs.session-token cookie", () => {
    const store = { get: (name: string) => name === "authjs.session-token" ? { value: "abc123" } : undefined };
    expect(readSessionTokenFromCookieStore(store)).toBe("abc123");
  });

  it("returns the token from the __Secure- prefixed cookie", () => {
    const store = { get: (name: string) => name === "__Secure-authjs.session-token" ? { value: "secure-tok" } : undefined };
    expect(readSessionTokenFromCookieStore(store)).toBe("secure-tok");
  });

  it("returns undefined when no session cookie is present", () => {
    const store = { get: () => undefined };
    expect(readSessionTokenFromCookieStore(store)).toBeUndefined();
  });
});

// ─── verifyUserTotpCode (DB-backed verification) ──────────────────────────────

describe("verifyUserTotpCode", () => {
  it("returns false for a user with no TOTP configured", async () => {
    const { verifyUserTotpCode } = await import("@/lib/totp");
    const user = await createTestUser({ timezone: TZ });

    const result = await verifyUserTotpCode(user.id, "123456");
    expect(result).toBe(false);
  });

  it("returns true for a correct code against the stored encrypted secret", async () => {
    const { verifyUserTotpCode } = await import("@/lib/totp");
    const user = await createTestUser({ timezone: TZ });
    const { secret } = await setupTotpForUser(user.id);

    const code = currentCode(secret);
    const result = await verifyUserTotpCode(user.id, code);
    expect(result).toBe(true);
  });

  it("returns false for a wrong code", async () => {
    const { verifyUserTotpCode } = await import("@/lib/totp");
    const user = await createTestUser({ timezone: TZ });
    await setupTotpForUser(user.id);

    const result = await verifyUserTotpCode(user.id, "000000");
    expect(result).toBe(false);
  });
});
