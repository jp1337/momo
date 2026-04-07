/**
 * Unified authentication helper for API routes.
 *
 * Supports two auth methods:
 *  1. Bearer token (Authorization: Bearer momo_live_...) — Personal Access Token
 *  2. Session cookie — standard browser session via Auth.js
 *
 * Usage in API routes:
 *   const user = await resolveApiUser(request);
 *   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
 *   if (user.readonly && request.method !== "GET") {
 *     return Response.json({ error: "Read-only API key" }, { status: 403 });
 *   }
 */

import { auth } from "@/lib/auth";
import { resolveApiKeyUser } from "@/lib/api-keys";
import { cookies } from "next/headers";
import {
  isSessionTotpVerified,
  readSessionTokenFromCookieStore,
  userHasSecondFactor,
} from "@/lib/totp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverEnv } from "@/lib/env";

/** Resolved caller identity returned by resolveApiUser() */
export interface ApiUser {
  /** The authenticated user's UUID */
  userId: string;
  /**
   * Whether the caller authenticated with a read-only API key.
   * Session-based auth is always false (full access).
   * API routes that mutate data should block readonly callers with 403.
   */
  readonly: boolean;
}

/**
 * Resolves the authenticated user from a Next.js API route request.
 *
 * Priority order:
 *  1. Authorization: Bearer <token> header → resolveApiKeyUser()
 *  2. Session cookie (next-auth) → auth()
 *
 * @param request - The incoming Next.js Request object
 * @returns ApiUser if authenticated, or null if unauthenticated
 */
export async function resolveApiUser(
  request: Request
): Promise<ApiUser | null> {
  // ── 1. Bearer token (Personal Access Token) ──────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await resolveApiKeyUser(token);
      if (result) {
        return { userId: result.userId, readonly: result.readonly };
      }
      // Token provided but invalid/expired — reject immediately.
      // Do NOT fall through to session auth; mixing auth strategies for the
      // same request would be confusing and potentially insecure.
      return null;
    }
  }

  // ── 2. Session cookie (browser / Auth.js) ────────────────────────────────
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, readonly: false };
  }

  return null;
}

/**
 * Stricter variant of `resolveApiUser` for endpoints that must enforce 2FA
 * for browser sessions. Bearer-token (API key) callers are returned as-is —
 * they are exempt from 2FA by design (a Personal Access Token IS the second
 * factor in that case). Cookie sessions are checked against:
 *
 *  1. REQUIRE_2FA enforcement: if true and the user has no second factor
 *     configured, returns null + the caller should respond 401 with
 *     `code: "TOTP_SETUP_REQUIRED"`.
 *  2. Per-session verification: if 2FA is enabled but the current session
 *     row's `totp_verified_at` is NULL, returns null + the caller should
 *     respond 401 with `code: "TOTP_REQUIRED"`.
 *
 * Returns the resolved user when all checks pass, or one of two reason
 * codes when blocked. API routes can decide whether to enforce this or
 * fall back to plain `resolveApiUser` (e.g. read-only endpoints).
 *
 * @param request - The incoming Next.js Request object
 */
export async function resolveVerifiedApiUser(
  request: Request
): Promise<
  | { ok: true; user: ApiUser }
  | { ok: false; reason: "UNAUTHORIZED" | "TOTP_SETUP_REQUIRED" | "TOTP_REQUIRED" }
> {
  // ── Bearer token: exempt from the 2FA gate ───────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const result = await resolveApiKeyUser(token);
      if (!result) return { ok: false, reason: "UNAUTHORIZED" };
      return {
        ok: true,
        user: { userId: result.userId, readonly: result.readonly },
      };
    }
  }

  // ── Cookie session: subject to the 2FA gate ──────────────────────────────
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "UNAUTHORIZED" };

  if (
    serverEnv.REQUIRE_2FA &&
    !(await userHasSecondFactor(session.user.id))
  ) {
    return { ok: false, reason: "TOTP_SETUP_REQUIRED" };
  }

  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (row?.totpEnabledAt) {
    const cookieStore = await cookies();
    const sessionToken = readSessionTokenFromCookieStore(cookieStore);
    const verified =
      sessionToken !== undefined &&
      (await isSessionTotpVerified(sessionToken));
    if (!verified) return { ok: false, reason: "TOTP_REQUIRED" };
  }

  return {
    ok: true,
    user: { userId: session.user.id, readonly: false },
  };
}

/**
 * Standard error response for the three reason codes returned by
 * `resolveVerifiedApiUser`. Returns 401 with a stable `code` field so
 * the client can route the user to /login or /setup/2fa.
 */
export function verifiedAuthErrorResponse(
  reason: "UNAUTHORIZED" | "TOTP_SETUP_REQUIRED" | "TOTP_REQUIRED"
): Response {
  const messages: Record<typeof reason, string> = {
    UNAUTHORIZED: "Unauthorized",
    TOTP_SETUP_REQUIRED:
      "Two-factor authentication setup is required by the administrator",
    TOTP_REQUIRED:
      "Two-factor authentication required for this session — please verify",
  };
  return Response.json({ error: messages[reason], code: reason }, { status: 401 });
}

/**
 * Returns a standard 403 response for read-only API key violations.
 *
 * @returns Response with 403 status and a descriptive error message
 */
export function readonlyKeyResponse(): Response {
  return Response.json(
    {
      error: "Forbidden",
      message: "This API key is read-only. Use a read-write key to modify data.",
    },
    { status: 403 }
  );
}
