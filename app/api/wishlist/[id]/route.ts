/**
 * PATCH /api/wishlist/:id
 * Updates a wishlist item owned by the authenticated user.
 * Requires: authentication
 * Body: UpdateWishlistItemInput (all fields optional)
 * Returns: { item: WishlistItem }
 *
 * DELETE /api/wishlist/:id
 * Permanently deletes a wishlist item owned by the authenticated user.
 * Requires: authentication
 * Returns: { success: true }
 */

import { auth } from "@/lib/auth";
import { updateWishlistItem, deleteWishlistItem } from "@/lib/wishlist";
import { UpdateWishlistItemInputSchema } from "@/lib/validators";

/**
 * PATCH /api/wishlist/:id
 * Updates a wishlist item (partial update — only provided fields are changed).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateWishlistItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  try {
    const item = await updateWishlistItem(id, session.user.id, parsed.data);
    return Response.json({ item });
  } catch (error) {
    console.error("[PATCH /api/wishlist/:id]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Wishlist item not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/wishlist/:id
 * Permanently deletes a wishlist item.
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
    await deleteWishlistItem(id, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/wishlist/:id]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Wishlist item not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
