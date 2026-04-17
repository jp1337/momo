/**
 * POST /api/settings/webhooks/:id/test — Send a test event to the endpoint.
 *
 * Fires a synthetic "task.test" payload to let the user verify their endpoint
 * is reachable and correctly configured. Results are logged to webhook_deliveries.
 *
 * Strict rate limit (5/min) to prevent abuse as a DDoS vector.
 *
 * Requires: authentication
 */

import { resolveApiUser } from "@/lib/api-auth";
import { testWebhookEndpoint } from "@/lib/webhooks";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST — Send a test delivery to the given endpoint.
 * Response: 200 { success: true } | 404 | 429 rate limited
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Strict rate limit — prevents using this as a DDoS vector
  const rateCheck = checkRateLimit(`webhooks-test:${user.userId}`, 5, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt) as NextResponse;

  const { id } = await params;
  try {
    await testWebhookEndpoint(id, user.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[POST /api/settings/webhooks/:id/test]", err);
    return NextResponse.json({ error: "Test delivery failed" }, { status: 500 });
  }
}
