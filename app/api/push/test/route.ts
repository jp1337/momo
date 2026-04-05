/**
 * POST /api/push/test
 * Sends a test push notification to all active subscriptions of the current user
 * (i.e. every registered device). Useful for verifying push delivery end-to-end.
 * Requires: authentication + at least one active push subscription
 * Returns: { success: true, sent: number } | { error: string }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPushNotification, type PushSubscriptionData } from "@/lib/push";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * POST — Sends a test push notification to all registered devices of the current user.
 */
export async function POST(request: Request): Promise<NextResponse | Response> {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 3 test notifications per minute per user
  const rateCheck = checkRateLimit(`push-test:${user.userId}`, 3, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  try {
    const subs = await db
      .select({ subscription: pushSubscriptions.subscription })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.userId));

    if (subs.length === 0) {
      return NextResponse.json(
        { error: "No push subscription found. Enable notifications first." },
        { status: 400 }
      );
    }

    let sent = 0;
    for (const row of subs) {
      await sendPushNotification(user.userId, row.subscription as PushSubscriptionData, {
        title: "Momo test notification",
        body: "Push notifications are working correctly!",
        icon: "/icon-192.png",
        url: "/dashboard",
        tag: "momo-test",
      });
      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error("[POST /api/push/test]", err);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
