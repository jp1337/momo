/**
 * POST /api/settings/notification-channels/:type/test — Send a test notification via the channel.
 *
 * Requires: authentication + channel must be configured
 * Params: type — channel type identifier (e.g. "ntfy")
 * Rate limit: 3 per minute per user
 * Returns: { success: true } | { error: string }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { sendTestNotification } from "@/lib/notifications";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST — Send a test notification to verify channel configuration.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const { type } = await params;

  // Rate limit: 3 test notifications per minute per user
  const rateCheck = checkRateLimit(`notif-test:${user.userId}`, 3, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt) as NextResponse;

  try {
    const success = await sendTestNotification(user.userId, type);

    if (!success) {
      return NextResponse.json(
        { error: "Channel not configured or send failed. Check your settings." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[POST /api/settings/notification-channels/${type}/test]`, err);
    return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 });
  }
}
