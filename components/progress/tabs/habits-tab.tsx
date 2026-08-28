/**
 * Der Gewohnheiten-Tab von /progress — Lesespalte plus Rand.
 *
 * Zusammengelegt aus `app/(app)/progress/page.tsx` (Datenbeschaffung und
 * Rand) und `progress-tabs.tsx`s `HabitsList` (Lesespalte). Task 11 der
 * Phase 1 hatte die Beschaffung in die Seite gehoben, weil Rand und Spalte
 * dasselbe `habits`-Array brauchen und der damalige Dispatcher den Rand nie
 * zu sehen bekam. Seit jeder Tab seinen eigenen `PageFrame` besitzt, gilt
 * dieser Grund nicht mehr: hier wird einmal geholt und beides beliefert.
 */

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getHabitsWithHistory,
  getEarliestCompletion,
  buildYearOptions,
} from "@/lib/habits";
import type { HabitStreak, HabitWithHistory } from "@/lib/habits";
import { HabitCard } from "@/components/habits/habit-card";
import { YearSelector } from "@/components/habits/year-selector";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, RAIL_LINE } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/**
 * The habits tab's content column: a mono `GroupHeading` + subtitle, the
 * year selector (only when there's more than one year to pick from and at
 * least one habit), then one `List`+`Row` (via `HabitCard`) plus its
 * `ContributionGrid` per habit — or `EmptyState` when there is none.
 *
 * `habits`/`year`/`yearOptions` are pre-fetched by `HabitsTab` below, which
 * also derives the tab's rail sums from the same `habits` array — one
 * query, two consumers.
 */
