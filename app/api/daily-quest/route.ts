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

import { auth } from "@/lib/auth";
import { selectDailyQuest, forceSelectDailyQuest } from "@/lib/daily-quest";

/**
 * GET /api/daily-quest
 * Returns the current daily quest, or selects one if none exists today.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quest = await selectDailyQuest(session.user.id);
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
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quest = await forceSelectDailyQuest(session.user.id);
    return Response.json({ quest });
  } catch (error) {
    console.error("[POST /api/daily-quest]", error);
    return Response.json({ error: "Failed to select daily quest" }, { status: 500 });
  }
}
