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

export async function POST(req: NextRequest) {
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
