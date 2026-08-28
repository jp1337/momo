/**
 * Der Statistiken-Tab von /progress.
 *
 * Umzug aus `app/(app)/stats/page.tsx` (834 Zeilen, 68 Ratschen-Verstöße,
 * 16 Fraunces-Vorkommen). Sechzehn ist gemessen, nicht geschätzt — der
 * Titel, vier Übersichtskacheln, der Level-Titel, das Level-Abzeichen, zwei
 * Münz-Zahlen, drei Aktivitätskacheln, vier Wunschlistenkacheln.
 *
 * `/stats` war von genau einer Stelle
 * erreichbar — dem Benutzermenü — und beanspruchte dieselbe Rolle wie
 * /progress: Zahlen über dich. Nach dem Umzug gibt es eine
 * Zahlen-Destination statt zwei, und die neue steht in der Navigation
 * statt in einem Menü (Spec §2).
 *
 * Was hier bleibt und was nicht:
 *  - `streak_history` BLEIBT. Die Sparkline zeigt `users.streakCurrent`
 *    über die Zeit — den Aufgaben-Streak aus der Gamification. Der Rail des
 *    Habits-Tabs zeigt `HabitStreak.current` (Gewohnheiten über Perioden),
 *    eine andere Zahl. Der VERLAUF existiert sonst nirgends.
 *  - `wishlist` ENTFÄLLT. bought/open/discarded sind auf /wishlist
 *    abzählbar; `totalSpent` zieht in die BudgetBar.
 *  - `topics` ZIEHT MIT UM. Die Spec zählt neun Abschnitte, es sind zehn —
 *    dieser fehlte in der Tabelle und fällt weder unter "bleibt" noch unter
 *    "entfällt".
 *
 * Die flachen Zähler (Übersicht, Aktivität) stehen im Rand, weil dort
 * hingehört, "was die App über seinen Tag sagt". In der Lesespalte bleibt,
 * was Struktur hat: Verlauf, Verteilungen, Themen.
 */
import { getTranslations, getLocale } from "next-intl/server";
import { getUserStatistics } from "@/lib/statistics";
import { LEVELS, getNextLevel } from "@/lib/gamification";
import {
  getEnergyHistory,
  getEnergyLevelCounts,
  getEnergyCheckinDayCount,
} from "@/lib/energy";
import { EnergyWeekBlock } from "@/components/stats/energy-week-block";
import { WeekdayChart } from "@/components/stats/weekday-chart";
import { StreakSparkline } from "@/components/stats/streak-sparkline";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE, Row } from "@/components/ui/list";

/**
 * Die Zahlen über den Nutzer: flache Zähler im Rand, alles mit Struktur
 * (Verlauf, Verteilungen, Themen) in der Lesespalte.
 *
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile der Seite, als erstes Kind der Lesespalte
 * @returns Der Statistiken-Tab in seinem eigenen `PageFrame`
 */
