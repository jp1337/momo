/**
 * Der Errungenschaften-Tab von /progress.
 *
 * Vorher: eine Level-Karte mit Verlauf, Glow und farbigem Oberstreifen, eine
 * Hero-Karte mit Amber-Radialverlauf und Trophäen-Emoji, und ein Kachelraster
 * aus bis zu 48 gerahmten Karten (Spec §1: drei Amber auf einer Ansicht).
 *
 * Nachher: Level, Freischaltstand und Münzen stehen im Rand; die Seltenheit
 * ist die Gruppenüberschrift; jede Errungenschaft ist eine Zeile.
 */
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAchievementsWithProgress } from "@/lib/statistics";
import {
  retroactivelyGrantAchievements,
  getLevelForCoins,
  getNextLevel,
  LEVELS,
} from "@/lib/gamification";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE } from "@/components/ui/list";
import { AchievementRow } from "@/components/achievements/achievement-row";

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

/**
 * Der Errungenschaften-Tab: Level/Freischaltstand/Münzen im Rand, die
 * Seltenheit als `GroupHeading`, jede Errungenschaft als `AchievementRow`.
 * `all` ist der volle Katalog (`getAchievementsWithProgress`) — der ist in
 * der Praxis nie leer, also gibt es hier keinen Empty-State: eine neue
 * Nutzerin sieht sofort den vollen, größtenteils gesperrten Katalog statt
 * eines Hinweistexts, der dasselbe noch einmal in Worten sagt.
 *
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile der Seite, als erstes Kind der Lesespalte
 * @returns Der Errungenschaften-Tab in seinem eigenen `PageFrame`
 */
export async function AchievementsTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const t = await getTranslations("achievements");

  const userRow = await db
    .select({ timezone: users.timezone, coins: users.coins })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRow[0]?.timezone ?? null;
  const coins = userRow[0]?.coins ?? 0;

  await retroactivelyGrantAchievements(userId, timezone);
  const all = await getAchievementsWithProgress(userId, timezone);

  const currentLevelDef = getLevelForCoins(coins);
  const nextLevelDef = getNextLevel(currentLevelDef.level);
  const maxLevel = LEVELS[LEVELS.length - 1].level;
  const earned = all.filter((a) => a.earnedAt != null);

  const RARITY_LABEL: Record<(typeof RARITY_ORDER)[number], string> = {
    legendary: t("section_legendary"),
    epic: t("section_epic"),
    rare: t("section_rare"),
    common: t("section_common"),
  };

  // Der Rand: was die App über den Stand sagt. Nie Amber (PageFrame-Regel) —
  // die Stufenfarben (`RARITY_ACCENT`, `tierColor`) entfallen ersatzlos.
  const rail = (
    <>
      <p className={RAIL_LINE}>
        {t("unlocked_count", { earned: earned.length, total: all.length })}
      </p>
      <p className={RAIL_LINE}>
        {t("level_of_max", { level: currentLevelDef.level, max: maxLevel })}
      </p>
      <p className={RAIL_LINE}>{currentLevelDef.title}</p>
      {nextLevelDef ? (
        <p className={RAIL_LINE}>
          {t("coins_to_next_level", {
            count: nextLevelDef.minCoins - coins,
            level: nextLevelDef.level,
            title: nextLevelDef.title,
          })}
        </p>
      ) : (
        <p className={RAIL_LINE}>{t("level_max_reached")}</p>
      )}
    </>
  );

  const recentlyEarned = [...earned]
    .sort(
      (a, b) =>
        new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime(),
    )
    .slice(0, 3);

  return (
    <PageFrame rail={rail}>
      {header}

      {recentlyEarned.length > 0 && (
        <section>
          <GroupHeading>{t("recently_unlocked")}</GroupHeading>
          <List>
            {recentlyEarned.map((a) => (
              <AchievementRow key={`recent-${a.key}`} achievement={a} />
            ))}
          </List>
        </section>
      )}

      {RARITY_ORDER.map((rarity) => {
        const tier = all.filter((a) => a.rarity === rarity);
        if (tier.length === 0) return null;
        const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
        return (
          <section key={rarity}>
            {/* "LEGENDÄR · 2 / 5" — die Seltenheit als Struktur, nicht
                als farbiges Abzeichen an jeder Zeile. */}
            <GroupHeading>
              {RARITY_LABEL[rarity]} ·{" "}
              {t("progress", { current: earnedInTier, total: tier.length })}
            </GroupHeading>
            <List>
              {[
                ...tier.filter((a) => a.earnedAt != null),
                ...tier.filter((a) => a.earnedAt == null),
              ].map((achievement) => (
                <AchievementRow
                  key={achievement.key}
                  achievement={achievement}
                />
              ))}
            </List>
          </section>
        );
      })}
    </PageFrame>
  );
}
