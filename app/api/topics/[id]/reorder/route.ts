/**
 * PUT /api/topics/:id/reorder
 * Reorders tasks within a topic. The request body contains an ordered array
 * of task UUIDs — the array index becomes the new sortOrder.
 * Requires: authentication
 * Body: { taskIds: string[] }
 * Returns: { success: true }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { reorderTasks } from "@/lib/tasks";
import { ReorderTasksInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * PUT /api/topics/:id/reorder
 * Updates the sort order of tasks within a topic.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const rateCheck = checkRateLimit(`topics-reorder:${user.userId}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReorderTasksInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    await reorderTasks(id, user.userId, parsed.data.taskIds);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/topics/:id/reorder]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Task not found in topic" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
