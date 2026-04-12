/**
 * GET  /api/settings/notification-channels — List all configured channels for the user.
 * PUT  /api/settings/notification-channels — Create or update a notification channel (upsert by type).
 *
 * Requires: authentication
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { UpsertNotificationChannelSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET — List all notification channels for the authenticated user.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channels = await db
      .select({
        type: notificationChannels.type,
        config: notificationChannels.config,
        enabled: notificationChannels.enabled,
        createdAt: notificationChannels.createdAt,
        updatedAt: notificationChannels.updatedAt,
      })
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, user.userId));

    return NextResponse.json({ channels });
  } catch (err) {
    console.error("[GET /api/settings/notification-channels]", err);
    return NextResponse.json({ error: "Failed to list channels" }, { status: 500 });
  }
}

/**
 * PUT — Create or update a notification channel (upsert by userId + type).
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  // Rate limit: 10 upserts per minute
  const rateCheck = checkRateLimit(`notif-channel:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt) as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpsertNotificationChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const { type, config, enabled } = parsed.data;

    // Check if channel already exists for this user
    const existing = await db
      .select({ id: notificationChannels.id })
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, user.userId),
          eq(notificationChannels.type, type)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing channel
      await db
        .update(notificationChannels)
        .set({
          config,
          enabled,
          updatedAt: new Date(),
        })
        .where(eq(notificationChannels.id, existing[0].id));
    } else {
      // Insert new channel
      await db.insert(notificationChannels).values({
        userId: user.userId,
        type,
        config,
        enabled,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/settings/notification-channels]", err);
    return NextResponse.json({ error: "Failed to save channel" }, { status: 500 });
  }
}
