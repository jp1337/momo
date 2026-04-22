import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { QuestSettings } from "@/components/settings/quest-settings";
import { VacationModeSettings } from "@/components/settings/vacation-mode-settings";
import { EmotionalClosureSettings } from "@/components/settings/emotional-closure-settings";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quest Settings",
};

export default async function QuestSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");
  const tClosure = await getTranslations("closure");

  const userRows = await db
    .select({
      questPostponeLimit: users.questPostponeLimit,
      emotionalClosureEnabled: users.emotionalClosureEnabled,
      vacationEndDate: users.vacationEndDate,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Quest Settings */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_quest_settings")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("quest_settings_hint")}
          </p>
        </div>
        <QuestSettings initialPostponeLimit={user.questPostponeLimit} />
      </section>

      {/* Vacation Mode */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_vacation_mode")}
          </h2>
        </div>
        <VacationModeSettings
          initialActive={user.vacationEndDate !== null}
          initialEndDate={user.vacationEndDate}
        />
      </section>

      {/* Emotional Closure */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {tClosure("setting_label")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {tClosure("setting_hint")}
          </p>
        </div>
        <EmotionalClosureSettings initialEnabled={user.emotionalClosureEnabled} />
      </section>
    </div>
  );
}
