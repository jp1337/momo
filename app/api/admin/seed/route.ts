/**
 * POST /api/admin/seed
 * Seeds all achievement definitions into the achievements table.
 * This route is idempotent — safe to call multiple times (uses ON CONFLICT DO NOTHING).
 * Requires: authentication
 *
 * For development use only. In production, call seedAchievements() at app startup.
 *
 * Returns: { message: string, count: number }
 */

import { auth } from "@/lib/auth";
import { seedAchievements, ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";

/**
 * POST /api/admin/seed
 * Seeds achievements into the database. Idempotent.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Only available in development" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
