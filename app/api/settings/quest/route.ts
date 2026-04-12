/**
 * GET /api/settings/quest
 * Returns the user's current quest-related settings.
 * Requires: authentication
 * Returns: { postponeLimit: number, emotionalClosureEnabled: boolean }
 *
 * PATCH /api/settings/quest
 * Updates the user's quest-related settings (postpone limit, emotional closure toggle).
 * Requires: authentication
 * Body: { postponeLimit?: number (1–5), emotionalClosureEnabled?: boolean }
 * Returns: { success: true }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const QuestSettingsSchema = z.object({
  postponeLimit: z
    .number()
    .int()
    .min(1, "Minimum 1 postponement per day")
    .max(5, "Maximum 5 postponements per day")
    .optional(),
  emotionalClosureEnabled: z.boolean().optional(),
}).refine(
  (data) => data.postponeLimit !== undefined || data.emotionalClosureEnabled !== undefined,
  { message: "At least one field must be provided" }
);

/**
 * GET — Fetch the user's current quest-related settings.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({
        postponeLimit: users.questPostponeLimit,
        emotionalClosureEnabled: users.emotionalClosureEnabled,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (!rows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/settings/quest]", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PATCH — Update the user's quest-related settings.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json(
    { error: "Forbidden", message: "This API key is read-only." },
    { status: 403 }
  );

  // Rate limit: 10 requests per minute
  const rl = checkRateLimit(`settings-quest:${user.userId}`, 10, 60_000);
  if (rl.limited) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = QuestSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.postponeLimit !== undefined) {
      updates.questPostponeLimit = parsed.data.postponeLimit;
    }
    if (parsed.data.emotionalClosureEnabled !== undefined) {
      updates.emotionalClosureEnabled = parsed.data.emotionalClosureEnabled;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/settings/quest]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
