/**
 * GET /api/wishlist
 * Lists all wishlist items for the authenticated user, plus budget summary.
 * Requires: authentication
 * Returns: { items: WishlistItem[], budget: BudgetSummary }
 *
 * POST /api/wishlist
 * Creates a new wishlist item for the authenticated user.
 * Requires: authentication
 * Body: CreateWishlistItemInput (validated with Zod)
 * Returns: { item: WishlistItem }
 */

import { auth } from "@/lib/auth";
import {
  getUserWishlistItems,
  createWishlistItem,
  getBudgetSummary,
} from "@/lib/wishlist";
import { CreateWishlistItemInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/wishlist
 * Returns all wishlist items and budget summary for the authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [items, budget] = await Promise.all([
      getUserWishlistItems(session.user.id),
      getBudgetSummary(session.user.id),
    ]);
    return Response.json({ items, budget });
  } catch (error) {
    console.error("[GET /api/wishlist]", error);
    return Response.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

/**
 * POST /api/wishlist
 * Creates a new wishlist item.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 wishlist item creations per minute per user
  const rateCheck = checkRateLimit(`wishlist-create:${session.user.id}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateWishlistItemInputSchema.safeParse(body);
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
    const item = await createWishlistItem(session.user.id, parsed.data);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/wishlist]", error);
    return Response.json({ error: "Failed to create wishlist item" }, { status: 500 });
  }
}
