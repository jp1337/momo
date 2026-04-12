/**
 * GET /api/settings/timezone
 * Returns the authenticated user's stored timezone.
 * Requires: authentication
 * Returns: { timezone: string | null }
 *
 * PATCH /api/settings/timezone
 * Updates the user's IANA timezone.
 * Requires: authentication (read-write)
 * Body: { timezone: string }
 * Returns: { success: true }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Validates that a string is a real IANA timezone identifier.
 * Uses the Intl API — zero external dependencies.
 */
function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const TimezoneInputSchema = z.object({
  timezone: z
    .string()
    .min(1, "Timezone must not be empty")
    .max(64, "Timezone must be at most 64 characters")
    .refine(isValidIanaTimezone, { message: "Invalid IANA timezone identifier" }),
});

/**
 * GET — Returns the user's stored timezone (null if not explicitly set).
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    return Response.json({ timezone: rows[0]?.timezone ?? null });
  } catch (error) {
    console.error("[GET /api/settings/timezone]", error);
    return Response.json(
      { error: "Failed to fetch timezone" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Update the user's timezone.
 * @param request - expects JSON body { timezone: string }
 */
export async function PATCH(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.readonly) {
    return Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    );
  }

  const rateCheck = checkRateLimit(`settings-timezone:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TimezoneInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    await db
      .update(users)
      .set({ timezone: parsed.data.timezone })
      .where(eq(users.id, user.userId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/settings/timezone]", error);
    return Response.json(
      { error: "Failed to update timezone" },
      { status: 500 }
    );
  }
}
