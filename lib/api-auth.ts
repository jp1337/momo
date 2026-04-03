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
