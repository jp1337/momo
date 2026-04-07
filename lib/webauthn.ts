/**
 * WebAuthn / Passkeys — business logic.
 *
 * Implements passwordless login AND second-factor assertion on top of the
 * existing Auth.js database-session strategy using `@simplewebauthn/server`.
 *
 * Why not the Auth.js Passkey provider?
 *  The official `@auth/webauthn` Passkey provider requires `session: "jwt"`.
 *  Momo uses `session: "database"` so it can revoke individual sessions,
 *  track per-session second-factor state, and keep `sessions` rows as the
 *  source of truth. Instead, this module exposes primitives that the
 *  `/api/auth/passkey/*` routes call directly, and writes to the
 *  `authenticators` table we own.
 *
 * Challenge storage:
 *  Registration and assertion challenges are stashed in a short-lived
 *  signed httpOnly cookie (5 minute TTL). The cookie payload is signed
 *  with `AUTH_SECRET` using the same HMAC-SHA256 pattern as the TOTP
 *  setup cookie (`lib/totp.ts:signSetupToken`), with base64url encoding
 *  and a bound `kind` tag so a registration cookie cannot be replayed as
 *  a login cookie or vice versa.
 *
 * Invariants:
 *  - `userHasSecondFactor(userId)` in `lib/totp.ts` is the single gate —
 *    add or remove a passkey row here and it flips automatically.
 *  - Primary-login via passkey creates a new `sessions` row directly and
 *    sets `second_factor_verified_at = now()` because a passkey is
 *    inherently multi-factor (device possession + biometrics/PIN).
 *  - Second-factor assertion only updates `sessions.second_factor_verified_at`
 *    on the *existing* session — it never creates a new one.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authenticators, sessions, users } from "@/lib/db/schema";
import { serverEnv, clientEnv } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PasskeySummary {
  /** base64url credential ID */
  credentialID: string;
  /** User-provided label (or null if skipped) */
  name: string | null;
  /** "singleDevice" (hardware-bound) | "multiDevice" (synced) */
  deviceType: "singleDevice" | "multiDevice";
  /** Whether the credential is cloud-backed */
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface VerifiedLoginCredential {
  userId: string;
  credentialID: string;
}

// ─── RP configuration ────────────────────────────────────────────────────────

interface RpConfig {
  rpID: string;
  rpName: string;
  origin: string;
}

/**
 * Resolves the Relying Party configuration from env vars.
 * RP ID is the bare hostname (e.g. "momotask.app", "localhost"); origin is
 * the full URL with scheme and port. If `WEBAUTHN_RP_ID` is unset, we
 * derive it from `NEXT_PUBLIC_APP_URL`.
 */
export function getRpConfig(): RpConfig {
  const origin = clientEnv.NEXT_PUBLIC_APP_URL;
  let rpID = serverEnv.WEBAUTHN_RP_ID;
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = "localhost";
    }
  }
  return {
    rpID,
    rpName: serverEnv.WEBAUTHN_RP_NAME ?? "Momo",
    origin,
  };
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Generates WebAuthn registration options for the given user. Also returns
 * the raw challenge so the caller can embed it in a signed cookie for later
 * verification in `verifyRegistration`.
 *
 * Existing passkeys for the user are fed into `excludeCredentials` so the
 * browser does not register the same authenticator twice.
 *
 * @param userId    - Owning user
 * @param userName  - Email or username — shown in the OS prompt
 * @param userDisplayName - Full name for the prompt (optional)
 */
export async function createRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName?: string | null
) {
  const { rpID, rpName } = getRpConfig();

  const existing = await db
    .select({
      credentialID: authenticators.credentialID,
      transports: authenticators.transports,
    })
    .from(authenticators)
    .where(eq(authenticators.userId, userId));

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    // The WebAuthn spec requires a binary user handle; @simplewebauthn
    // accepts a string and encodes it for us. We pass the UUID verbatim
    // so the handle is stable across devices/syncs.
    userID: new TextEncoder().encode(userId),
    userName,
    userDisplayName: userDisplayName ?? userName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialID,
      transports: parseTransports(c.transports),
    })),
  };

  return generateRegistrationOptions(opts);
}