async function HabitsList({
  habits,
  year,
  yearOptions,
}: {
  habits: HabitWithHistory[];
  year: number;
  yearOptions: number[];
}) {
  const t = await getTranslations("habits");

  const monthLabels = [
    t("month_jan"), t("month_feb"), t("month_mar"), t("month_apr"),
    t("month_may"), t("month_jun"), t("month_jul"), t("month_aug"),
    t("month_sep"), t("month_oct"), t("month_nov"), t("month_dec"),
  ] as [string, string, string, string, string, string, string, string, string, string, string, string];

  const weekdayLabels = [
    t("weekday_mon"), t("weekday_tue"), t("weekday_wed"), t("weekday_thu"),
    t("weekday_fri"), t("weekday_sat"), t("weekday_sun"),
  ] as [string, string, string, string, string, string, string];

  const labels = {
    recurrenceEveryDay: t("recurrence_every_day"),
    recurrenceEveryNDays: t("recurrence_every_n_days"),
    recurrenceWeekly: t("recurrence_weekly"),
    recurrenceMonthly: t("recurrence_monthly"),
    recurrenceYearly: t("recurrence_yearly"),
    pausedUntilLabel: t("habit_paused_until"),
    gridLabels: {
      // t.raw(), nicht t(): contribution-grid.tsx setzt {count}/{year} selbst
      // ein (dieselbe FORMATTING_ERROR-Ursache wie bei den Tooltips unten).
      gridAriaLabel: String(t.raw("grid_aria_label")),
      // t.raw(), nicht t(): contribution-grid.tsx setzt {date} und {count}
      // selbst ein (eine Zelle pro Tag, clientseitig). t() formatiert die
      // ICU-Nachricht sofort und wirft ohne die Werte FORMATTING_ERROR —
      // bei jedem Aufruf von /progress?tab=habits.
      tooltipOne: String(t.raw("cell_tooltip_one")),
      tooltipOther: String(t.raw("cell_tooltip_other")),
      tooltipEmpty: String(t.raw("cell_tooltip_empty")),
      monthLabels,
      weekdayLabels,
    },
  };

  return (
    <section className="flex flex-col gap-6">
      <GroupHeading>{t("page_title")}</GroupHeading>
      <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
        {t("page_subtitle")}
      </p>

      {yearOptions.length > 1 && habits.length > 0 && (
        <YearSelector
          currentYear={year}
          years={yearOptions}
          label={t("year_selector_label")}
          baseHref="/progress?tab=habits"
          yearParam="year"
        />
      )}

      {habits.length === 0 ? (
        <EmptyState
          line={t("empty_body")}
          action={
            <Button asChild variant="quiet" size="md">
              <Link href="/tasks">{t("empty_cta")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              year={year}
              labels={labels}
              streakTrailing={formatHabitStreakTrailing(t, habit.streak)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Eine laufende Serie in der Einheit ihrer Periode — "3 Tage in Folge",
 * "2 Wochen in Folge".
 *
 * Steht bewusst UNTERHALB der `getTranslations("habits")`-Bindung von
 * `HabitsList`: `scripts/check-i18n.mjs` ordnet eine Übersetzer-Variable
 * ihrem Namensraum per Textregex zu, nicht per Scope-Analyse, und nimmt
 * dafür die LETZTE Bindung des Namens auf oder vor der Aufrufzeile. Über
 * der Bindung definiert, wären diese fünf Keys aus der
 * Vollständigkeitsprüfung stillschweigend herausgefallen — genau das war
 * der Zustand, solange die beiden Kopien dieses Switches in zwei Dateien
 * lagen und ein geteilter Helfer `t(...)` in einer Datei ohne Bindung
 * aufgerufen hätte.
 *
 * @param t - eine `getTranslations("habits")`-Bindung dieser Datei
 * @param n - Länge der Serie, gezählt in Perioden
 * @param periodDays - Länge einer Periode in Tagen
 * @returns Der lokalisierte Serientext
 */
function streakUnitText(
  t: Awaited<ReturnType<typeof getTranslations>>,
  n: number,
  periodDays: number,
): string {
  switch (periodDays) {
    case 1:
      return t("streak_unit_days", { n });
    case 7:
      return t("streak_unit_weeks", { n });
    case 14:
      return t("streak_unit_biweeks", { n });
    case 30:
    case 31:
      return t("streak_unit_months", { n });
    default:
      return t("streak_unit_generic", { n, d: periodDays });
  }
}

/**
 * Formats one habit's own streak as a `trailing`-slot string, e.g.
 * "2 Tage in Folge · Neuer Rekord" or "3 Wochen in Folge · Rekord: 12".
 *
 * Task-11-review I3: the four per-habit stat pills (Task 11's first pass)
 * moved to the page rail as SUMS, but a streak isn't additive — it's the
 * one number a habit tracker exists to show, and dropping it from every
 * row (leaving it only as a single page-wide "best of all habits" line)
 * lost real information for every OTHER habit. This restores it to the
 * row itself, in `Row`'s existing `trailing` slot — no new `Row` prop, no
 * pill, no chip.
 *
 * `null` when the habit has neither a running nor a past streak (current
 * and best both 0) — missing metric means show nothing (spec §6), not a
 * "Noch keiner" placeholder (that key, `stat_streak_empty`, stays for the
 * rail's own all-habits line, which the brief explicitly keeps at "line
 * omitted", not "line replaced with placeholder text").
 *
 * @param t - this file's own `getTranslations("habits")` binding
 * @param streak - the habit's own current/best/periodDays
 * @returns The formatted trailing text, or `null` if there is nothing to show
 */
function formatHabitStreakTrailing(
  t: Awaited<ReturnType<typeof getTranslations>>,
  streak: HabitStreak,
): string | null {
  const { current, best, periodDays } = streak;
  if (current === 0 && best === 0) return null;

  const parts: string[] = [];
  if (current > 0) parts.push(streakUnitText(t, current, periodDays));
  if (best > 0) {
    // `best` is always ≥ `current` (computeHabitStreak keeps it that way):
    // equal means the currently running streak IS the all-time record.
    parts.push(current === best ? t("stat_streak_best_current") : t("stat_streak_best", { n: best }));
  }
  return parts.join(" · ");
}

/**
 * Holt die Gewohnheiten des Nutzers einmal und beliefert damit beides:
 * die Randsummen und die Lesespalte (`HabitsList`).
 *
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile der Seite, als erstes Kind der Lesespalte
 * @param props.yearParam - roher `?year=`-Wert; alles Ungültige fällt auf das laufende Jahr zurück
 * @returns Der Gewohnheiten-Tab in seinem eigenen `PageFrame`
 */
export async function HabitsTab({
  userId,
  header,
  yearParam,
}: {
  userId: string;
  header: React.ReactNode;
  yearParam?: string;
}) {
  const t2 = await getTranslations("habits");
  const currentYear = new Date().getFullYear();
  const parsed = Number(yearParam);
  const requestedYear =
    Number.isFinite(parsed) && parsed >= 2024 && parsed <= currentYear + 1
      ? Math.floor(parsed)
      : currentYear;

  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRows[0]?.timezone ?? null;

  const [habits, earliest] = await Promise.all([
    getHabitsWithHistory(userId, requestedYear, timezone),
    getEarliestCompletion(userId),
  ]);
  const yearOptions = buildYearOptions(earliest, currentYear);

  // Rail sums — same shape as tasks-rail's coins total: each habit's own
  // year/30d/7d completion counts land here added together, not as a pill
  // on every row. "Streak" isn't additive across habits the way a
  // completion count is, so it becomes the single longest CURRENTLY
  // running streak among them — where "longest" means the most elapsed
  // TIME, not the most periods. `HabitStreak.current` (`lib/habits.ts`) is
  // a count of periods of `periodDays` length, so a daily habit at
  // `current: 10` (10 days) and a monthly habit at `current: 6` (≈180
  // days) are not comparable by `current` alone — the comparison has to
  // weight by `periodDays` (`current * periodDays` ≈ days elapsed).
  // Task-11-review I3: the previous comparator picked the highest raw
  // `current`, which made the daily habit "win" over the monthly one
  // despite covering an eighteenth of the time.
  const totalYear = habits.reduce((sum, h) => sum + h.totalYear, 0);
  const totalLast30 = habits.reduce((sum, h) => sum + h.totalLast30, 0);
  const totalLast7 = habits.reduce((sum, h) => sum + h.totalLast7, 0);
  const bestStreakHabit = habits.reduce<(typeof habits)[number] | null>(
    (best, h) => {
      const elapsed = h.streak.current * h.streak.periodDays;
      const bestElapsed = best ? best.streak.current * best.streak.periodDays : 0;
      return elapsed > bestElapsed ? h : best;
    },
    null,
  );
  const bestStreakText =
    bestStreakHabit && bestStreakHabit.streak.current > 0
      ? streakUnitText(
          t2,
          bestStreakHabit.streak.current,
          bestStreakHabit.streak.periodDays,
        )
      : null;

  // Missing metric means show nothing (spec §6): a 0 here is not a status
  // worth stating, so each line — including the rail itself — is omitted
  // rather than printed as a zero. That "rail itself" part matters here in
  // a way it doesn't on /tasks or /topics: a fresh habit with no
  // completions yet is the NORMAL case (every habit starts at year=0,
  // last30=0, last7=0, no streak), not an edge case, so `rail` must be
  // `undefined` — not a `<>` that merely renders no visible lines —
  // whenever every sum is 0. `PageFrame` checks `rail` by truthiness, and
  // an empty-but-truthy Fragment still makes it reserve the 208px+48px
  // rail column: a habit page with real habits but zero completions would
  // otherwise show a blank gutter and a narrower content column for
  // nothing (found by looking at the page, not by a test — none of the
  // FIVE design-rule assertions per page can see an empty rail column,
  // since it carries no boxed surface and no text to miscount).
  const hasRailContent = totalYear > 0 || totalLast30 > 0 || totalLast7 > 0 || bestStreakText !== null;
  // One `[number, label]` pair per sum line instead of three copies of the
  // same three-line `<p>` (Task-11-review, minor): the streak line stays
  // separate below — it has no plain number, and its label+value is one
  // ICU message (`rail_streak`), not a JS-side concatenation.
  const sumLines: Array<[number, string]> = [
    [totalYear, t2("stat_total_year")],
    [totalLast30, t2("stat_last_30")],
    [totalLast7, t2("stat_last_7")],
  ];
  const rail =
    !hasRailContent ? undefined : (
      <>
        {sumLines.map(
          ([value, label]) =>
            value > 0 && (
              <p key={label} className={RAIL_LINE}>
                {value} {label}
              </p>
            ),
        )}
        {bestStreakText && (
          <p className={RAIL_LINE}>
            {
              // Ein volles ICU-Fragment statt Label + hartkodiertem ": " +
              // Wert (Task-11-Review, minor): Sprachen setzen ihre
              // Interpunktion anders (Französisch " : ", Deutsch/Englisch/
              // Russisch/Chinesisch ohne Leerzeichen davor) — genau wie die
              // Geschwisterzeilen der Rand-Summen in /tasks und /topics
              // schon volle ICU-Nachrichten übergeben statt JS-seitig zu
              // verketten.
              t2("rail_streak", { streak: bestStreakText })
            }
          </p>
        )}
      </>
    );

  return (
    <PageFrame rail={rail}>
      {header}
      <HabitsList habits={habits} year={requestedYear} yearOptions={yearOptions} />
    </PageFrame>
  );
}
