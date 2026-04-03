/**
 * POST /api/push/test
 * Sends a test push notification to the currently authenticated user.
 * Useful for verifying that push subscriptions are working correctly.
 * Requires: authentication + active push subscription
 * Returns: { success: true } | { error: string }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPushNotification, type PushSubscriptionData } from "@/lib/push";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * POST — Sends a test push notification to the current user's registered subscription.
 */
export async function POST(request: Request): Promise<NextResponse | Response> {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 3 test notifications per minute per user
  const rateCheck = checkRateLimit(`push-test:${user.userId}`, 3, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  try {
    const userRows = await db
      .select({
        pushSubscription: users.pushSubscription,
        notificationEnabled: users.notificationEnabled,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    const userRecord = userRows[0];

    if (!userRecord?.pushSubscription) {
      return NextResponse.json(
        { error: "No push subscription found. Enable notifications first." },
        { status: 400 }
      );
    }

    if (!userRecord.notificationEnabled) {
      return NextResponse.json(
        { error: "Notifications are disabled for this account." },
        { status: 400 }
      );
    }

    const subscription = userRecord.pushSubscription as PushSubscriptionData;

    await sendPushNotification(user.userId, subscription, {
      title: "Momo test notification",
      body: "Push notifications are working correctly!",
      icon: "/favicon.ico",
      url: "/dashboard",
      tag: "momo-test",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/push/test]", err);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
