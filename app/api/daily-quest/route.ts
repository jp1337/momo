/**
 * GET /api/daily-quest
 * Returns the current daily quest for the authenticated user.
 * If no quest is active for today, runs the selection algorithm and returns the result.
 * Requires: authentication
 * Returns: { quest: TaskWithTopic | null }
 *
 * POST /api/daily-quest
 * Forces a new daily quest selection, clearing any existing quest.
 * Intended for admin/dev use.
 * Requires: authentication
 * Returns: { quest: TaskWithTopic | null }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { selectDailyQuest, forceSelectDailyQuest } from "@/lib/daily-quest";
import { TimezoneSchema, EnergyLevelSchema } from "@/lib/validators";

/**
 * GET /api/daily-quest
 * Returns the current daily quest, or selects one if none exists today.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tzResult = TimezoneSchema.safeParse(searchParams.get("timezone"));
  const timezone = tzResult.success ? tzResult.data : null;
  const energyResult = EnergyLevelSchema.safeParse(searchParams.get("energyLevel"));
  const energyLevel = energyResult.success ? energyResult.data : null;

  try {
    const quest = await selectDailyQuest(user.userId, timezone, energyLevel);
    return Response.json({ quest });
  } catch (error) {
    console.error("[GET /api/daily-quest]", error);
    return Response.json({ error: "Failed to load daily quest" }, { status: 500 });
  }
}

/**
 * POST /api/daily-quest
 * Forces a new daily quest selection for the authenticated user.
 * Clears any existing quest (completed or active) and runs the priority algorithm.
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  let timezone: string | null | undefined = null;
  let energyLevel: "HIGH" | "MEDIUM" | "LOW" | null | undefined = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    const tzResult = TimezoneSchema.safeParse(body?.timezone);
    if (tzResult.success) timezone = tzResult.data;
    const energyResult = EnergyLevelSchema.safeParse(body?.energyLevel);
    if (energyResult.success) energyLevel = energyResult.data;
  } catch {
    // Body is optional for this endpoint
  }

  try {
    const quest = await forceSelectDailyQuest(user.userId, timezone, energyLevel);
    return Response.json({ quest });
  } catch (error) {
    console.error("[POST /api/daily-quest]", error);
    return Response.json({ error: "Failed to select daily quest" }, { status: 500 });
  }
}
