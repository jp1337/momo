/**
 * Der Wochenrückblick-Tab von /progress.
 *
 * Vorher: fünf Summary-Kacheln, drei Themen-Kacheln und ein Motivationskasten
 * mit `borderLeft: 4px solid var(--accent-amber)` — drei Amber auf einer
 * Ansicht, wo die Regel eins erlaubt, und kein Test war rot (Spec §1).
 *
 * Nachher: die Zähler der Woche stehen im Rand ("in den Rand gehört, was die
 * App über seinen Tag sagt"), die Themen sind eine Liste, der Motivationssatz
 * ist ein Satz. Kein Amber, keine Fläche, ein Fraunces — die Tab-Kopfzeile.
 */

import { getTranslations, getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWeeklyReview } from "@/lib/weekly-review";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE, Row } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * "5. Mär" — lokalisiert statt der alten `"de-DE"`-Hartkodierung.
 *
 * @param dateStr - Datum als `YYYY-MM-DD`
 * @param locale - die aktive Locale des Nutzers
 * @returns Tag und Kurzmonat in der Schreibweise dieser Locale
 */
function formatShortDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Der Wochenrückblick als Lesespalte plus Rand.
 *
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile der Seite, als erstes Kind der Lesespalte
 * @returns Der Rückblick-Tab in seinem eigenen `PageFrame`
 */
export async function ReviewTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const t = await getTranslations("review");
  const locale = await getLocale();

  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const review = await getWeeklyReview(userId, userRows[0]?.timezone ?? null);

  const delta = review.completionsThisWeek - review.completionsLastWeek;
  const deltaText =
    delta > 0
      ? t("vs_last_week_up", { delta: String(delta) })
      : delta < 0
        ? t("vs_last_week_down", { delta: String(delta) })
        : t("vs_last_week_same");

  const motivationKey = (
    review.completionsThisWeek >= 10 ? "motivation_great" :
    review.completionsThisWeek >= 5  ? "motivation_good" :
    review.completionsThisWeek >= 1  ? "motivation_ok" :
    "motivation_zero"
  ) as "motivation_great" | "motivation_good" | "motivation_ok" | "motivation_zero";

  // `{value} {label}` statt vier neuer ICU-Keys — dasselbe Muster, das der
  // Habits-Rand seit Task 11 benutzt. Eine Null wird nicht ausgewiesen
  // (Spec §6): "0 verschoben" ist kein Zustand, es ist ein täglicher kleiner
  // Vorwurf.
  const railLines: Array<[number, string]> = [
    [review.completionsThisWeek, t("completed")],
    [review.postponementsThisWeek, t("postponed")],
    [review.coinsEarnedThisWeek, t("coins_earned")],
    [review.tasksCreatedThisWeek, t("tasks_created")],
  ];
  const showDelta =
    review.completionsThisWeek > 0 || review.completionsLastWeek > 0;
  const showStreak = review.streakCurrent > 0;
  // `hasRail` muss GENAU das spiegeln, was unten tatsächlich rendert —
  // `PageFrame` prüft nur den Wahrheitswert und reserviert die 208-px-Spalte
  // sonst für nichts (JSDoc in page-frame.tsx).
  const hasRail = railLines.some(([v]) => v > 0) || showDelta || showStreak;

  const rail = !hasRail ? undefined : (
    <>
      {railLines.map(
        ([value, label]) =>
          value > 0 && (
            <p key={label} className={RAIL_LINE}>
              {value} {label}
            </p>
          ),
      )}
      {showDelta && <p className={RAIL_LINE}>{deltaText}</p>}
      {showStreak && (
        <p className={RAIL_LINE}>
          {review.streakCurrent}d {t("streak")} · {t("streak_max")}{" "}
          {review.streakMax}d
        </p>
      )}
    </>
  );

  return (
    <PageFrame rail={rail}>
      {header}
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
        {t("page_subtitle", {
          start: formatShortDate(review.weekStart, locale),
          end: formatShortDate(review.weekEnd, locale),
        })}
      </p>

      <section>
        <GroupHeading>{t("section_topics")}</GroupHeading>
        {review.topTopics.length === 0 ? (
          <EmptyState line={t("no_topics")} />
        ) : (
          <List>
            {review.topTopics.map((topic) => (
              <Row
                key={topic.title}
                testId="review-topic-row"
                wrapTitle
                title={topic.title}
                trailing={t("completions", { count: topic.completions })}
              />
            ))}
          </List>
        )}
      </section>

      <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
        {t(motivationKey)}
      </p>
    </PageFrame>
  );
}
