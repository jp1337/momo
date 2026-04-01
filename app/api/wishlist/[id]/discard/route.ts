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
    console.error("[POST /api/wishlist/:id/discard]", error);
    const isNotFound = error instanceof Error && error.message.includes("not found");
    return Response.json(
      { error: isNotFound ? "Item not found" : "Internal server error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
