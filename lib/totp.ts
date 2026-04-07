/**
 * Two-Factor Authentication (TOTP) — business logic.
 *
 * Implements RFC 6238 TOTP via `otplib`, with secrets encrypted at rest using
 * AES-256-GCM (`lib/utils/crypto.ts`) and one-time backup codes hashed with
 * SHA-256 (mirroring `lib/api-keys.ts`).
 *
 * Key invariants:
 *  - The plaintext TOTP secret leaves this module in exactly two situations:
 *      1. Setup: returned to the API route which forwards it to the user via
 *         a signed, short-lived setup cookie (never persisted in the DB).
 *      2. Verification: read from DB, decrypted, compared, then discarded.
 *  - `users.totp_enabled_at` is the source of truth for "2FA active". A NULL
 *    value means 2FA is off, even if `totp_secret` happens to be set.
 *  - `userHasSecondFactor()` is the **single touchpoint** the future Passkey
 *    feature must extend — every enforcement gate goes through this helper.
 */

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { randomBytes, createHmac, timingSafeEqual as nodeTimingSafeEqual } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  totpBackupCodes,
  sessions,
  authenticators,
} from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import {
  encryptSecret,
  decryptSecret,
  hashBackupCode,
  timingSafeEqual,
} from "@/lib/utils/crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many backup codes are issued per setup or regeneration. */
export const BACKUP_CODE_COUNT = 10;

/** Length of each backup code (uppercase alphanumeric). */
const BACKUP_CODE_LENGTH = 10;

/** Alphabet used for backup codes — unambiguous uppercase + digits. */
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

/**
 * Drift tolerance in seconds for TOTP verification. ±30 s = one step on
 * either side, which forgives a slow phone clock without significantly
 * widening the attack window.
 */
const TOTP_EPOCH_TOLERANCE = 30;

/** Issuer label that appears in the user's authenticator app. */
const TOTP_ISSUER = "Momo";

/** Lifetime of the setup cookie in seconds. The user must finish the wizard
 *  within this window or restart the setup. */
export const SETUP_TOKEN_TTL_SECONDS = 10 * 60;

/** Cookie name carrying the signed setup token. */
export const SETUP_COOKIE_NAME = "momo_totp_setup";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result of `generateTotpSetup` — never persisted, only forwarded to the user. */
export interface TotpSetupPayload {
  /** Base32-encoded plaintext secret — embed in cookie, never in DB. */
  secret: string;
  /** otpauth:// URI suitable for QR code rendering. */
  otpauthUri: string;
  /** Pre-rendered PNG data URL of the QR code (for direct <img src=>). */
  qrCodeDataUrl: string;
}

/** Result of enabling or regenerating backup codes. */
export interface BackupCodesResult {
  /** Plaintext codes — show ONCE to the user, then discard. */
  codes: string[];
}

/** Compact status object used by the settings UI. */
export interface TotpStatus {
  enabled: boolean;
  enabledAt: Date | null;
  unusedBackupCodes: number;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

/**
 * Generates a fresh TOTP secret + QR code for the setup wizard. Pure: writes
 * nothing. The caller is responsible for handing the secret back to the user
 * (via a short-lived signed cookie) until the first valid code is entered.
 *
 * @param userEmail - The user's email; appears as the account label in the
 *                    authenticator app.
 */
export async function generateTotpSetup(
  userEmail: string
): Promise<TotpSetupPayload> {
  const secret = generateSecret();
  const otpauthUri = generateURI({
    issuer: TOTP_ISSUER,
    label: userEmail,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  return { secret, otpauthUri, qrCodeDataUrl };
}

/**
 * Verifies a TOTP code against a plaintext secret with ±1 step tolerance.
 *
 * @param secret - Base32 plaintext secret
 * @param code   - 6-digit code from the authenticator
 */
export async function verifyTotpCode(
  secret: string,
  code: string
): Promise<boolean> {
  const result = await verify({
    secret,
    token: code,
    epochTolerance: TOTP_EPOCH_TOLERANCE,
  });
  return result.valid;
}

// ─── Enable / Disable ─────────────────────────────────────────────────────────

/**
 * Activates 2FA for a user. Verifies the user-supplied code against the
 * pending plaintext secret first; on success, encrypts the secret, marks
 * `totpEnabledAt`, and issues a fresh batch of backup codes — all in one
 * transaction.
 *
 * @param userId       - Owning user
 * @param plainSecret  - The pending plaintext secret from the setup cookie
 * @param code         - The user's first verification code
 * @returns The freshly generated backup codes (plaintext, show once)
 * @throws Error("invalid_code") if the code does not verify
 */
export async function enableTotpForUser(
  userId: string,
  plainSecret: string,
  code: string
): Promise<BackupCodesResult> {
  const ok = await verifyTotpCode(plainSecret, code);
  if (!ok) {
    throw new Error("invalid_code");
  }

  const cipher = encryptSecret(plainSecret);
  const codes = generateBackupCodes();
  const hashes = codes.map((c) => ({ userId, codeHash: hashBackupCode(c) }));

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ totpSecret: cipher, totpEnabledAt: new Date() })
      .where(eq(users.id, userId));
    // Defensive: clear any leftover codes from a previous activation.
    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
    await tx.insert(totpBackupCodes).values(hashes);
  });

  return { codes };
}

