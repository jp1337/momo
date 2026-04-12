/**
 * PATCH /api/tasks/bulk
 * Applies a bulk action to multiple tasks at once.
 * Requires: authentication (read-write)
 * Body: BulkTaskActionInput (discriminated union on "action")
 *   - { action: "delete", taskIds: string[] }
 *   - { action: "complete", taskIds: string[], timezone?: string }
 *   - { action: "changeTopic", taskIds: string[], topicId: string | null }
 *   - { action: "setPriority", taskIds: string[], priority: "HIGH" | "NORMAL" | "SOMEDAY" }
 * Returns: { success: true, affected: number }
 * Rate limit: 10 requests per minute per user
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { bulkUpdateTasks } from "@/lib/tasks";
import { BulkTaskActionInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * PATCH /api/tasks/bulk
 * Bulk-updates multiple tasks in a single transaction.
 */
export async function PATCH(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 10 bulk operations per minute per user
  const rateCheck = checkRateLimit(`tasks-bulk:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BulkTaskActionInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const result = await bulkUpdateTasks(user.userId, parsed.data);
    return Response.json({ success: true, affected: result.affected });
  } catch (error) {
    if (error instanceof Error && error.message === "Topic not found or access denied") {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }
    console.error("[PATCH /api/tasks/bulk]", error);
    return Response.json({ error: "Bulk operation failed" }, { status: 500 });
  }
}
