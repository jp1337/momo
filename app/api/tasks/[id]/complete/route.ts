/**
 * POST /api/tasks/:id/complete
 * Marks a task as completed, awards coins, and records the completion event.
 * Requires: authentication
 * Returns: { task: Task, coinsEarned: number }
 *
 * DELETE /api/tasks/:id/complete
 * Reverses the completion of a task (undo complete).
 * Only works for ONE_TIME and DAILY_ELIGIBLE tasks.
 * Requires: authentication
 * Returns: { task: Task }
 */

import { auth } from "@/lib/auth";
import { completeTask, uncompleteTask } from "@/lib/tasks";

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

  const { id } = await params;

  try {
    const result = await completeTask(id, session.user.id);
    return Response.json({ task: result.task, coinsEarned: result.coinsEarned });
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
