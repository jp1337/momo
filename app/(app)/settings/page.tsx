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
import { users, accounts, pushSubscriptions, notificationChannels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { NotificationChannels } from "@/components/settings/notification-channels";
import { NotificationHistory } from "@/components/settings/notification-history";
import { isEmailChannelAvailable } from "@/lib/notifications";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { TimezoneSettings } from "@/components/settings/timezone-settings";
import { DeleteAccount } from "@/components/settings/delete-account";
import { LinkedAccounts } from "@/components/settings/linked-accounts";
import { QuestSettings } from "@/components/settings/quest-settings";
import { EmotionalClosureSettings } from "@/components/settings/emotional-closure-settings";
import { SecuritySection } from "@/components/settings/security-section";
import { PasskeysSection } from "@/components/settings/passkeys-section";
import { CalendarFeedSection } from "@/components/settings/calendar-feed-section";
import { MorningBriefingSettings } from "@/components/settings/morning-briefing-settings";
import { VacationModeSettings } from "@/components/settings/vacation-mode-settings";
import { getCalendarFeedStatus } from "@/lib/calendar";
import { getUserTotpStatus } from "@/lib/totp";
import { listUserPasskeys } from "@/lib/webauthn";
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
  const tClosure = await getTranslations("closure");
  const locale = await getLocale();

  // Fetch user preferences, linked accounts, push subscriptions, notification channels, 2FA status, and passkeys from DB
  const [userRows, linkedAccountRows, activeSubs, channelRows, totpStatus, passkeys, calendarFeed] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        image: users.image,
        providerId: users.providerId,
        notificationEnabled: users.notificationEnabled,
        notificationTime: users.notificationTime,
        dueTodayReminderEnabled: users.dueTodayReminderEnabled,
        questPostponeLimit: users.questPostponeLimit,
        emotionalClosureEnabled: users.emotionalClosureEnabled,
        morningBriefingEnabled: users.morningBriefingEnabled,
        morningBriefingTime: users.morningBriefingTime,
        vacationEndDate: users.vacationEndDate,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id)),
    db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, session.user.id))
      .limit(1),
    db
      .select({
        type: notificationChannels.type,
        config: notificationChannels.config,
        enabled: notificationChannels.enabled,
      })
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, session.user.id)),
    getUserTotpStatus(session.user.id),
    listUserPasskeys(session.user.id),
    getCalendarFeedStatus(session.user.id),
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
  if (serverEnv.MICROSOFT_CLIENT_ID && serverEnv.MICROSOFT_CLIENT_SECRET) configuredProviders.push("microsoft-entra-id");
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

        <ProfileSettings
          initialName={user.name}
          initialEmail={user.email}
          initialImage={user.image}
          providerBadgeLabel={providerBadgeLabel}
        />
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
          initialEnabled={user.notificationEnabled && activeSubs.length > 0}
          initialTime={user.notificationTime ?? "08:00"}
          initialDueTodayEnabled={user.dueTodayReminderEnabled}
          hasAnyChannel={channelRows.some((c) => c.enabled)}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        />
      </section>

      {/* Notification Channels section */}
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
            {t("section_channels")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("channels_hint")}
          </p>
        </div>

        <NotificationChannels
          initialChannels={channelRows.map((ch) => ({
            type: ch.type,
            config: ch.config as Record<string, unknown>,
            enabled: ch.enabled,
          }))}
          emailAvailable={isEmailChannelAvailable()}
          defaultEmailAddress={user.email ?? ""}
        />
      </section>

      {/* Morning Briefing section — visible when at least one delivery method exists */}
      {(activeSubs.length > 0 || channelRows.some((c) => c.enabled)) && (
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
              {t("section_morning_briefing")}
            </h2>
            <p
              className="text-sm"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("morning_briefing_hint")}
            </p>
          </div>

          <MorningBriefingSettings
            initialEnabled={user.morningBriefingEnabled}
            initialTime={user.morningBriefingTime ?? "08:00"}
          />
        </section>
      )}

      {/* Notification History section */}
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
            {t("section_notification_history")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("notification_history_hint")}
          </p>
        </div>

        <Suspense fallback={null}>
          <NotificationHistory />
        </Suspense>
      </section>

      {/* Security / Two-Factor Authentication section */}
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
            {t("section_security")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("security_hint")}
          </p>
        </div>

        <SecuritySection
          initialEnabled={totpStatus.enabled}
          initialEnabledAt={
            totpStatus.enabledAt ? totpStatus.enabledAt.toISOString() : null
          }
          initialUnusedBackupCodes={totpStatus.unusedBackupCodes}
          required={serverEnv.REQUIRE_2FA ?? false}
        />

        <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <h3
            className="text-sm font-semibold mb-3"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
            }}
          >
            {t("passkey_section_title")}
          </h3>
          <PasskeysSection
            initialPasskeys={passkeys.map((p) => ({
              ...p,
              createdAt: p.createdAt,
              lastUsedAt: p.lastUsedAt,
            }))}
            required={serverEnv.REQUIRE_2FA ?? false}
            hasTotp={totpStatus.enabled}
          />
        </div>
      </section>

      {/* Quest Settings section */}
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
            {t("section_quest_settings")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("quest_settings_hint")}
          </p>
        </div>

        <QuestSettings initialPostponeLimit={user.questPostponeLimit} />
      </section>

      {/* Vacation Mode section */}
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
            {t("section_vacation_mode")}
          </h2>
        </div>

        <VacationModeSettings
          initialActive={user.vacationEndDate !== null}
          initialEndDate={user.vacationEndDate}
        />
      </section>

      {/* Emotional Closure section */}
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
            {tClosure("setting_label")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {tClosure("setting_hint")}
          </p>
        </div>

        <EmotionalClosureSettings initialEnabled={user.emotionalClosureEnabled} />
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

      {/* Timezone section */}
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
            {t("section_timezone")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("timezone_hint")}
          </p>
        </div>

        <TimezoneSettings initialTimezone={user.timezone} />
      </section>

      {/* Calendar feed section */}
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
            {t("section_calendar_feed")}
          </h2>
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("calendar_feed_hint")}
          </p>
        </div>

        <CalendarFeedSection
          initialActive={calendarFeed.active}
          initialCreatedAt={
            calendarFeed.createdAt ? calendarFeed.createdAt.toISOString() : null
          }
        />
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
