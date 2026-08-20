/**
 * GET    /api/settings/calendar-feed  → { active, createdAt }
 * POST   /api/settings/calendar-feed  → { url, createdAt }   (rotate / create)
 * DELETE /api/settings/calendar-feed  → { success: true }    (revoke)
 *
 * Manages the per-user iCal calendar feed token.
 *
 * Auth:
 *  - GET: cookie session, 2FA-verified — OR a Bearer/API-key caller (exempt
 *    from the 2FA gate, same as any other read endpoint). It never returns
 *    the token itself, only { active, createdAt }, so this is low-stakes.
 *  - POST / DELETE: cookie session ONLY, 2FA-verified. The token grants read
 *    access to every task's metadata without any further challenge —
 *    equivalent sensitivity to creating an API key, which is also behind the
 *    2FA gate. Bearer/API-key callers are rejected outright, with 403
 *    `BEARER_SESSION_REQUIRED` — even a fully-privileged (non-readonly) key —
 *    because feed tokens must be rotated/revoked from a trusted browser
 *    session, not programmatically. This is a deliberate breaking change for
 *    any script that previously rotated/revoked the feed token via an API
 *    key; that was never supposed to work.
 *
 * Rate limit: 10 mutations / minute / user (generous for accidental
 * double-clicks; rotation is fast + idempotent).
 */

import {
  resolveVerifiedApiUser,
  resolveSessionOnlyApiUser,
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
  const auth = await resolveSessionOnlyApiUser(request);
  if (!auth.ok) return verifiedAuthErrorResponse(auth.reason);
  // No readonly-key check here: resolveSessionOnlyApiUser refuses every
  // Bearer/API-key caller above (401/403 before this line), so reaching
  // here means a cookie session authenticated us, and cookie sessions are
  // never readonly. A `user.readonly` check would be unreachable dead code.

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
  const auth = await resolveSessionOnlyApiUser(request);
  if (!auth.ok) return verifiedAuthErrorResponse(auth.reason);
  // No readonly-key check here: resolveSessionOnlyApiUser refuses every
  // Bearer/API-key caller above (401/403 before this line), so reaching
  // here means a cookie session authenticated us, and cookie sessions are
  // never readonly. A `user.readonly` check would be unreachable dead code.

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
