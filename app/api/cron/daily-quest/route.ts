/**
 * POST /api/cron/daily-quest
 * Triggers daily quest push notifications for all eligible users.
 * Protected by CRON_SECRET — must include `Authorization: Bearer <CRON_SECRET>` header.
 * NOT protected by session auth (called by an external scheduler, not a browser).
 * Returns: { sent: number, failed: number }
 */

import { sendDailyQuestNotifications } from "@/lib/push";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST — Fan out daily quest notifications to all users with active subscriptions.
 * Validates the CRON_SECRET bearer token before processing.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the cron secret if one is configured
  const cronSecret = serverEnv.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sendDailyQuestNotifications();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cron/daily-quest]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
