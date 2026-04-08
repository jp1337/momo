/**
 * POST /api/push/subscribe
 * Registers or updates the push subscription for the current device.
 * Upserts by endpoint — calling this from the same device twice is safe.
 * Requires: authentication
 * Body: { subscription: PushSubscriptionJSON, notificationTime?: string, timezone?: string }
 * Returns: { success: true }
 *
 * PATCH /api/push/subscribe
 * Updates reminder preferences for the user. All fields are optional but at
 * least one must be provided.
 * Does not require a push subscription object.
 * Requires: authentication
 * Body: { notificationTime?: string, timezone?: string, dueTodayReminderEnabled?: boolean }
 * Returns: { success: true }
 *
 * DELETE /api/push/subscribe
 * Removes the push subscription for the current device only.
 * Requires: authentication
 * Body: { endpoint: string }
 * Returns: { success: true }
 */

import { resolveApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users, pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

/** Zod schema for a W3C PushSubscription JSON object */
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** Zod schema for the POST request body */
const subscribeBodySchema = z.object({
  subscription: pushSubscriptionSchema,
  /** Preferred notification time in HH:MM or HH:MM:SS 24h format */
  notificationTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM format")
    .transform((v) => v.slice(0, 5))
    .optional(),
  /** IANA timezone identifier (e.g. "Europe/Berlin") */
  timezone: z.string().min(1).max(64).optional(),
});

/**
 * POST — Register or refresh the push subscription for the current device.
 * Upserts by endpoint so calling this from the same browser twice is safe.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json({ error: "Forbidden", message: "This API key is read-only. Use a read-write key to modify data." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = subscribeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { subscription, notificationTime, timezone } = parsed.data;

  // Validate endpoint is a legitimate push service URL (prevent SSRF)
  const allowedPushHosts = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "notify.windows.com",
    "push.apple.com",
    "web.push.apple.com",
  ];
  try {
    const endpointUrl = new URL(subscription.endpoint);
    if (endpointUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
    }
    const isAllowed = allowedPushHosts.some(
      (host) =>
        endpointUrl.hostname === host ||
        endpointUrl.hostname.endsWith(`.${host}`)
    );
    if (!isAllowed) {
      return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid push endpoint URL" }, { status: 400 });
  }

  try {
    // Upsert the device subscription by endpoint (unique key per browser/device)
    await db
      .insert(pushSubscriptions)
      .values({
        userId: user.userId,
        endpoint: subscription.endpoint,
        subscription,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { subscription, userId: user.userId },
      });

    // Mark the user as having notifications enabled, and update preferences if provided
    await db
      .update(users)
      .set({
        notificationEnabled: true,
        ...(notificationTime ? { notificationTime } : {}),
        ...(timezone ? { timezone } : {}),
      })
      .where(eq(users.id, user.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/push/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Update notification time and/or timezone without touching subscriptions.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json({ error: "Forbidden", message: "This API key is read-only." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z
    .object({
      notificationTime: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM format")
        .transform((v) => v.slice(0, 5))
        .optional(),
      timezone: z.string().min(1).max(64).optional(),
      dueTodayReminderEnabled: z.boolean().optional(),
    })
    .refine(
      (v) =>
        v.notificationTime !== undefined ||
        v.timezone !== undefined ||
        v.dueTodayReminderEnabled !== undefined,
      { message: "At least one field must be provided" }
    )
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (parsed.data.notificationTime !== undefined) {
    updates.notificationTime = parsed.data.notificationTime;
  }
  if (parsed.data.timezone !== undefined) {
    updates.timezone = parsed.data.timezone;
  }
  if (parsed.data.dueTodayReminderEnabled !== undefined) {
    updates.dueTodayReminderEnabled = parsed.data.dueTodayReminderEnabled;
  }

  try {
    await db.update(users).set(updates).where(eq(users.id, user.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/push/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to update reminder preferences" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remove the push subscription for the current device only.
 * Other devices belonging to the same user are not affected.
 * Body: { endpoint: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return NextResponse.json({ error: "Forbidden", message: "This API key is read-only. Use a read-write key to modify data." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body: endpoint required" }, { status: 422 });
  }

  try {
    const deleted = await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.userId),
          eq(pushSubscriptions.endpoint, parsed.data.endpoint)
        )
      )
      .returning({ id: pushSubscriptions.id });

    // Only update notificationEnabled if we actually removed a subscription.
    // If nothing was deleted (e.g. subscription not in DB yet), leave the flag
    // untouched so other devices are not affected.
    if (deleted.length > 0) {
      const remaining = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, user.userId))
        .limit(1);

      if (remaining.length === 0) {
        await db
          .update(users)
          .set({ notificationEnabled: false })
          .where(eq(users.id, user.userId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/push/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
