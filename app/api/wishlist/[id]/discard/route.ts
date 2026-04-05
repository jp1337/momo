/**
 * POST /api/wishlist/:id/discard
 * Marks a wishlist item as discarded (status → DISCARDED).
 * The item is archived but not deleted — it remains visible in history.
 * Requires: authentication
 * Returns: { item: WishlistItem }
 *
 * DELETE /api/wishlist/:id/discard
 * Restores a discarded item back to OPEN (undo discard).
 * Requires: authentication
 * Returns: { item: WishlistItem }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { discardWishlistItem, restoreWishlistItem } from "@/lib/wishlist";

/**
 * POST /api/wishlist/:id/discard
 * Marks the specified wishlist item as discarded.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { id } = await params;

  try {
    const item = await discardWishlistItem(id, user.userId);
    return Response.json({ item });
  } catch (error) {
    console.error("[POST /api/wishlist/:id/discard]", error);
    const isNotFound = error instanceof Error && error.message.includes("not found");
    return Response.json(
      { error: isNotFound ? "Item not found" : "Internal server error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/wishlist/:id/discard
 * Restores a discarded item back to OPEN status (undo discard).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { id } = await params;

  try {
    const item = await restoreWishlistItem(id, user.userId);
    return Response.json({ item });
  } catch (error) {
    console.error("[DELETE /api/wishlist/:id/discard]", error);
    const isNotFound = error instanceof Error && error.message.includes("not found");
    return Response.json(
      { error: isNotFound ? "Item not found" : "Internal server error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
