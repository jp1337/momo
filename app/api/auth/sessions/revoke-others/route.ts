/**
 * POST /api/auth/sessions/revoke-others
 * Revokes all sessions except the current one.
 * Requires: authentication (read-write)
 * Returns: { revoked: number }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { revokeAllOtherSessions } from "@/lib/sessions";
import { readSessionTokenFromCookieStore } from "@/lib/totp";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { cookies } from "next/headers";

/**
 * POST — Revoke all sessions for the user except the current one.
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.readonly) {
    return Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    );
  }

  const rateCheck = checkRateLimit(
    `sessions-revoke-all:${user.userId}`,
    5,
    60_000
  );
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  try {
    const cookieStore = await cookies();
    const currentToken = readSessionTokenFromCookieStore(cookieStore);
    if (!currentToken) {
      return Response.json(
        { error: "Could not identify current session" },
        { status: 400 }
      );
    }

    const revoked = await revokeAllOtherSessions(user.userId, currentToken);
    return Response.json({ revoked });
  } catch (error) {
    console.error("[POST /api/auth/sessions/revoke-others]", error);
    return Response.json(
      { error: "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
