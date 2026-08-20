/**
 * DELETE /api/user/api-keys/:id — Revokes an API key
 *
 * Authentication: session cookie or Bearer token
 * Only the key's owner can revoke it.
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { revokeApiKey } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * DELETE /api/user/api-keys/:id
 * Revokes the specified API key by setting its revokedAt timestamp.
 * Ownership is verified — users can only revoke their own keys.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const rate = checkRateLimit(`api-keys-delete:${user.userId}`, 10, 60_000);
  if (rate.limited) return rateLimitResponse(rate.resetAt);

  const { id } = await params;

  try {
    await revokeApiKey(user.userId, id);
    return Response.json({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("not found or does not belong")
    ) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }
    console.error("[api-keys/DELETE]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
