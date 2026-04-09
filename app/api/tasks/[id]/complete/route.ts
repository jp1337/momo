/**
 * POST /api/tasks/:id/complete
 * Marks a task as completed, awards coins, updates streak, checks achievements.
 * Requires: authentication
 * Returns: {
 *   task: Task,
 *   coinsEarned: number,
 *   newLevel: { level: number; title: string } | null,
 *   unlockedAchievements: Array<{ key: string; title: string; icon: string }>,
 *   streakCurrent: number,
 *   shieldUsed: boolean
 * }
 *
 * DELETE /api/tasks/:id/complete
 * Reverses the completion of a task (undo complete).
 * Only works for ONE_TIME and DAILY_ELIGIBLE tasks.
 * Requires: authentication
 * Returns: { task: Task }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { completeTask, uncompleteTask } from "@/lib/tasks";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { TimezoneSchema } from "@/lib/validators";

/**
 * POST /api/tasks/:id/complete
 * Completes a task and awards coins to the user.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 30 completions per minute per user
  const rateCheck = checkRateLimit(`tasks-complete:${user.userId}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id } = await params;

  let timezone: string | null = null;
  try {
    const body = await request.json() as { timezone?: unknown };
    const parsed = TimezoneSchema.safeParse(body?.timezone);
    if (parsed.success && parsed.data) timezone = parsed.data;
  } catch {
    // body is optional — timezone defaults to null (UTC fallback)
  }

  try {
    const result = await completeTask(id, user.userId, timezone);
    return Response.json({
      task: result.task,
      coinsEarned: result.coinsEarned,
      newLevel: result.newLevel,
      unlockedAchievements: result.unlockedAchievements,
      streakCurrent: result.streakCurrent,
      shieldUsed: result.shieldUsed,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { id } = await params;

  try {
    const task = await uncompleteTask(id, user.userId);
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
