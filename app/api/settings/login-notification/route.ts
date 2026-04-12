/**
 * GET /api/settings/login-notification
 * Returns the user's current login-notification-new-device preference.
 *
 * Requires: authentication
 * Returns: { enabled: boolean }
 *
 * PATCH /api/settings/login-notification
 * Updates the user's login-notification-new-device preference.
 *
 * Requires: authentication (read-write session or API key)
 * Body: { enabled: boolean }
 * Returns: { enabled: boolean }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const InputSchema = z.object({
  enabled: z.boolean(),
});

/**
 * GET — Fetch the user's current login-notification preference.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({ enabled: users.loginNotificationNewDevice })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (!rows[0]) return Response.json({ error: "User not found" }, { status: 404 });

    return Response.json({ enabled: rows[0].enabled ?? false });
  } catch (error) {
    console.error("[GET /api/settings/login-notification]", error);
    return Response.json({ error: "Failed to fetch setting" }, { status: 500 });
  }
}

/**
 * PATCH — Toggle the new-device login notification.
 *
 * @param request - expects JSON body { enabled: boolean }
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

  const rateCheck = checkRateLimit(
    `settings-login-notification:${user.userId}`,
    10,
    60_000
  );
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await db
      .update(users)
      .set({ loginNotificationNewDevice: parsed.data.enabled })
      .where(eq(users.id, user.userId));

    return Response.json({ enabled: parsed.data.enabled });
  } catch (error) {
    console.error("[PATCH /api/settings/login-notification]", error);
    return Response.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
