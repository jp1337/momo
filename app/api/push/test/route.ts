/**
 * POST /api/push/test
 * Sends a test push notification to the currently authenticated user.
 * Useful for verifying that push subscriptions are working correctly.
 * Requires: authentication + active push subscription
 * Returns: { success: true } | { error: string }
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPushNotification, type PushSubscriptionData } from "@/lib/push";
import { NextResponse } from "next/server";

/**
 * POST — Sends a test push notification to the current user's registered subscription.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRows = await db
      .select({
        pushSubscription: users.pushSubscription,
        notificationEnabled: users.notificationEnabled,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userRows[0];

    if (!user?.pushSubscription) {
      return NextResponse.json(
        { error: "No push subscription found. Enable notifications first." },
        { status: 400 }
      );
    }

    if (!user.notificationEnabled) {
      return NextResponse.json(
        { error: "Notifications are disabled for this account." },
        { status: 400 }
      );
    }

    const subscription = user.pushSubscription as PushSubscriptionData;

    await sendPushNotification(session.user.id, subscription, {
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
