/**
 * POST /api/energy-checkin
 * Records the user's daily energy level and selects a matching daily quest.
 * Combines the energy check-in and quest selection into a single round-trip.
 * Requires: authentication
 * Body: { energyLevel: "HIGH" | "MEDIUM" | "LOW", timezone?: string }
 * Returns: { quest: TaskWithTopic | null }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { selectDailyQuest } from "@/lib/daily-quest";
import { EnergyCheckinSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLocalDateString } from "@/lib/date-utils";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { limited, resetAt } = checkRateLimit(`energy-checkin:${user.userId}`, 30, 60_000);
  if (limited) return rateLimitResponse(resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = EnergyCheckinSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 }
    );
  }

  const { energyLevel, timezone } = result.data;
  const todayStr = getLocalDateString(timezone);

  try {
    // Persist energy level for today
    await db
      .update(users)
      .set({ energyLevel, energyLevelDate: todayStr })
      .where(eq(users.id, user.userId));

    // Select quest with energy preference
    const quest = await selectDailyQuest(user.userId, timezone, energyLevel);

    return Response.json({ quest });
  } catch (error) {
    console.error("[POST /api/energy-checkin]", error);
    return Response.json({ error: "Failed to process energy check-in" }, { status: 500 });
  }
}
