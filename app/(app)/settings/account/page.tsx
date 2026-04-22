import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { TimezoneSettings } from "@/components/settings/timezone-settings";
import { LinkedAccounts } from "@/components/settings/linked-accounts";
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
      {/* Profile */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("section_account")}
        </h2>
        <ProfileSettings
          initialName={user.name}
          initialEmail={user.email}
          initialImage={user.image}
          providerBadgeLabel={providerBadgeLabel}
        />
      </section>

      {/* Language */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_language")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("language_hint")}
          </p>
        </div>
        <LanguageSwitcher currentLocale={locale} />
      </section>

      {/* Timezone */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_timezone")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("timezone_hint")}
          </p>
        </div>
        <TimezoneSettings initialTimezone={user.timezone} />
      </section>

      {/* Linked Accounts */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_linked_accounts")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("linked_accounts_hint")}
          </p>
        </div>
        <Suspense>
          <LinkedAccounts
            linkedProviders={linkedProviders}
            configuredProviders={configuredProviders}
          />
        </Suspense>
      </section>
    </div>
  );
}
