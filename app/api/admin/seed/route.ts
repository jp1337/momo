/**
 * POST /api/admin/seed
 * Seeds all achievement definitions into the achievements table.
 * This route is idempotent — safe to call multiple times (uses ON CONFLICT DO NOTHING).
 * Requires: authentication
 *
 * For development use only. In production, call seedAchievements() at app startup.
 *
 * Returns: { message: string, count: number }
 *
 * Deliberately NOT rate limited, unlike every other mutation route. The first
 * statement rejects anything outside `NODE_ENV=development` with a 403, before
 * auth and before the database — in production this route does not exist as far
 * as a caller is concerned, so a limit would guard a door that is already
 * bricked up. See also app/api/cron/route.ts for the other exemption.
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { seedAchievements, ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";

/**
 * POST /api/admin/seed
 * Seeds achievements into the database. Idempotent.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Only available in development" }, { status: 403 });
  }

  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();


  try {
    await seedAchievements();
    return Response.json({
      message: "Achievements seeded successfully",
      count: ACHIEVEMENT_DEFINITIONS.length,
    });
  } catch (error) {
    console.error("[POST /api/admin/seed]", error);
    return Response.json({ error: "Failed to seed achievements" }, { status: 500 });
  }
}
