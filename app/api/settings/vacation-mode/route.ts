/**
 * GET /api/settings/vacation-mode
 * Returns the authenticated user's current vacation mode status.
 * Requires: authentication
 * Returns: { active: boolean, endDate: string | null }
 *
 * PATCH /api/settings/vacation-mode
 * Activates or deactivates vacation mode.
 * Requires: authentication (read-write)
 * Body: { enabled: boolean, endDate?: string, timezone?: string }
 * Returns: { success: true }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import {
  getVacationStatus,
  activateVacationMode,
  deactivateVacationMode,
} from "@/lib/vacation";
import { VacationModeInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/settings/vacation-mode
 * Returns the user's current vacation mode status.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getVacationStatus(user.userId);
    return Response.json(status);
  } catch (error) {
    console.error("[GET /api/settings/vacation-mode]", error);
    return Response.json(
      { error: "Failed to fetch vacation mode status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/vacation-mode
 * Activates or deactivates vacation mode for all recurring tasks.
 */
export async function PATCH(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.readonly) return readonlyKeyResponse();

  const rateCheck = checkRateLimit(`vacation-mode:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = VacationModeInputSchema.safeParse(body);
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
    if (parsed.data.enabled) {
      await activateVacationMode(
        user.userId,
        parsed.data.endDate!,
        parsed.data.timezone
      );
    } else {
      await deactivateVacationMode(user.userId, parsed.data.timezone);
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/settings/vacation-mode]", error);
    return Response.json(
      { error: "Failed to update vacation mode" },
      { status: 500 }
    );
  }
}
