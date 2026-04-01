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
    console.error("[POST /api/tasks/:id/complete]", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      if (error.message.includes("already completed")) {
        return Response.json({ error: "Task already completed" }, { status: 409 });
      }
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("[DELETE /api/tasks/:id/complete]", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      if (
        error.message.includes("not completed") ||
        error.message.includes("cannot be uncompleted")
      ) {
        return Response.json({ error: "Task cannot be uncompleted" }, { status: 409 });
      }
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
