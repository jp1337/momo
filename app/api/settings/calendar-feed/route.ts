/**
 * GET    /api/settings/calendar-feed  → { active, createdAt }
 * POST   /api/settings/calendar-feed  → { url, createdAt }   (rotate / create)
 * DELETE /api/settings/calendar-feed  → { success: true }    (revoke)
 *
 * Manages the per-user iCal calendar feed token.
 *
 * Auth: cookie session, 2FA-verified (the token grants read access to every
 * task's metadata without any further challenge — equivalent sensitivity to
 * creating an API key, which is also behind the 2FA gate). Bearer/API-key
 * callers are rejected — feed tokens must be managed from a trusted browser
 * session, not programmatically.
 *
 * Rate limit: 10 mutations / minute / user (generous for accidental
 * double-clicks; rotation is fast + idempotent).
 */

import {
  resolveVerifiedApiUser,
  verifiedAuthErrorResponse,
} from "@/lib/api-auth";
import {
  createOrRotateCalendarToken,
  revokeCalendarToken,
  getCalendarFeedStatus,
} from "@/lib/calendar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clientEnv } from "@/lib/env";

/** Build the publicly shareable feed URL from a plaintext token. */
function feedUrl(token: string): string {
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/api/calendar/${token}.ics`;
}

/** GET — current feed status (active + createdAt). Never returns the token. */
export async function GET(request: Request) {
  const auth = await resolveVerifiedApiUser(request);
  if (!auth.ok) return verifiedAuthErrorResponse(auth.reason);

  const status = await getCalendarFeedStatus(auth.user.userId);
  return Response.json(status);
}

/** POST — create a new token or rotate the existing one. Returns plaintext URL once. */
export async function POST(request: Request) {
  const auth = await resolveVerifiedApiUser(request);
  if (!auth.ok) return verifiedAuthErrorResponse(auth.reason);

  const rate = checkRateLimit(
    `calendar-feed-mutate:${auth.user.userId}`,
    10,
    60_000
  );
  if (rate.limited) return rateLimitResponse(rate.resetAt);

  try {
    const token = await createOrRotateCalendarToken(auth.user.userId);
    return Response.json({
      url: feedUrl(token),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/settings/calendar-feed]", err);
    return Response.json(
      { error: "Failed to generate feed token" },
      { status: 500 }
    );
  }
}

/** DELETE — revoke the existing token, if any. Idempotent. */
export async function DELETE(request: Request) {
  const auth = await resolveVerifiedApiUser(request);
  if (!auth.ok) return verifiedAuthErrorResponse(auth.reason);

  const rate = checkRateLimit(
    `calendar-feed-mutate:${auth.user.userId}`,
    10,
    60_000
  );
  if (rate.limited) return rateLimitResponse(rate.resetAt);

  try {
    await revokeCalendarToken(auth.user.userId);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/settings/calendar-feed]", err);
    return Response.json(
      { error: "Failed to revoke feed token" },
      { status: 500 }
    );
  }
}
