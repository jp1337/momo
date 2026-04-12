/**
 * POST /api/daily-quest/restore
 *
 * Pins a specific task as today's daily quest, replacing whatever is
 * currently active. Used by the energy check-in card's Undo link to
 * restore the pre-reroll quest after the user changes their mind.
 *
 * Why this is a separate endpoint (not a parameter on POST /api/daily-quest):
 * `POST /api/daily-quest` means "give me any new quest" — adding a `taskId`
 * parameter would muddle the semantics. Keeping the explicit-target action
 * on its own route makes both intents readable in API logs.
 *
 * Requires: authentication
 * Body: { taskId: string, timezone?: string }
 * Returns: { quest: TaskWithTopic | null }
 *   quest will be null if the target task is invalid (not owned, completed,
 *   or snoozed past today) — the client should treat that as "undo failed".
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { pinTaskAsDailyQuest } from "@/lib/daily-quest";
import { TimezoneSchema } from "@/lib/validators";
import { z } from "zod";

const RestoreInputSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  timezone: TimezoneSchema,
});

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = RestoreInputSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const quest = await pinTaskAsDailyQuest(
      user.userId,
      result.data.taskId,
      result.data.timezone
    );
    return Response.json({ quest });
  } catch (error) {
    console.error("[POST /api/daily-quest/restore]", error);
    return Response.json({ error: "Failed to restore quest" }, { status: 500 });
  }
}
