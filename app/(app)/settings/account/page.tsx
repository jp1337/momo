import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { TimezoneSettings } from "@/components/settings/timezone-settings";
import { LinkedAccounts } from "@/components/settings/linked-accounts";
import { SettingsSection } from "@/components/settings/settings-section";
import { serverEnv } from "@/lib/env";
import { getTranslations, getLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");
  const locale = await getLocale();

  const [userRows, linkedAccountRows] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        image: users.image,
        providerId: users.providerId,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id)),
  ]);

  const user = userRows[0];
  if (!user) {
    redirect("/login");
  }

  const providerLabel = user.providerId
    ? user.providerId.split(":")[0] ?? "OAuth"
    : "OAuth";
  const providerBadgeLabel =
    providerLabel.charAt(0).toUpperCase() + providerLabel.slice(1);

  const linkedProviders = linkedAccountRows.map((row) => row.provider);

  const configuredProviders: string[] = [];
  if (serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET) configuredProviders.push("github");
  if (serverEnv.DISCORD_CLIENT_ID && serverEnv.DISCORD_CLIENT_SECRET) configuredProviders.push("discord");
  if (serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET) configuredProviders.push("google");
  if (serverEnv.MICROSOFT_CLIENT_ID && serverEnv.MICROSOFT_CLIENT_SECRET) configuredProviders.push("microsoft-entra-id");
  if (serverEnv.OIDC_ISSUER && serverEnv.OIDC_CLIENT_ID && serverEnv.OIDC_CLIENT_SECRET) configuredProviders.push("keycloak");

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t("section_account")}>
        <ProfileSettings
          initialName={user.name}
          initialEmail={user.email}
          initialImage={user.image}
          providerBadgeLabel={providerBadgeLabel}
        />
      </SettingsSection>

      <SettingsSection title={t("section_language")} hint={t("language_hint")}>
        <LanguageSwitcher currentLocale={locale} />
      </SettingsSection>

      <SettingsSection title={t("section_timezone")} hint={t("timezone_hint")}>
        <TimezoneSettings initialTimezone={user.timezone} />
      </SettingsSection>

      <SettingsSection
        title={t("section_linked_accounts")}
        hint={t("linked_accounts_hint")}
      >
        <Suspense>
          <LinkedAccounts
            linkedProviders={linkedProviders}
            configuredProviders={configuredProviders}
          />
        </Suspense>
      </SettingsSection>
    </div>
  );
}
