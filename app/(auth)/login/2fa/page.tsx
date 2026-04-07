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
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isSessionTotpVerified,
  readSessionTokenFromCookieStore,
} from "@/lib/totp";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-factor verification",
};

export default async function LoginTwoFactorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row?.totpEnabledAt) redirect("/dashboard");

  const cookieStore = await cookies();
  const sessionToken = readSessionTokenFromCookieStore(cookieStore);
  if (sessionToken && (await isSessionTotpVerified(sessionToken))) {
    redirect("/dashboard");
  }

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

      <TotpVerifyForm />

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