/**
 * Verifies a registration response and persists the new credential.
 * Fails if verification does not produce a credential payload.
 *
 * @param userId    - Owning user
 * @param name      - User-supplied display label ("iPhone", "YubiKey 5C")
 * @param response  - Raw `RegistrationResponseJSON` from the browser
 * @param expectedChallenge - Challenge read from the registration cookie
 */
export async function verifyRegistration(
  userId: string,
  name: string | null,
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = getRpConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("registration_failed");
  }

  const info = verification.registrationInfo;
  // simplewebauthn v13 nests the credential under .credential.{id,publicKey,counter}
  const credential = info.credential;

  await db.insert(authenticators).values({
    credentialID: credential.id,
    userId,
    providerAccountId: credential.id,
    credentialPublicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    credentialDeviceType: info.credentialDeviceType,
    credentialBackedUp: info.credentialBackedUp,
    transports: response.response.transports?.join(",") ?? null,
    name: name?.trim() || null,
  });

  return verification;
}

// ─── Authentication (primary login + second factor) ──────────────────────────

/**
 * Generates assertion options for a *known* user — used during the
 * second-factor flow where the session already identifies them. Passes the
 * user's registered credential IDs as `allowCredentials` so the browser
 * narrows the choices.
 */
export async function createLoginOptionsForUser(userId: string) {
  const { rpID } = getRpConfig();
  const rows = await db
    .select({
      credentialID: authenticators.credentialID,
      transports: authenticators.transports,
    })
    .from(authenticators)
    .where(eq(authenticators.userId, userId));

  return generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: rows.map((r) => ({
      id: r.credentialID,
      transports: parseTransports(r.transports),
    })),
  });
}

/**
 * Generates assertion options for an *unknown* user — used by the
 * passwordless primary-login button on /login. Empty `allowCredentials`
 * so the browser offers all discoverable credentials for this RP.
 */
export async function createDiscoverableLoginOptions() {
  const { rpID } = getRpConfig();
  return generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });
}

/**
 * Verifies an authentication response against a stored credential.
 * Looks up the credential by ID, checks the signature + counter, and
 * updates the counter + `lastUsedAt` on success.
 *
 * @returns Minimal credential descriptor (userId + credentialID) on
 *          success, or null on any verification failure.
 */
export async function verifyLogin(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedLoginCredential | null> {
  const { rpID, origin } = getRpConfig();

  const credentialID = response.id;
  const [row] = await db
    .select()
    .from(authenticators)
    .where(eq(authenticators.credentialID, credentialID))
    .limit(1);
  if (!row) return null;

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: row.credentialID,
        publicKey: new Uint8Array(
          Buffer.from(row.credentialPublicKey, "base64url")
        ),
        counter: row.counter,
        transports: parseTransports(row.transports),
      },
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[webauthn.verifyLogin] verification failed", err);
    return null;
  }

  if (!verification.verified) return null;

  await db
    .update(authenticators)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(authenticators.credentialID, credentialID));

  return { userId: row.userId, credentialID };
}

// ─── Primary-login session helpers ───────────────────────────────────────────

/**
 * Auth.js v5 cookie names for the database-strategy session token. The
 * secure-prefixed variant is used automatically over HTTPS. Kept in sync
 * with `AUTH_SESSION_COOKIE_NAMES` in `lib/totp.ts`.
 */
export const SESSION_COOKIE_NAME = "authjs.session-token";
export const SECURE_SESSION_COOKIE_NAME = "__Secure-authjs.session-token";

/**
 * How long a passwordless-passkey login session lasts. 30 days matches the
 * Auth.js default for database sessions.
 */
export const PASSKEY_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Creates a fresh database session for a user who just authenticated via
 * passkey on `/login`. The session is marked as second-factor-verified at
 * creation time because a passkey is inherently MFA.
 *
 * @returns The freshly generated `sessionToken` (opaque string) — the
 *          caller is responsible for setting this as the Auth.js cookie.
 */
export async function createPasskeyLoginSession(
  userId: string
): Promise<string> {
  const sessionToken = randomUUID();
  const now = new Date();
  await db.insert(sessions).values({
    sessionToken,
    userId,
    expires: new Date(now.getTime() + PASSKEY_SESSION_TTL_MS),
    secondFactorVerifiedAt: now,
  });
  // Touch the users row so Auth.js session callbacks get fresh info on
  // the next request — no-op if nothing to update.
  await db
    .update(users)
    .set({})
    .where(eq(users.id, userId));
  return sessionToken;
}

