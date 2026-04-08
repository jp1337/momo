/**
 * Habits page — GitHub-style year contribution grid per recurring task.
 *
 * Server Component. Lists every RECURRING task the authenticated user
 * owns and renders an inline year heatmap for each. The year is driven
 * by the `?year=` query param, clamped to the range of years in which
 * the user has actually used the app (see lib/habits.ts::buildYearOptions).
 *
 * No API route — this page is SSR-only. When the user clicks a year chip,
 * the YearSelector pushes `?year=YYYY` which re-runs this page.
 *
 * Requires: authentication (redirects to /login if no session).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling } from "@fortawesome/free-solid-svg-icons";
import { auth } from "@/lib/auth";
import {
  getHabitsWithHistory,
  getEarliestCompletion,
  buildYearOptions,
} from "@/lib/habits";
import { HabitCard } from "@/components/habits/habit-card";
import { YearSelector } from "@/components/habits/year-selector";

export const metadata: Metadata = {
  title: "Gewohnheiten — Momo",
};

interface HabitsPageProps {
  searchParams: Promise<{ year?: string }>;
}

/**
 * Habits page for the authenticated user. Clamps the `?year=` search
 * param into the valid range, fetches all recurring tasks with completion
 * history, and renders one HabitCard per task.
 */
export default async function HabitsPage({ searchParams }: HabitsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const t = await getTranslations("habits");

  // Clamp the year param: fall back to current year, never accept garbage.
  const currentYear = new Date().getFullYear();
  const params = await searchParams;
  const parsedYear = Number(params.year);
  const requestedYear =
    Number.isFinite(parsedYear) && parsedYear >= 2024 && parsedYear <= currentYear + 1
      ? Math.floor(parsedYear)
      : currentYear;

  const [habits, earliest] = await Promise.all([
    getHabitsWithHistory(userId, requestedYear),
    getEarliestCompletion(userId),
  ]);

  const yearOptions = buildYearOptions(earliest, currentYear);

  // Pre-translate every string the (server) card & grid need, so the
  // child components can stay dumb and take plain strings.
  const monthLabels = [
    t("month_jan"),
    t("month_feb"),
    t("month_mar"),
    t("month_apr"),
    t("month_may"),
    t("month_jun"),
    t("month_jul"),
    t("month_aug"),
    t("month_sep"),
    t("month_oct"),
    t("month_nov"),
    t("month_dec"),
  ] as [string, string, string, string, string, string, string, string, string, string, string, string];

  const weekdayLabels = [
    t("weekday_mon"),
    t("weekday_tue"),
    t("weekday_wed"),
    t("weekday_thu"),
    t("weekday_fri"),
    t("weekday_sat"),
    t("weekday_sun"),
  ] as [string, string, string, string, string, string, string];

  const cardLabels = {
    statTotalYear: t("stat_total_year"),
    statLast30: t("stat_last_30"),
    statLast7: t("stat_last_7"),
    recurrenceEveryDay: t("recurrence_every_day"),
    recurrenceEveryNDays: t("recurrence_every_n_days"),
    gridLabels: {
      gridAriaLabel: t("grid_aria_label"),
      tooltipOne: t("cell_tooltip_one"),
      tooltipOther: t("cell_tooltip_other"),
      tooltipEmpty: t("cell_tooltip_empty"),
      monthLabels,
      weekdayLabels,
    },
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FontAwesomeIcon
            icon={faSeedling}
            className="w-5 h-5"
            style={{ color: "var(--accent-green)" }}
            aria-hidden="true"
          />
          <h1
            className="text-3xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("page_title")}
          </h1>
        </div>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("page_subtitle")}
        </p>
      </div>

      {/* ── Year selector ─────────────────────────────────────────────────── */}
      {yearOptions.length > 1 && habits.length > 0 && (
        <YearSelector
          currentYear={requestedYear}
          years={yearOptions}
          label={t("year_selector_label")}
        />
      )}

      {/* ── Habits list or empty state ────────────────────────────────────── */}
      {habits.length === 0 ? (
        <div
          className="rounded-xl p-8 flex flex-col items-center gap-3 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faSeedling}
            className="w-8 h-8"
            style={{ color: "var(--accent-green)", opacity: 0.5 }}
            aria-hidden="true"
          />
          <h2
            className="text-lg"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("empty_title")}
          </h2>
          <p
            className="text-sm max-w-md"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("empty_body")}
          </p>
          <Link
            href="/tasks"
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium no-underline"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--accent-green)",
              color: "var(--bg-primary)",
              border: "1px solid var(--accent-green)",
            }}
          >
            {t("empty_cta")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              year={requestedYear}
              labels={cardLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
