import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarFeedSection } from "@/components/settings/calendar-feed-section";
import { OutboundWebhooks } from "@/components/settings/webhooks";
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
      {/* Calendar Feed */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_calendar_feed")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("calendar_feed_hint")}
          </p>
        </div>
        <CalendarFeedSection
          initialActive={calendarFeed.active}
          initialCreatedAt={calendarFeed.createdAt ? calendarFeed.createdAt.toISOString() : null}
        />
      </section>

      {/* Outbound Webhooks */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_outbound_webhooks")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("outbound_webhooks_hint")}
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

      {/* API Keys info card */}
      <section
        className="rounded-xl p-6 flex flex-col gap-3"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_api_keys")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("api_keys_hint")}
          </p>
        </div>
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
      </section>
    </div>
  );
}
