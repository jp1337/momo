/**
 * POST /api/energy-checkin
 *
 * Records the user's daily energy level and re-rolls the daily quest if (and
 * only if) the existing quest no longer matches the reported energy.
 *
 * Why re-roll instead of just storing the value: the cron job picks the daily
 * quest in the morning **before** the user has checked in, so the user wakes
 * up to a push notification with a quest that may not match their actual
 * energy. The check-in is the user's chance to ask Momo "given how I feel
 * right now, is there something better?" — and Momo answers by either
 * keeping the current quest (if it already fits or there's nothing better)
 * or quietly swapping it.
 *
 * Re-check-ins later in the day are explicitly supported and trigger the
 * same logic — energy can be edited as long as the quest is not yet done.
 *
 * Requires: authentication
 * Body: { energyLevel: "HIGH" | "MEDIUM" | "LOW", timezone?: string }
 * Returns: {
 *   quest: TaskWithTopic | null,
 *   swapped: boolean,
 *   previousQuestId?: string,
 *   previousQuestTitle?: string
 * }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { reselectQuestForEnergy } from "@/lib/daily-quest";
import { recordEnergyCheckin, getEnergyCheckinStreak } from "@/lib/energy";
import { EnergyCheckinSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkAndUnlockAchievements } from "@/lib/gamification";

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
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { energyLevel, timezone } = result.data;

  try {
    // Persist to both the user-level cache and the historical log.
    await recordEnergyCheckin(user.userId, energyLevel, timezone);

    // Re-roll the quest if it no longer matches the new energy.
    const reroll = await reselectQuestForEnergy(user.userId, energyLevel, timezone);

    // Fire-and-forget achievement check for energy check-in streak
    (async () => {
      try {
        const energyCheckinStreak = await getEnergyCheckinStreak(user.userId, timezone);
        const result = await checkAndUnlockAchievements(user.userId, {
          totalCompleted: 0,
          streakCurrent: 0,
          coins: 0,
          level: 1,
          energyCheckinStreak,
        });
        if (result.coinsAwarded > 0) {
          await db.update(users).set({ coins: sql`${users.coins} + ${result.coinsAwarded}` }).where(eq(users.id, user.userId));
        }
        if (result.unlocked.length > 0) {
          const { sendAchievementNotifications } = await import("@/lib/push");
          await sendAchievementNotifications(user.userId, result.unlocked);
        }
      } catch (err) {
        console.error("[POST /api/energy-checkin] achievement check failed (non-fatal):", err);
      }
    })();

    return Response.json({
      quest: reroll.quest,
      swapped: reroll.swapped,
      previousQuestId: reroll.previousQuestId,
      previousQuestTitle: reroll.previousQuestTitle,
    });
  } catch (error) {
    console.error("[POST /api/energy-checkin]", error);
    return Response.json({ error: "Failed to process energy check-in" }, { status: 500 });
  }
}
