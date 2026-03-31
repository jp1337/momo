/**
 * POST /api/wishlist/:id/buy
 * Marks a wishlist item as bought (status → BOUGHT). Does not delete it.
 * Requires: authentication
 * Returns: { item: WishlistItem }
 *
 * DELETE /api/wishlist/:id/buy
 * Reverts a bought wishlist item back to OPEN status (undo buy).
 * Requires: authentication
 * Returns: { item: WishlistItem }
 */

import { auth } from "@/lib/auth";
import { markAsBought, unmarkAsBought } from "@/lib/wishlist";

/**
 * POST /api/wishlist/:id/buy
 * Marks the specified wishlist item as bought.
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
    const item = await markAsBought(id, session.user.id);
    return Response.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark item as bought";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[POST /api/wishlist/:id/buy]", error);
    return Response.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/wishlist/:id/buy
 * Reverts a bought item back to OPEN status.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const item = await unmarkAsBought(id, session.user.id);
    return Response.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revert item status";
    const status = message.includes("not found") || message.includes("not marked")
      ? 404
      : 500;
    console.error("[DELETE /api/wishlist/:id/buy]", error);
    return Response.json({ error: message }, { status });
  }
}
