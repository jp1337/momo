/**
 * Settings page — user preferences for the Momo application.
 *
 * Sections:
 *  - Account: displays name, avatar, email, and OAuth provider badge
 *  - Push Notifications: enable/disable push, configure daily reminder time
 *  - Language: switch the UI language
 *
 * This is a Server Component that fetches the current user's settings from the DB.
 * Interactive notification controls are in the NotificationSettings client component.
 * Language switching is handled by the LanguageSwitcher client component.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { DeleteAccount } from "@/components/settings/delete-account";
import { LinkedAccounts } from "@/components/settings/linked-accounts";
import { serverEnv } from "@/lib/env";
import { getTranslations, getLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Settings page — loads user preferences and renders the settings UI.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");
  const locale = await getLocale();

  // Fetch user preferences and linked accounts from the DB
  const [userRows, linkedAccountRows] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        image: users.image,
        providerId: users.providerId,
        notificationEnabled: users.notificationEnabled,
        notificationTime: users.notificationTime,
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

  // Derive the OAuth provider badge label from the provider ID prefix
  // Provider IDs are stored as "<provider>:<accountId>" (e.g. "github:12345678")
  const providerLabel = user.providerId
    ? user.providerId.split(":")[0] ?? "OAuth"
    : "OAuth";

  const providerBadgeLabel =
    providerLabel.charAt(0).toUpperCase() + providerLabel.slice(1);

  // Determine which providers are linked and which are configured on the server
  const linkedProviders = linkedAccountRows.map((row) => row.provider);

  const configuredProviders: string[] = [];
  if (serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET) configuredProviders.push("github");
  if (serverEnv.DISCORD_CLIENT_ID && serverEnv.DISCORD_CLIENT_SECRET) configuredProviders.push("discord");
  if (serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET) configuredProviders.push("google");
  if (serverEnv.OIDC_ISSUER && serverEnv.OIDC_CLIENT_ID && serverEnv.OIDC_CLIENT_SECRET) configuredProviders.push("keycloak");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Page title */}
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("page_title")}
        </h1>
        <p
          className="mt-1 text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("page_subtitle")}
        </p>
      </div>

      {/* Account section */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h2
          className="text-base font-semibold"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-primary)",
          }}
        >
          {t("section_account")}
        </h2>

        <div className="flex items-center gap-4">
          {/* Avatar */}
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "User avatar"}
              width={56}
              height={56}
              className="rounded-full"
              style={{ border: "2px solid var(--border)" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--accent-amber)",
                fontFamily: "var(--font-display)",
              }}
            >
              {(user.name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name + email */}
          <div className="flex flex-col gap-0.5">
            <span
              className="font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {user.name ?? t("account_anonymous")}
            </span>
            <span
              className="text-sm"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {user.email ?? "—"}
            </span>
            {/* Provider badge */}
            <span
              className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium w-fit"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
                border: "1px solid var(--border)",
              }}
            >
              {providerBadgeLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Push Notifications section */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
            }}
          >
            {t("section_notifications")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("notifications_hint")}
          </p>
        </div>

        <NotificationSettings
          initialEnabled={user.notificationEnabled}
          initialTime={user.notificationTime ?? "08:00"}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        />
      </section>

      {/* Language section */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
            }}
          >
            {t("section_language")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("language_hint")}
          </p>
        </div>

        <LanguageSwitcher currentLocale={locale} />
      </section>

      {/* Data export section */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
            }}
          >
            {t("section_data")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("data_hint")}
          </p>
        </div>

        <a
          href="/api/user/export"
          download
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            textDecoration: "none",
          }}
        >
          {t("export_download_btn")}
        </a>
      </section>

      {/* Linked accounts section */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
            }}
          >
            {t("section_linked_accounts")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
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

      {/* Danger Zone */}
      <DeleteAccount />
    </div>
  );
}
