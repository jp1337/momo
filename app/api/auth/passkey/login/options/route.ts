/**
 * POST /api/auth/passkey/login/options
 *
 * Starts a passwordless primary login. Generates a discoverable-credentials
 * assertion challenge (empty `allowCredentials`), stores it in the signed
 * challenge cookie (kind="login"), and returns the options to the browser.
 *
 * Auth: none — this is the entry point for unauthenticated users.
 * Body: none
 * Returns: 200 PublicKeyCredentialRequestOptionsJSON
 *          429 rate limited
 */

import {
  createDiscoverableLoginOptions,
  signChallengeToken,
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_TTL_SECONDS,
} from "@/lib/webauthn";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate-limit by client IP (best effort — behind a reverse proxy the
  // x-forwarded-for header is the canonical source). Lower key cardinality
  // than per-user because there is no user identity yet.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`passkey:login-options:${ip}`, 20, 5 * 60 * 1000);
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  const options = await createDiscoverableLoginOptions();
  const token = signChallengeToken("login", options.challenge);

  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
  return res;
}