/**
 * Deactivates 2FA for a user. Removes the encrypted secret and *all* backup
 * codes (used and unused). Caller MUST verify a current code or backup code
 * before invoking this function — `lib/totp.ts` does not re-check identity.
 *
 * @param userId - Owning user
 */
export async function disableTotpForUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ totpSecret: null, totpEnabledAt: null })
      .where(eq(users.id, userId));
    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
  });
}

/**
 * Replaces all backup codes with a fresh batch. Used when the user clicks
 * "regenerate backup codes" in settings. Caller is responsible for re-verifying
 * identity before invoking this.
 *
 * @param userId - Owning user
 * @returns The freshly generated plaintext codes (show once)
 */
export async function regenerateBackupCodes(
  userId: string
): Promise<BackupCodesResult> {
  const codes = generateBackupCodes();
  const hashes = codes.map((c) => ({ userId, codeHash: hashBackupCode(c) }));

  await db.transaction(async (tx) => {
    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
    await tx.insert(totpBackupCodes).values(hashes);
  });

  return { codes };
}

// ─── Verification (login-time) ────────────────────────────────────────────────

/**
 * Verifies a TOTP code submitted at login time against the user's stored
 * encrypted secret. Returns false if the user has no 2FA configured.
 *
 * @param userId - Owning user
 * @param code   - 6-digit code from the authenticator
 */
export async function verifyUserTotpCode(
  userId: string,
  code: string
): Promise<boolean> {
  const [row] = await db
    .select({
      totpSecret: users.totpSecret,
      totpEnabledAt: users.totpEnabledAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || !row.totpSecret || !row.totpEnabledAt) return false;

  const plain = decryptSecret(row.totpSecret);
  return verifyTotpCode(plain, code);
}

/**
 * Consumes a one-time backup code. Returns true if a matching unused code
 * was found and marked as used; false otherwise. Constant-time-compares
 * every candidate hash to avoid early-exit timing leaks.
 *
 * @param userId - Owning user
 * @param code   - The 10-character plaintext backup code
 */
export async function consumeBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const candidate = hashBackupCode(code);

  const rows = await db
    .select({ id: totpBackupCodes.id, codeHash: totpBackupCodes.codeHash })
    .from(totpBackupCodes)
    .where(
      and(eq(totpBackupCodes.userId, userId), isNull(totpBackupCodes.usedAt))
    );

  let matchId: string | null = null;
  for (const r of rows) {
    if (timingSafeEqual(r.codeHash, candidate)) {
      matchId = r.id;
      // Do not break — keep iterating so timing does not depend on position.
    }
  }
  if (!matchId) return false;

  const result = await db
    .update(totpBackupCodes)
    .set({ usedAt: new Date() })
    .where(
      and(eq(totpBackupCodes.id, matchId), isNull(totpBackupCodes.usedAt))
    )
    .returning({ id: totpBackupCodes.id });

  // Atomicity guard: if a parallel request consumed the code first, fail.
  return result.length > 0;
}

// ─── Status / Enforcement Helpers ─────────────────────────────────────────────

/**
 * Reads the user's 2FA status for the settings UI.
 *
 * @param userId - Owning user
 */
export async function getUserTotpStatus(userId: string): Promise<TotpStatus> {
  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const enabled = !!row?.totpEnabledAt;
  if (!enabled) {
    return { enabled: false, enabledAt: null, unusedBackupCodes: 0 };
  }

  const unused = await db
    .select({ id: totpBackupCodes.id })
    .from(totpBackupCodes)
    .where(
      and(eq(totpBackupCodes.userId, userId), isNull(totpBackupCodes.usedAt))
    );

  return {
    enabled: true,
    enabledAt: row.totpEnabledAt,
    unusedBackupCodes: unused.length,
  };
}

/**
 * Names of the Auth.js v5 session cookie depending on deployment environment.
 * The "__Secure-" prefixed variant is set automatically when the request is
 * served over HTTPS.
 */
export const AUTH_SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/**
 * Reads the raw Auth.js session token from the request cookies. Returns
 * undefined if no session cookie is present.
 *
 * Accepts the Next.js `cookies()` store (from `next/headers`) so the helper
 * is decoupled from request lifecycle.
 */
