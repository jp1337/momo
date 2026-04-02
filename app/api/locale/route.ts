/**
 * POST /api/locale
 * Sets the user's preferred locale as a cookie.
 * No authentication required — locale is a display preference.
 * Body: { locale: string }
 * Returns: { ok: true } | { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { LOCALES } from "@/i18n/request";

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

  const response = NextResponse.json({ ok: true });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
