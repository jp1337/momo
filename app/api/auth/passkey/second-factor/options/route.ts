/**
 * POST /api/auth/passkey/second-factor/options
 *
 * Generates an assertion challenge for a user who already completed the
 * primary (OAuth) login but has not yet satisfied the second-factor gate.
 * Uses `allowCredentials` from the user's registered passkeys so the
 * browser limits the selection to credentials tied to this account.
 *
 * Auth: session cookie required
 * Body: none
 * Returns: 200 PublicKeyCredentialRequestOptionsJSON
 *          401 unauthenticated
 *          409 user has no passkeys registered
 *          429 rate limited
 */

import { auth } from "@/lib/auth";
import {
  createLoginOptionsForUser,
  signChallengeToken,
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_TTL_SECONDS,
} from "@/lib/webauthn";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { authenticators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(
    `passkey:sf-options:${session.user.id}`,
    5,
    5 * 60 * 1000
  );
  if (rl.limited) return rateLimitResponse(rl.resetAt) as unknown as NextResponse;

  // Defensive: reject early if the user has no passkeys at all — saves a
  // dead assertion round-trip.
  const has = await db
    .select({ id: authenticators.credentialID })
    .from(authenticators)
    .where(eq(authenticators.userId, session.user.id))
    .limit(1);
  if (has.length === 0) {
    return NextResponse.json(
      { error: "No passkeys registered", code: "NO_PASSKEYS" },
      { status: 409 }
    );
  }

  const options = await createLoginOptionsForUser(session.user.id);
  const token = signChallengeToken("sf", options.challenge, session.user.id);

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
