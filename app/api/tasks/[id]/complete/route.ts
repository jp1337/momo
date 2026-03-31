/**
 * POST /api/tasks/:id/complete
 * Marks a task as completed, awards coins, updates streak, checks achievements.
 * Requires: authentication
 * Returns: {
 *   task: Task,
 *   coinsEarned: number,
 *   newLevel: { level: number; title: string } | null,
 *   unlockedAchievements: Array<{ key: string; title: string; icon: string }>,
 *   streakCurrent: number
 * }
 *
 * DELETE /api/tasks/:id/complete
 * Reverses the completion of a task (undo complete).
 * Only works for ONE_TIME and DAILY_ELIGIBLE tasks.
 * Requires: authentication
 * Returns: { task: Task }
 */

import { auth } from "@/lib/auth";
import { completeTask, uncompleteTask } from "@/lib/tasks";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/tasks/:id/complete
 * Completes a task and awards coins to the user.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 completions per minute per user
  const rateCheck = checkRateLimit(`tasks-complete:${session.user.id}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id } = await params;

  try {
    const result = await completeTask(id, session.user.id);
    return Response.json({
      task: result.task,
      coinsEarned: result.coinsEarned,
      newLevel: result.newLevel,
      unlockedAchievements: result.unlockedAchievements,
      streakCurrent: result.streakCurrent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete task";
    const status = message.includes("not found")
      ? 404
      : message.includes("already completed")
      ? 409
      : 500;
    console.error("[POST /api/tasks/:id/complete]", error);
    return Response.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/tasks/:id/complete
 * Uncompletes a task (reverts completion for ONE_TIME and DAILY_ELIGIBLE tasks).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const task = await uncompleteTask(id, session.user.id);
    return Response.json({ task });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to uncomplete task";
    const status = message.includes("not found")
      ? 404
      : message.includes("not completed") || message.includes("cannot be uncompleted")
      ? 409
      : 500;
    console.error("[DELETE /api/tasks/:id/complete]", error);
    return Response.json({ error: message }, { status });
  }
}
