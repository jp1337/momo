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
import { timingSafeEqual } from "@/lib/utils/crypto";

/**
 * POST — Fan out daily quest notifications to all users with active subscriptions.
 * Validates the CRON_SECRET bearer token before processing.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Fail-closed: require CRON_SECRET to be set and match
  const cronSecret = serverEnv.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!cronSecret || !token || !timingSafeEqual(cronSecret, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