export function readSessionTokenFromCookieStore(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): string | undefined {
  for (const name of AUTH_SESSION_COOKIE_NAMES) {
    const c = cookieStore.get(name);
    if (c?.value) return c.value;
  }
  return undefined;
}

/**
 * Marks a specific session row as having passed the second-factor challenge
 * (TOTP, backup code, or passkey). Idempotent — calling it on an already-
 * verified session is a no-op upsert.
 *
 * @param sessionToken - Primary key of the sessions row (from the Auth.js cookie)
 */
export async function markSessionSecondFactorVerified(
  sessionToken: string
): Promise<void> {
  await db
    .update(sessions)
    .set({ secondFactorVerifiedAt: new Date() })
    .where(eq(sessions.sessionToken, sessionToken));
}

/**
 * Returns true if the given session row has passed the second-factor
 * challenge (via any method). Used by the layout-level enforcement gate.
 *
 * @param sessionToken - Primary key of the sessions row
 */
export async function isSessionSecondFactorVerified(
  sessionToken: string
): Promise<boolean> {
  const [row] = await db
    .select({ secondFactorVerifiedAt: sessions.secondFactorVerifiedAt })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);
  return !!row?.secondFactorVerifiedAt;
}

/**
 * Method-agnostic check used by every enforcement gate (REQUIRE_2FA hard-lock,
 * settings re-display, etc.). Returns true if the user has *any* registered
 * second factor — TOTP or at least one WebAuthn/Passkey credential.
 *
 * This is the single touchpoint gate used across the codebase: the layout
 * enforcement in `app/(app)/layout.tsx`, the forced-setup check at
 * `/setup/2fa`, and the settings UI all go through this helper so that a
 * user with only a passkey and no TOTP (or vice versa) is treated
 * equivalently.
 *
 * @param userId - Owning user
 */
export async function userHasSecondFactor(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (row?.totpEnabledAt) return true;

  const passkey = await db
    .select({ id: authenticators.credentialID })
    .from(authenticators)
    .where(eq(authenticators.userId, userId))
    .limit(1);
  return passkey.length > 0;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Generates BACKUP_CODE_COUNT unique 10-character codes from the unambiguous
 * alphabet. Rejects accidental duplicates by retrying.
 */
function generateBackupCodes(): string[] {
  const out = new Set<string>();
  while (out.size < BACKUP_CODE_COUNT) {
    out.add(randomCode());
  }
  return Array.from(out);
}

/** Generates a single random backup code. */
function randomCode(): string {
  const bytes = randomBytes(BACKUP_CODE_LENGTH);
  let s = "";
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    s += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length];
  }
  return s;
}

// ─── Setup-Token Cookie ───────────────────────────────────────────────────────
//
// During the setup wizard the plaintext TOTP secret must survive between the
// /api/auth/2fa/setup call (which generates it) and the /api/auth/2fa/verify-
// setup call (which commits it). We deliberately do NOT persist the secret in
// the database before the user has proven they can compute a valid code, to
// avoid leaving a half-configured plaintext path on disk.
//
// Format: base64url(json({ uid, sec, exp })) + "." + base64url(HMAC-SHA256)
// Signing key: AUTH_SECRET (already required for the project).
// The cookie is httpOnly + SameSite=Strict + 10 min TTL.

interface SetupTokenPayload {
  /** User the setup belongs to — guards against cookie reuse across users. */
  uid: string;
  /** Plaintext TOTP secret. */
  sec: string;
  /** Expiry as unix seconds. */
  exp: number;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  );
}

function getAuthSecret(): string {
  if (!serverEnv.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return serverEnv.AUTH_SECRET;
}

/**
 * Signs a setup payload into a short-lived token suitable for an httpOnly
 * cookie. Bound to the user ID so a token issued for user A cannot be
 * replayed against user B.
 */
export function signSetupToken(userId: string, secret: string): string {
  const payload: SetupTokenPayload = {
    uid: userId,
    sec: secret,
    exp: Math.floor(Date.now() / 1000) + SETUP_TOKEN_TTL_SECONDS,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(
    createHmac("sha256", getAuthSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

/**
 * Verifies and decodes a setup token. Returns the embedded plaintext secret
 * if the signature is valid, the user ID matches, and the token has not
 * expired. Returns null otherwise.
 */
export function verifySetupToken(
  token: string,
  expectedUserId: string
): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = createHmac("sha256", getAuthSecret()).update(body).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (
    expected.length !== provided.length ||
    !nodeTimingSafeEqual(expected, provided)
  ) {
    return null;
  }

  let payload: SetupTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.uid !== expectedUserId) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload.sec;
}
