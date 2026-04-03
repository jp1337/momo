/**
 * GET /api/settings/budget
 * Returns the authenticated user's current monthly budget setting and
 * the amount spent this month.
 * Requires: authentication
 * Returns: { budget: BudgetSummary }
 *
 * PATCH /api/settings/budget
 * Updates the authenticated user's monthly budget setting.
 * Requires: authentication
 * Body: { budget: number | null }
 * Returns: { success: true }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { getBudgetSummary, updateMonthlyBudget } from "@/lib/wishlist";
import { UpdateBudgetInputSchema } from "@/lib/validators";

/**
 * GET /api/settings/budget
 * Returns the user's current budget settings and spending summary.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const budget = await getBudgetSummary(user.userId);
    return Response.json({ budget });
  } catch (error) {
    console.error("[GET /api/settings/budget]", error);
    return Response.json(
      { error: "Failed to fetch budget settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/budget
 * Updates the user's monthly budget. Send { budget: null } to remove the limit.
 */
export async function PATCH(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();


  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateBudgetInputSchema.safeParse(body);
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
    await updateMonthlyBudget(user.userId, parsed.data.budget);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/settings/budget]", error);
    return Response.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}
