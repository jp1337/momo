/**
 * POST /api/push/subscribe
 * Saves the user's push subscription to the DB and enables notifications.
 * Requires: authentication
 * Body: { subscription: PushSubscriptionJSON, notificationTime?: string }
 * Returns: { success: true }
 *
 * DELETE /api/push/subscribe
 * Removes the push subscription and disables notifications for the current user.
 * Requires: authentication
 * Returns: { success: true }
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  /** Preferred notification time in HH:MM 24h format */
  notificationTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .optional(),
});

/**
 * POST — Save push subscription + enable notifications for the current user.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { subscription, notificationTime } = parsed.data;

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
    await db
      .update(users)
      .set({
        pushSubscription: subscription,
        notificationEnabled: true,
        ...(notificationTime ? { notificationTime } : {}),
      })
      .where(eq(users.id, session.user.id));

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
 * DELETE — Remove push subscription and disable notifications for the current user.
 */
export async function DELETE(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db
      .update(users)
      .set({
        pushSubscription: null,
        notificationEnabled: false,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/push/subscribe]", err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
