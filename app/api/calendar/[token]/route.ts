/**
 * GET /api/calendar/:token
 * GET /api/calendar/:token.ics
 *
 * Public iCalendar feed for a single user. The token in the URL path is the
 * only authentication — callers (Google/Apple/Outlook Calendar, Thunderbird,
 * etc.) cannot send custom headers or cookies. An invalid or revoked token
 * returns 404 to avoid leaking existence information.
 *
 * Auth:     token in URL path (no session, no Bearer)
 * Body:     —
 * Returns:  text/calendar (RFC 5545 VCALENDAR document)
 *
 * Rate limit: 60 requests / minute / token (multi-device polling is allowed)
 */

import {
  buildIcsForUser,
  getUserByCalendarToken,
} from "@/lib/calendar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clientEnv } from "@/lib/env";
import { createHash } from "crypto";

/** Strip a trailing `.ics` from the path segment — some calendar clients expect a file extension. */
function stripIcsSuffix(token: string): string {
  return token.endsWith(".ics") ? token.slice(0, -4) : token;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawParam } = await params;
  const token = stripIcsSuffix(rawParam);

  // Rate-limit per token-hash (never per raw token — tokens are secrets
  // and the rate limiter's in-memory map should not retain them verbatim).
  const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);
  const rate = checkRateLimit(`ical-feed:${tokenHash}`, 60, 60_000);
  if (rate.limited) return rateLimitResponse(rate.resetAt);

  const user = await getUserByCalendarToken(token);
  if (!user) {
    // 404 (not 401) — do not signal whether a token exists or is revoked.
    return new Response("Not found", { status: 404 });
  }

  try {
    const ics = await buildIcsForUser(user.id, clientEnv.NEXT_PUBLIC_APP_URL);
    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="momo.ics"',
        "Cache-Control": "private, max-age=900",
      },
    });
  } catch (error) {
    console.error("[GET /api/calendar/:token]", error);
    return new Response("Failed to build calendar feed", { status: 500 });
  }
}