export async function StatsTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const [stats, energyWeekCounts, energyHistory, energyDayCount, t, locale] =
    await Promise.all([
      getUserStatistics(userId),
      getEnergyLevelCounts(userId, 7),
      getEnergyHistory(userId, 90),
      getEnergyCheckinDayCount(userId),
      getTranslations("stats"),
      getLocale(),
    ]);

  const currentLevelDef =
    LEVELS.find((l) => l.level === stats.level) ?? LEVELS[0];
  const nextLevelDef = getNextLevel(stats.level);
  const levelProgress = nextLevelDef
    ? Math.min(
        100,
        Math.round(
          ((stats.coins - currentLevelDef.minCoins) /
            (nextLevelDef.minCoins - currentLevelDef.minCoins)) *
            100,
        ),
      )
    : 100;

  const totalByType =
    stats.tasksByType.ONE_TIME +
    stats.tasksByType.RECURRING +
    stats.tasksByType.DAILY_ELIGIBLE;
  const totalByPriority =
    stats.tasksByPriority.HIGH +
    stats.tasksByPriority.NORMAL +
    stats.tasksByPriority.SOMEDAY;

  const weekdayLabels = [
    t("weekday_mon"), t("weekday_tue"), t("weekday_wed"), t("weekday_thu"),
    t("weekday_fri"), t("weekday_sat"), t("weekday_sun"),
  ];
  const bestWeekdayCount = Math.max(...stats.completionsByWeekday);
  const streakPeak = Math.max(...stats.streakHistory, 0);

  /** Der Bug aus Spec §6: `"de-DE"` hartkodiert bei sieben Locales. */
  const memberSince = stats.memberSince.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Der Rand: sieben flache Zähler, `{value} {label}` (das Muster der
  // Habits-Randsummen), Null wird nicht ausgewiesen (Spec §6). Die ersten
  // zwei sind Katalogtatsachen und stehen immer.
  const rail = (
    <>
      <p className={RAIL_LINE}>
        {stats.totalTasksCreated} {t("tasks_created")}
      </p>
      <p className={RAIL_LINE}>
        {stats.totalCompletions} {t("completions_total")}
      </p>
      {/* Der Münzstand steht BEDINGUNGSLOS hier, nicht nur im Bruch unten
          (Task-4-Review, Important 1): `getNextLevel` liefert auf Stufe 10
          `null` (`lib/gamification.ts`), der Bruch `{coins} / {minCoins}`
          entfällt dann komplett — und damit verschwände `stats.coins` von
          der ganzen Seite, ausgerechnet für die Nutzerin, die am ehesten
          nachsieht. Die alte Seite zeigte den Stand zweimal und immer.
          `coins_label` ist eine vollständige ICU-Nachricht (`{count} Coins`),
          also der Aufruf mit `count` statt der `{value} {label}`-Verkettung
          der Nachbarzeilen — sonst stünde die Zahl doppelt. */}
      <p className={RAIL_LINE}>{t("coins_label", { count: stats.coins })}</p>
      {stats.streakCurrent > 0 && (
        <p className={RAIL_LINE}>
          {stats.streakCurrent}d {t("current_streak")}
        </p>
      )}
      {stats.streakMax > 0 && (
        <p className={RAIL_LINE}>
          {stats.streakMax}d {t("best_streak")}
        </p>
      )}
      {stats.completionsLast7Days > 0 && (
        <p className={RAIL_LINE}>
          {stats.completionsLast7Days} {t("completions_7d")}
        </p>
      )}
      {stats.completionsLast30Days > 0 && (
        <p className={RAIL_LINE}>
          {stats.completionsLast30Days} {t("completions_30d")}
        </p>
      )}
      {stats.openTasks > 0 && (
        <p className={RAIL_LINE}>
          {stats.openTasks} {t("open_tasks")}
        </p>
      )}
    </>
  );

  /** Eine Verteilungszeile: Label links, "N · P%" rechts in Mono. */
  const distribution = (rows: Array<[string, number]>, total: number) => (
    <List>
      {rows.map(([label, value]) => (
        <Row
          key={label}
          testId="stats-distribution-row"
          title={label}
          trailing={`${value} · ${
            total > 0 ? Math.round((value / total) * 100) : 0
          }%`}
        />
      ))}
    </List>
  );

  return (
    <PageFrame rail={rail}>
      {header}

      {/* ── Fortschritt ──────────────────────────────────────────────────
          Der Level-Fortschrittsbalken wird ein Mono-Bruch: ein Balken zeigt
          einen Anteil, ein Bruch zeigt beide Zahlen — dieselbe Umformung,
          die der Münzring auf /wishlist bekommt (Spec §4). */}
      <section>
        <GroupHeading>{t("section_progress")}</GroupHeading>
        <div className="flex flex-col gap-2">
          <p className="m-0 font-[family-name:var(--font-mono)] text-[1rem] text-[var(--ink)]">
            {t("level_label", { level: stats.level })} · {currentLevelDef.title}
          </p>
          {nextLevelDef && (
            <p className={RAIL_LINE}>
              {stats.coins} / {nextLevelDef.minCoins} ·{" "}
              {t("level_percent", { percent: levelProgress })}
            </p>
          )}
          <p className={RAIL_LINE}>
            {stats.coinsEarnedAllTime} {t("total_earned")}
          </p>
          <p className={RAIL_LINE}>{t("member_since", { date: memberSince })}</p>
        </div>
      </section>

      {/* ── Streak-Verlauf — bleibt (Spec §2) ───────────────────────────── */}
      {stats.streakHistory.some((v) => v > 0) && (
        <section>
          <GroupHeading>{t("section_streak_history")}</GroupHeading>
          <StreakSparkline
            data={stats.streakHistory}
            todayLabel={t("streak_today", { count: stats.streakCurrent })}
            peakLabel={t("streak_peak", { count: streakPeak })}
          />
        </section>
      )}

      {/* ── Beste Wochentage ────────────────────────────────────────────── */}
      {stats.completionsByWeekday.some((v) => v > 0) && (
        <section>
          <GroupHeading>{t("section_weekdays")}</GroupHeading>
          <WeekdayChart
            data={stats.completionsByWeekday}
            labels={weekdayLabels}
            bestDayLabel={t("best_day")}
            bestDayCount={t("completions_count", { count: bestWeekdayCount })}
          />
        </section>
      )}

      {/* ── Energie ─────────────────────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_energy")}</GroupHeading>
        <EnergyWeekBlock
          weekCounts={energyWeekCounts}
          history={energyHistory}
          isEmpty={energyDayCount === 0}
        />
      </section>

      {/* ── Aufgaben nach Typ ───────────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_tasks_by_type")}</GroupHeading>
        {distribution(
          [
            [t("type_one_time"), stats.tasksByType.ONE_TIME],
            [t("type_recurring"), stats.tasksByType.RECURRING],
            [t("type_daily_eligible"), stats.tasksByType.DAILY_ELIGIBLE],
          ],
          totalByType,
        )}
      </section>

      {/* ── Aufgaben nach Priorität ─────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_tasks_by_priority")}</GroupHeading>
        {distribution(
          [
            [t("priority_high"), stats.tasksByPriority.HIGH],
            [t("priority_normal"), stats.tasksByPriority.NORMAL],
            [t("priority_someday"), stats.tasksByPriority.SOMEDAY],
          ],
          totalByPriority,
        )}
      </section>

      {/* ── Themen ──────────────────────────────────────────────────────────
          Derselbe Zeilenentwurf wie /topics seit Phase 1: der Name trägt den
          Inhalt, die Themenfarbe ist der 6-px-Punkt, der Fortschritt steht
          rechts als "3/7". Der farbcodierte Balken (rot < 25 %, grün ≥ 75 %)
          entfällt — er hat --danger und --done zu Bewertungen umgedeutet,
          die beiden Token bedeuten ausschließlich Zerstörung/Überfälligkeit
          und "erledigt". */}
      {stats.topicsWithStats.length > 0 && (
        <section>
          <GroupHeading>
            {t("section_topics", { count: stats.totalTopics })}
          </GroupHeading>
          <List>
            {stats.topicsWithStats.map((topic) => {
              const pct =
                topic.totalTasks > 0
                  ? Math.round((topic.completedTasks / topic.totalTasks) * 100)
                  : 0;
              const eyebrow =
                topic.completionsLast30Days > 0
                  ? `${t("topic_completed_pct", { percent: pct })} · ${t(
                      "topic_completions_30d",
                      { count: topic.completionsLast30Days },
                    )}`
                  : t("topic_completed_pct", { percent: pct });
              return (
                <Row
                  key={topic.id}
                  testId="stats-topic-row"
                  wrapTitle
                  title={topic.title}
                  eyebrow={eyebrow}
                  dotColor={topic.color ?? null}
                  trailing={`${topic.completedTasks}/${topic.totalTasks}`}
                />
              );
            })}
          </List>
        </section>
      )}
    </PageFrame>
  );
}
