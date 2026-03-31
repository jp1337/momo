/**
 * POST /api/wishlist/:id/discard
 * Marks a wishlist item as discarded (status → DISCARDED).
 * The item is archived but not deleted — it remains visible in history.
 * Requires: authentication
 * Returns: { item: WishlistItem }
 */

import { auth } from "@/lib/auth";
import { discardWishlistItem } from "@/lib/wishlist";

/**
 * POST /api/wishlist/:id/discard
 * Marks the specified wishlist item as discarded.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const item = await discardWishlistItem(id, session.user.id);
    return Response.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to discard wishlist item";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[POST /api/wishlist/:id/discard]", error);
    return Response.json({ error: message }, { status });
  }
}
