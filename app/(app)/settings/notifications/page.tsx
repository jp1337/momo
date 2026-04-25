import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, pushSubscriptions, notificationChannels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { NotificationChannels } from "@/components/settings/notification-channels";
import { NotificationHistory } from "@/components/settings/notification-history";
import { MorningBriefingSettings } from "@/components/settings/morning-briefing-settings";
import { isEmailChannelAvailable } from "@/lib/notifications";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notification Settings",
};

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  const [userRows, activeSubs, channelRows] = await Promise.all([
    db
      .select({
        email: users.email,
        notificationEnabled: users.notificationEnabled,
        notificationTime: users.notificationTime,
        dueTodayReminderEnabled: users.dueTodayReminderEnabled,
        overdueReminderEnabled: users.overdueReminderEnabled,
        recurringDueReminderEnabled: users.recurringDueReminderEnabled,
        dueTodayReminderTime: users.dueTodayReminderTime,
        recurringDueReminderTime: users.recurringDueReminderTime,
        overdueReminderTime: users.overdueReminderTime,
        weeklyReviewTime: users.weeklyReviewTime,
        morningBriefingEnabled: users.morningBriefingEnabled,
        morningBriefingTime: users.morningBriefingTime,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
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
  ]);

  const user = userRows[0];
  if (!user) {
    redirect("/login");
  }

  const hasPushOrChannel = activeSubs.length > 0 || channelRows.some((c) => c.enabled);

  return (
    <div className="flex flex-col gap-6">
      {/* Push Notifications */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_notifications")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("notifications_hint")}
          </p>
        </div>
        <NotificationSettings
          initialEnabled={user.notificationEnabled && activeSubs.length > 0}
          initialTime={user.notificationTime ?? "08:00"}
          initialDueTodayEnabled={user.dueTodayReminderEnabled}
          initialOverdueEnabled={user.overdueReminderEnabled}
          initialRecurringDueEnabled={user.recurringDueReminderEnabled}
          initialDueTodayTime={user.dueTodayReminderTime ?? "08:00"}
          initialRecurringDueTime={user.recurringDueReminderTime ?? "08:00"}
          initialOverdueTime={user.overdueReminderTime ?? "08:00"}
          initialWeeklyReviewTime={user.weeklyReviewTime ?? "18:00"}
          hasAnyChannel={channelRows.some((c) => c.enabled)}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        />
      </section>

      {/* Morning Briefing — directly after Push, only when at least one delivery method exists */}
      {hasPushOrChannel && (
        <section
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col gap-1">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
            >
              {t("section_morning_briefing")}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
              {t("morning_briefing_hint")}
            </p>
          </div>
          <MorningBriefingSettings
            initialEnabled={user.morningBriefingEnabled}
            initialTime={user.morningBriefingTime ?? "08:00"}
          />
        </section>
      )}

      {/* Notification Channels */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_channels")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
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

      {/* Notification History */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_notification_history")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("notification_history_hint")}
          </p>
        </div>
        <Suspense fallback={null}>
          <NotificationHistory />
        </Suspense>
      </section>
    </div>
  );
}
