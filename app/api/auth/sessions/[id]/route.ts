/**
 * DELETE /api/auth/sessions/:id
 * Revokes a single session by its public hash ID.
 * Requires: authentication (read-write)
 * Params: id — 16-char hex hash of the session token
 * Returns: { success: true } or 404
 */

import { resolveApiUser } from "@/lib/api-auth";
import { revokeSession } from "@/lib/sessions";
import { readSessionTokenFromCookieStore } from "@/lib/totp";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { createHash } from "crypto";

/**
 * DELETE — Revoke a specific session. Cannot revoke the current session.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    `sessions-revoke:${user.userId}`,
    10,
    60_000
  );
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id: sessionId } = await params;

  // Validate hex format
  if (!/^[0-9a-f]{16}$/.test(sessionId)) {
    return Response.json(
      { error: "Invalid session ID format" },
      { status: 400 }
    );
  }

  // Prevent revoking the current session
  const cookieStore = await cookies();
  const currentToken = readSessionTokenFromCookieStore(cookieStore);
  if (currentToken) {
    const currentHash = createHash("sha256")
      .update(currentToken)
      .digest("hex")
      .slice(0, 16);
    if (currentHash === sessionId) {
      return Response.json(
        { error: "Cannot revoke the current session", code: "CANNOT_REVOKE_CURRENT" },
        { status: 400 }
      );
    }
  }

  try {
    const deleted = await revokeSession(user.userId, sessionId);
    if (!deleted) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/auth/sessions/:id]", error);
    return Response.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
