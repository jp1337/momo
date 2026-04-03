/**
 * DELETE /api/user
 * Permanently deletes the authenticated user's account and all associated data.
 *
 * Auth:       Required
 * Body:       none
 * Returns:    { success: true } — 200
 * Rate limit: 5 per hour (prevents accidental rapid re-attempts)
 *
 * After a successful response the client must call signOut() to clear
 * the local session cookie, then redirect to /login.
 */

import { auth } from "@/lib/auth";
import { deleteUser } from "@/lib/users";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited, resetAt } = checkRateLimit(
    `delete-account:${session.user.id}`,
    5,
    60 * 60 * 1_000 // 1 hour
  );
  if (limited) {
    return rateLimitResponse(resetAt);
  }

  try {
    await deleteUser(session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/user]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
