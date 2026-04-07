/**
 * /login/2fa — second-factor challenge after a successful OAuth login.
 *
 * Reached via the (app) layout-level gate when:
 *   - the user is authenticated via OAuth (session cookie present),
 *   - users.totp_enabled_at IS NOT NULL,
 *   - sessions.totp_verified_at IS NULL for the current session row.
 *
 * Renders the TotpVerifyForm client component which calls
 * /api/auth/2fa/verify and on success navigates to /dashboard.
 *
 * Bouncebacks:
 *   - No session → /login
 *   - 2FA not configured → /dashboard (the layout gate would let them in
 *     anyway, but we short-circuit so the form does not 409)
 *   - Session already verified → /dashboard
 */

export const dynamic = "force-dynamic";

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, authenticators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isSessionSecondFactorVerified,
  readSessionTokenFromCookieStore,
  userHasSecondFactor,
} from "@/lib/totp";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { PasskeySecondFactorButton } from "@/components/auth/passkey-second-factor-button";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-factor verification",
};

export default async function LoginTwoFactorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Accept any configured second factor (TOTP or Passkey). If the user has
  // none, there's nothing to verify — let them through.
  if (!(await userHasSecondFactor(session.user.id))) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const sessionToken = readSessionTokenFromCookieStore(cookieStore);
  if (sessionToken && (await isSessionSecondFactorVerified(sessionToken))) {
    redirect("/dashboard");
  }

  // Fetch per-method availability so the challenge UI knows which options
  // to render. A user may have TOTP, a passkey, or both.
  const [totpRow, passkeyRow] = await Promise.all([
    db
      .select({ totpEnabledAt: users.totpEnabledAt })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ id: authenticators.credentialID })
      .from(authenticators)
      .where(eq(authenticators.userId, session.user.id))
      .limit(1),
  ]);
  const hasTotp = !!totpRow[0]?.totpEnabledAt;
  const hasPasskey = passkeyRow.length > 0;

  const t = await getTranslations("auth");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div
      className="w-full max-w-md rounded-2xl p-8 flex flex-col gap-6"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col gap-2">
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("twofa_login_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_login_subtitle")}
        </p>
      </div>

      {hasTotp && <TotpVerifyForm />}

      {hasPasskey && (
        <div className="flex flex-col gap-3">
          {hasTotp && (
            <div
              className="flex items-center gap-3 text-xs uppercase tracking-wider"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              <span className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
              <span>{t("passkey_or")}</span>
              <span className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
            </div>
          )}
          <PasskeySecondFactorButton />
        </div>
      )}

      <form action={doSignOut} className="self-end">
        <button
          type="submit"
          className="text-xs underline underline-offset-2"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_login_signout")}
        </button>
      </form>
    </div>
  );
}
