import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarFeedSection } from "@/components/settings/calendar-feed-section";
import { OutboundWebhooks } from "@/components/settings/webhooks";
import { SettingsSection } from "@/components/settings/settings-section";
import { getCalendarFeedStatus } from "@/lib/calendar";
import { listWebhookEndpoints } from "@/lib/webhooks";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations Settings",
};

export default async function IntegrationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  const [calendarFeed, webhookEndpoints] = await Promise.all([
    getCalendarFeedStatus(session.user.id),
    listWebhookEndpoints(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title={t("section_calendar_feed")}
        hint={t("calendar_feed_hint")}
      >
        <CalendarFeedSection
          initialActive={calendarFeed.active}
          initialCreatedAt={calendarFeed.createdAt ? calendarFeed.createdAt.toISOString() : null}
        />
      </SettingsSection>

      <section
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("section_outbound_webhooks")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("outbound_webhooks_hint")}{" "}
            <a
              href="https://jp1337.github.io/momo/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-amber)", textDecoration: "underline" }}
            >
              {t("outbound_webhooks_docs")}
            </a>
          </p>
        </div>
        <OutboundWebhooks
          initialEndpoints={webhookEndpoints.map((ep) => ({
            ...ep,
            createdAt: ep.createdAt.toISOString(),
            updatedAt: ep.updatedAt.toISOString(),
          }))}
        />
      </section>

      <SettingsSection title={t("section_api_keys")} hint={t("api_keys_hint")}>
        <Link
          href="/api-keys"
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            textDecoration: "none",
          }}
        >
          {t("api_keys_link")}
        </Link>
      </SettingsSection>
    </div>
  );
}
