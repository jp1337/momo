/**
 * Progress page — unified view of Habits, Achievements, and Weekly Review.
 *
 * Replaces three separate sidebar entries with one consolidated "Progress" page.
 * Tab navigation via ?tab= search param (habits | achievements | review).
 * Server Component — each tab section fetches its own data.
 *
 * Task 11 (Lichtkegel rollout): the habits tab now renders through
 * `PageFrame`. Its four per-habit stat pills (year/30d/7d/streak) moved
 * out of each `HabitCard` and into the page's rail as SUMS — the same
 * pattern `components/tasks/tasks-rail.tsx` already uses for coins ("die
 * Coins der einzelnen Zeilen landen hier als Summe statt an jeder Zeile").
 * That means this page has to fetch the habit list itself (previously
 * `ProgressTabs`' habits branch did that internally) — the rail and the
 * content column both need the same `habits` array, and fetching it twice
 * just to hand the rail its numbers back up would be a wasted round trip.
 * Achievements and review are unchanged and keep fetching inside
 * `ProgressTabs`; they are not part of this task (see task-11-report.md).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getHabitsWithHistory,
  getEarliestCompletion,
  buildYearOptions,
} from "@/lib/habits";
import { PageFrame } from "@/components/ui/page-frame";
import { ProgressTabs, HabitsList } from "@/components/progress/progress-tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Progress",
};

type Tab = "habits" | "achievements" | "review";
const VALID_TABS: Tab[] = ["habits", "achievements", "review"];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("progress");
  const params = await searchParams;
  const tab: Tab = VALID_TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "habits";

  // Shared page header — the one Fraunces headline plus tab navigation.
  // Grouped in its own flex block (not two loose PageFrame children) so
  // the 16px gap between title and tabs stays tight regardless of the
  // frame's own 32px inter-block rhythm below it.
  const header = (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>
      <nav className="flex gap-1" aria-label={t("page_title")}>
        {(["habits", "achievements", "review"] as const).map((key) => {
          const isActive = tab === key;
          const labelKey = `tab_${key}` as const;
          return (
            <Link
              key={key}
              href={`/progress?tab=${key}`}
              className={cn(
                "rounded-[var(--radius-sm)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.85rem] no-underline! transition-colors",
                isActive
                  ? "bg-[var(--raised)] font-semibold text-[var(--ink)]!"
                  : "bg-transparent font-medium text-[var(--ink-3)]! hover:text-[var(--ink-2)]!",
              )}
            >
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  if (tab !== "habits") {
    // Achievements and review keep their pre-migration layout — they are
    // out of this task's scope (see task-11-report.md) and their own
    // internal width (900px / max-w-4xl) is wider than `--measure`;
    // wrapping them in `PageFrame` here would squeeze both grids without
    // fixing anything about them.
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {header}
        <ProgressTabs tab={tab} userId={session.user.id} />
      </div>
    );
  }

  const t2 = await getTranslations("habits");
  const currentYear = new Date().getFullYear();
  const parsed = Number(params.year);
  const requestedYear =
    Number.isFinite(parsed) && parsed >= 2024 && parsed <= currentYear + 1
      ? Math.floor(parsed)
      : currentYear;

  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const timezone = userRows[0]?.timezone ?? null;

  const [habits, earliest] = await Promise.all([
    getHabitsWithHistory(session.user.id, requestedYear, timezone),
    getEarliestCompletion(session.user.id),
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
  // Inlined rather than a standalone helper taking a translator param:
  // `scripts/check-i18n.mjs` maps a variable name to a namespace via a
  // plain textual regex, not real scope analysis, and only recognizes
  // names bound by `const X = getTranslations(...)` — a function parameter
  // of the same name doesn't register, so a separate `t`-typed helper
  // either collides with this file's outer `t` (misfiling these keys under
  // "progress", which the check then reports as missing — they aren't) or,
  // renamed, becomes invisible to the check entirely. Calling `t2` here
  // directly, in the scope where it really is `getTranslations("habits")`,
  // keeps both the binding and the checker's textual match honest.
  let bestStreakText: string | null = null;
  if (bestStreakHabit && bestStreakHabit.streak.current > 0) {
    const { current, periodDays } = bestStreakHabit.streak;
    switch (periodDays) {
      case 1:
        bestStreakText = t2("streak_unit_days", { n: current });
        break;
      case 7:
        bestStreakText = t2("streak_unit_weeks", { n: current });
        break;
      case 14:
        bestStreakText = t2("streak_unit_biweeks", { n: current });
        break;
      case 30:
      case 31:
        bestStreakText = t2("streak_unit_months", { n: current });
        break;
      default:
        bestStreakText = t2("streak_unit_generic", { n: current, d: periodDays });
    }
  }

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
              <p
                key={label}
                className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]"
              >
                {value} {label}
              </p>
            ),
        )}
        {bestStreakText && (
          <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
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
