/**
 * POST /api/auth/2fa/setup
 *
 * Starts a TOTP setup wizard. Generates a fresh secret + QR code data URL
 * and stashes the plaintext secret in a short-lived signed httpOnly cookie
 * (`momo_totp_setup`, 10 minutes). Writes nothing to the database — the
 * secret only becomes persistent when the user submits a valid first code
 * via /api/auth/2fa/verify-setup.
 *
 * Auth: session cookie required (NOT API keys — 2FA setup is interactive
 *       and tied to an interactive browser session).
 * Body: none
 * Returns: 200 { qrCodeDataUrl: string, manualEntryKey: string }
 *          401 if unauthenticated
 *          409 if 2FA is already enabled (caller must disable first)
 *          429 if the rate limit is hit
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generateTotpSetup,
  signSetupToken,
  SETUP_COOKIE_NAME,
  SETUP_TOKEN_TTL_SECONDS,
} from "@/lib/totp";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`totp:setup:${session.user.id}`, 5, 5 * 60 * 1000);
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  // Reject if already enabled — the user must disable first to start fresh.
  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (row?.totpEnabledAt) {
    return NextResponse.json(
      { error: "2FA is already enabled", code: "TOTP_ALREADY_ENABLED" },
      { status: 409 }
    );
  }

  const setup = await generateTotpSetup(session.user.email);
  const token = signSetupToken(session.user.id, setup.secret);

  const res = NextResponse.json({
    qrCodeDataUrl: setup.qrCodeDataUrl,
    manualEntryKey: setup.secret,
  });
  res.cookies.set(SETUP_COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SETUP_TOKEN_TTL_SECONDS,
  });
  return res;
}
