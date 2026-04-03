/**
 * POST /api/tasks/:id/promote-to-topic
 * Promotes a standalone task (no topic) to a new topic.
 * The task's title, notes, and priority are mapped to the new topic.
 * The task is re-associated as the first subtask (topicId set to new topic).
 * Requires: authentication
 * Returns: { topic: Topic } — 201 Created
 * Errors:
 *   401 — Unauthorized
 *   404 — Task not found
 *   409 — Task already belongs to a topic
 *   429 — Rate limit exceeded (10 promotions/min)
 *   500 — Internal server error
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { promoteTaskToTopic } from "@/lib/tasks";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/tasks/:id/promote-to-topic
 * Promotes a standalone task to a new topic in a single atomic transaction.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 10 promotions per minute per user
  const rateCheck = checkRateLimit(`tasks-promote:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  const { id } = await params;

  try {
    const result = await promoteTaskToTopic(id, user.userId);
    return Response.json({ topic: result.topic }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks/:id/promote-to-topic]", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      if (error.message.includes("already belongs")) {
        return Response.json(
          { error: "Task is already associated with a topic — navigate to that topic instead" },
          { status: 409 }
        );
      }
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
