/**
 * POST /api/locale
 * Sets the user's preferred locale as a cookie and persists it to the DB
 * when the user is authenticated (so server-side notifications arrive in
 * the right language).
 * Body: { locale: string }
 * Returns: { ok: true } | { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { LOCALES } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Keyed by IP rather than by user: this is the only mutation route that also
  // answers unauthenticated callers (it then just sets the cookie), so there is
  // no user id to key on for half the traffic. The limit sits before the body
  // parse and the session lookup so a flood costs neither a DB round-trip nor
  // an `auth()` call.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rate = checkRateLimit(`locale:${ip}`, 20, 60_000);
  if (rate.limited) return rateLimitResponse(rate.resetAt);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale = (body as { locale?: string }).locale;
  if (!locale || !(LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  // Persist to DB for authenticated users so server-side jobs (email, push)
  // can send notifications in the user's language without a request context.
  const session = await auth();
  if (session?.user?.id) {
    await db
      .update(users)
      .set({ locale })
      .where(eq(users.id, session.user.id));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
