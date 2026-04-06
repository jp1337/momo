/**
 * POST /api/tasks/:id/snooze
 * Snoozes a task until a given date. The task will be hidden from active views
 * (task list, Quick Wins, Daily Quest) until the snooze date passes.
 * Requires: authentication
 * Body: { snoozedUntil: "YYYY-MM-DD" }
 * Returns: { task: Task }
 *
 * DELETE /api/tasks/:id/snooze
 * Removes the snooze from a task, making it immediately visible again.
 * Requires: authentication
 * Returns: { task: Task }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { snoozeTask, unsnoozeTask } from "@/lib/tasks";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { SnoozeTaskInputSchema } from "@/lib/validators";

/**
 * POST /api/tasks/:id/snooze
 * Snoozes a task until the provided date.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 30 snoozes per minute per user
  const rateCheck = checkRateLimit(`tasks-snooze:${user.userId}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SnoozeTaskInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const task = await snoozeTask(id, user.userId, parsed.data.snoozedUntil);
    return Response.json({ task });
  } catch (error) {
    console.error("[POST /api/tasks/:id/snooze]", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      if (error.message.includes("completed")) {
        return Response.json({ error: "Cannot snooze a completed task" }, { status: 409 });
      }
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/:id/snooze
 * Removes the snooze from a task (unsnooze / wake up).
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
    const task = await unsnoozeTask(id, user.userId);
    return Response.json({ task });
  } catch (error) {
    console.error("[DELETE /api/tasks/:id/snooze]", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
