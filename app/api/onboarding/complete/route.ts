/**
 * POST /api/onboarding/complete
 * Marks the authenticated user's onboarding as completed.
 * Requires: authentication
 * Body: none
 * Returns: { success: true }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { markOnboardingCompleted } from "@/lib/onboarding";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/onboarding/complete
 * Sets onboarding_completed = true for the current user.
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 completions per minute per user
  const rateCheck = checkRateLimit(
    `onboarding-complete:${user.userId}`,
    10,
    60_000,
  );
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  try {
    await markOnboardingCompleted(user.userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[POST /api/onboarding/complete]", error);
    return Response.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
