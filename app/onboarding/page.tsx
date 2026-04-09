/**
 * /onboarding — guided first-start wizard for new users.
 *
 * Reached when onboarding_completed is false on the user record.
 * If the user already completed onboarding, bounce to /dashboard.
 *
 * The page renders the OnboardingWizard client component which drives
 * a 4-step guided flow: Welcome → Create Topic → Add Tasks → Notifications.
 */

export const dynamic = "force-dynamic";

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (await isOnboardingCompleted(session.user.id)) {
    redirect("/dashboard");
  }

  const t = await getTranslations("onboarding");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <OnboardingWizard userName={session.user.name ?? null} />

      <form action={doSignOut} className="self-end">
        <button
          type="submit"
          className="text-xs underline underline-offset-2"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("sign_out")}
        </button>
      </form>
    </div>
  );
}
