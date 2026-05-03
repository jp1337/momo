import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { QuestSettings } from "@/components/settings/quest-settings";
import { VacationModeSettings } from "@/components/settings/vacation-mode-settings";
import { EmotionalClosureSettings } from "@/components/settings/emotional-closure-settings";
import { SettingsSection } from "@/components/settings/settings-section";
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
      <SettingsSection
        title={t("section_quest_settings")}
        hint={t("quest_settings_hint")}
      >
        <QuestSettings initialPostponeLimit={user.questPostponeLimit} />
      </SettingsSection>

      <SettingsSection title={t("section_vacation_mode")}>
        <VacationModeSettings
          initialActive={user.vacationEndDate !== null}
          initialEndDate={user.vacationEndDate}
        />
      </SettingsSection>

      <SettingsSection
        title={tClosure("setting_label")}
        hint={tClosure("setting_hint")}
      >
        <EmotionalClosureSettings initialEnabled={user.emotionalClosureEnabled} />
      </SettingsSection>
    </div>
  );
}
