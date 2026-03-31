/**
 * POST /api/daily-quest/postpone
 * Postpones the current daily quest to tomorrow.
 * Clears is_daily_quest on the task and sets its due_date to tomorrow.
 * Requires: authentication
 * Body: { taskId: string }
 * Returns: { ok: true } | { error: string }
 */

import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 postpones per minute per user (intentionally strict)
  const rateCheck = checkRateLimit(`quest-postpone:${session.user.id}`, 10, 60_000);
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
    await postponeDailyQuest(parsed.data.taskId, session.user.id);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to postpone daily quest";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[POST /api/daily-quest/postpone]", error);
    return Response.json({ error: message }, { status });
  }
}
