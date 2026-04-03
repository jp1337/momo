/**
 * POST /api/daily-quest/postpone
 * Postpones the current daily quest to tomorrow.
 * Clears is_daily_quest on the task and sets its due_date to tomorrow.
 * Requires: authentication
 * Body: { taskId: string }
 * Returns: { ok: true } | { error: string }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { postponeDailyQuest } from "@/lib/daily-quest";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/** Validation schema for the postpone request body */
const PostponeBodySchema = z.object({
  taskId: z.string().uuid("taskId must be a valid UUID"),
});

/**
 * POST /api/daily-quest/postpone
 * Postpones the specified daily quest task to tomorrow.
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 10 postpones per minute per user (intentionally strict)
  const rateCheck = checkRateLimit(`quest-postpone:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PostponeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    await postponeDailyQuest(parsed.data.taskId, user.userId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/daily-quest/postpone]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Daily quest task not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
