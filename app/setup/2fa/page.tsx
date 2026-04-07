/**
 * /setup/2fa — forced 2FA setup landing page.
 *
 * Reached when REQUIRE_2FA=true is set on this Momo instance and the user
 * has no second factor configured yet. The page is unskippable (no nav,
 * no sign-out shortcut other than the link in the corner) until the user
 * finishes the wizard or signs out.
 *
 * If the user already has a second factor configured, we bounce them
 * straight to /dashboard — this prevents the page from being used as a
 * way to "re-set up" 2FA without first disabling it.
 */

export const dynamic = "force-dynamic";

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { userHasSecondFactor } from "@/lib/totp";
import { ForcedTotpSetup } from "@/components/auth/forced-totp-setup";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up 2FA",
};

export default async function ForcedTotpSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (await userHasSecondFactor(session.user.id)) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div
      className="w-full max-w-xl rounded-2xl p-8 flex flex-col gap-6"
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
          {t("twofa_forced_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_forced_intro")}
        </p>
      </div>

      <ForcedTotpSetup />

      <form action={doSignOut} className="self-end">
        <button
          type="submit"
          className="text-xs underline underline-offset-2"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_forced_signout")}
        </button>
      </form>
    </div>
  );
}
