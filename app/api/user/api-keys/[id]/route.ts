/**
 * DELETE /api/user/api-keys/:id — Revokes an API key
 *
 * Authentication: session cookie or Bearer token
 * Only the key's owner can revoke it.
 */

import { resolveApiUser } from "@/lib/api-auth";
import { revokeApiKey } from "@/lib/api-keys";

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
