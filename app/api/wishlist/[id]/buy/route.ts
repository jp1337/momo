/**
 * POST /api/wishlist/:id/buy
 * Marks a wishlist item as bought (status → BOUGHT).
 * If the item has a coinUnlockThreshold, coins are atomically deducted.
 * Requires: authentication
 * Returns: { item: WishlistItem, coinsSpent: number }
 * Error 422: { error: "INSUFFICIENT_COINS" } when user lacks coins
 *
 * DELETE /api/wishlist/:id/buy
 * Reverts a bought wishlist item back to OPEN status (undo buy).
 * If coins were spent, they are atomically refunded.
 * Requires: authentication
 * Returns: { item: WishlistItem, coinsRefunded: number }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { markAsBought, unmarkAsBought } from "@/lib/wishlist";

/**
 * POST /api/wishlist/:id/buy
 * Marks the specified wishlist item as bought; deducts coins if threshold set.
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
    const { item, coinsSpent } = await markAsBought(id, user.userId);
    return Response.json({ item, coinsSpent });
  } catch (error) {
    console.error("[POST /api/wishlist/:id/buy]", error);
    if (error instanceof Error && error.message === "INSUFFICIENT_COINS") {
      return Response.json({ error: "INSUFFICIENT_COINS" }, { status: 422 });
    }
    const isNotFound = error instanceof Error && error.message.includes("not found");
    return Response.json(
      { error: isNotFound ? "Item not found" : "Internal server error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/wishlist/:id/buy
 * Reverts a bought item back to OPEN status; refunds coins if applicable.
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
    const { item, coinsRefunded } = await unmarkAsBought(id, user.userId);
    return Response.json({ item, coinsRefunded });
  } catch (error) {
    console.error("[DELETE /api/wishlist/:id/buy]", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes("not marked")) {
      return Response.json({ error: "Item is not marked as bought" }, { status: 409 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