// ─── Settings / management ───────────────────────────────────────────────────

/**
 * Lists the user's registered passkeys for the settings UI.
 */
export async function listUserPasskeys(
  userId: string
): Promise<PasskeySummary[]> {
  const rows = await db
    .select({
      credentialID: authenticators.credentialID,
      name: authenticators.name,
      deviceType: authenticators.credentialDeviceType,
      backedUp: authenticators.credentialBackedUp,
      createdAt: authenticators.createdAt,
      lastUsedAt: authenticators.lastUsedAt,
    })
    .from(authenticators)
    .where(eq(authenticators.userId, userId));
  return rows.map((r) => ({
    credentialID: r.credentialID,
    name: r.name,
    deviceType:
      r.deviceType === "multiDevice" ? "multiDevice" : "singleDevice",
    backedUp: r.backedUp,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

/**
 * Renames a passkey. Ignored silently if the credential does not belong to
 * the user, to avoid leaking existence.
 */
export async function renamePasskey(
  userId: string,
  credentialID: string,
  name: string
): Promise<void> {
  await db
    .update(authenticators)
    .set({ name: name.trim() || null })
    .where(
      and(
        eq(authenticators.userId, userId),
        eq(authenticators.credentialID, credentialID)
      )
    );
}

/**
 * Revokes a passkey. Subsequent assertions with that credential ID will
 * fail the database lookup. Cascades do not need to fire because there are
 * no dependent rows.
 */
export async function deletePasskey(
  userId: string,
  credentialID: string
): Promise<void> {
  await db
    .delete(authenticators)
    .where(
      and(
        eq(authenticators.userId, userId),
        eq(authenticators.credentialID, credentialID)
      )
    );
}

// ─── Signed challenge cookie ─────────────────────────────────────────────────
//
// The challenge must survive between the /options call that generates it
// and the /verify call that consumes it. We stash it in a signed httpOnly
// cookie — same pattern as `lib/totp.ts:signSetupToken`, but bound to a
// purpose tag ("reg" | "login" | "sf") so a token issued for one flow
// cannot be replayed as another.

/** Cookie name for the ephemeral WebAuthn challenge. */
export const CHALLENGE_COOKIE_NAME = "momo_webauthn_challenge";

/** Challenge cookie lifetime — 5 minutes is enough for the user to tap the
 *  authenticator without being rushed, but short enough to limit replay. */
export const CHALLENGE_TTL_SECONDS = 5 * 60;

/** Purpose tag distinguishing the WebAuthn flows. */
export type ChallengeKind = "reg" | "login" | "sf";

interface ChallengePayload {
  /** Purpose tag — guards against cross-flow replay. */
  k: ChallengeKind;
  /** Raw challenge (base64url) embedded in the payload. */
  c: string;
  /** Unix seconds expiry. */
  exp: number;
  /** Optional user ID binding — set for reg + sf flows, omitted for discoverable login. */
  uid?: string;
}

function getAuthSecret(): string {
  if (!serverEnv.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return serverEnv.AUTH_SECRET;
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

/**
 * Signs a challenge payload into a short-lived token suitable for an
 * httpOnly cookie. Kind and user binding are covered by the signature.
 */
export function signChallengeToken(
  kind: ChallengeKind,
  challenge: string,
  userId?: string
): string {
  const payload: ChallengePayload = {
    k: kind,
    c: challenge,
    exp: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS,
    ...(userId ? { uid: userId } : {}),
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(
    createHmac("sha256", getAuthSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

/**
 * Verifies a signed challenge cookie and returns the embedded raw
 * challenge if the token is valid, has not expired, matches the expected
 * kind, and (when applicable) matches the expected user ID.
 */
export function verifyChallengeToken(
  token: string,
  expectedKind: ChallengeKind,
  expectedUserId?: string
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
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  let payload: ChallengePayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.k !== expectedKind) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (expectedUserId && payload.uid !== expectedUserId) return null;
  return payload.c;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Splits the comma-separated transports column into a typed array
 * suitable for simplewebauthn. Returns `undefined` when empty so the
 * browser does not see a zero-length allowlist.
 */
function parseTransports(
  raw: string | null
): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as AuthenticatorTransportFuture[];
  return parts.length > 0 ? parts : undefined;
}
