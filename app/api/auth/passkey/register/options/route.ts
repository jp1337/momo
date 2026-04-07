/**
 * POST /api/auth/passkey/register/options
 *
 * Starts a Passkey registration. Generates fresh WebAuthn options (challenge,
 * exclude list, RP info) and stashes the raw challenge in a signed short-
 * lived cookie (`momo_webauthn_challenge`, 5 min, kind="reg").
 *
 * Auth: session cookie required (an authenticated browser tab is the
 *       prerequisite for registering a credential against the user).
 * Body: none
 * Returns: 200 PublicKeyCredentialCreationOptionsJSON
 *          401 unauthenticated
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  createRegistrationOptions,
  signChallengeToken,
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_TTL_SECONDS,
} from "@/lib/webauthn";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(
    `passkey:register-options:${session.user.id}`,
    5,
    5 * 60 * 1000
  );
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  const options = await createRegistrationOptions(
    session.user.id,
    session.user.email,
    session.user.name
  );

  const token = signChallengeToken("reg", options.challenge, session.user.id);

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
