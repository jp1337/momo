/**
 * POST /api/auth/passkey/login/verify
 *
 * Completes passwordless primary login. Verifies the browser assertion
 * against the stored credential, creates a brand-new Auth.js session row
 * with `second_factor_verified_at = now()` (passkeys are inherently MFA),
 * and sets the canonical Auth.js session cookie so subsequent requests are
 * authenticated via the existing DrizzleAdapter code path.
 *
 * Auth: none — this IS the login call.
 * Body: { response: AuthenticationResponseJSON }
 * Returns: 200 { success: true }
 *          400 invalid body
 *          410 challenge cookie missing/expired
 *          422 assertion failed
 *          429 rate limited
 */

import {
  verifyLogin,
  verifyChallengeToken,
  createPasskeyLoginSession,
  CHALLENGE_COOKIE_NAME,
  PASSKEY_SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  SECURE_SESSION_COOKIE_NAME,
} from "@/lib/webauthn";
import { AuthenticationVerifyInputSchema } from "@/lib/validators/passkey";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`passkey:login-verify:${ip}`, 20, 5 * 60 * 1000);
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = AuthenticationVerifyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;
  if (!tokenCookie) {
    return NextResponse.json(
      { error: "Login challenge expired", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }
  const expectedChallenge = verifyChallengeToken(tokenCookie, "login");
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Login challenge expired", code: "CHALLENGE_EXPIRED" },
      { status: 410 }
    );
  }

  const verified = await verifyLogin(parsed.data.response, expectedChallenge);
  if (!verified) {
    return NextResponse.json(
      { error: "Assertion failed", code: "ASSERTION_FAILED" },
      { status: 422 }
    );
  }

  // Create a fresh Auth.js database session row for the resolved user.
  const sessionToken = await createPasskeyLoginSession(verified.userId, {
    userAgent: req.headers.get("user-agent"),
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown",
  });

  // Set the canonical Auth.js session cookie. Cookie name depends on
  // whether we're behind HTTPS — match the Auth.js v5 naming.
  const isProd = serverEnv.NODE_ENV === "production";
  const cookieName = isProd ? SECURE_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME;

  const res = NextResponse.json({ success: true });
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(PASSKEY_SESSION_TTL_MS / 1000),
  });
  res.cookies.delete(CHALLENGE_COOKIE_NAME);
  return res;
}
