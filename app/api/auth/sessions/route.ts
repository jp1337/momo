/**
 * GET /api/auth/sessions
 * Returns all active sessions for the authenticated user.
 * Requires: authentication
 * Returns: { sessions: SessionSummary[] }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { listUserSessions } from "@/lib/sessions";
import { readSessionTokenFromCookieStore } from "@/lib/totp";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { cookies } from "next/headers";

/**
 * GET — List all non-expired sessions for the current user.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateCheck = checkRateLimit(
    `sessions-list:${user.userId}`,
    30,
    60_000
  );
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  try {
    const cookieStore = await cookies();
    const currentToken = readSessionTokenFromCookieStore(cookieStore) ?? "";
    const sessionList = await listUserSessions(user.userId, currentToken);
    return Response.json({ sessions: sessionList });
  } catch (error) {
    console.error("[GET /api/auth/sessions]", error);
    return Response.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
