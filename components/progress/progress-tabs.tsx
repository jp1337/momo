/**
 * ProgressTabs — server component that renders the content for the
 * achievements and review tabs of the unified /progress page.
 *
 * The habits tab is handled directly by `app/(app)/progress/page.tsx`
 * (Task 11): its `PageFrame` rail needs the same `habits` data its content
 * column renders, so the page fetches it once and passes it to
 * `HabitsList` (exported below) — routing it through this generic
 * dispatcher would mean fetching it a second time just to hand it back up
 * to a rail the dispatcher itself never sees. Achievements and review each
 * still do their own data fetching; only the active branch runs.
 */

import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarWeek,
  faCircleCheck,
  faForward,
  faCoins,
  faFire,
  faPlus,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { HabitStreak, HabitWithHistory } from "@/lib/habits";
import { HabitCard } from "@/components/habits/habit-card";
import { YearSelector } from "@/components/habits/year-selector";
import { GroupHeading } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getAchievementsWithProgress } from "@/lib/statistics";
import {
  retroactivelyGrantAchievements,
  getLevelForCoins,
  getNextLevel,
  LEVELS,
} from "@/lib/gamification";
import { AchievementCard } from "@/components/achievements/achievement-card";
import { getWeeklyReview } from "@/lib/weekly-review";
import { resolveTopicIcon } from "@/lib/topic-icons";

type Tab = "achievements" | "review";

interface ProgressTabsProps {
  tab: Tab;
  userId: string;
}

// ── Achievements constants ──────────────────────────────────────────────────

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;
const RARITY_ACCENT: Record<string, string> = {
  legendary: "var(--rarity-legendary)",
  epic: "var(--accent-amber)",
  rare: "var(--accent-green)",
  common: "var(--text-muted)",
};

// ── Weekly Review helpers ────────────────────────────────────────────────────

function formatShortDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// ── Main component ───────────────────────────────────────────────────────────

export async function ProgressTabs({ tab, userId }: ProgressTabsProps) {
  if (tab === "achievements") return <AchievementsTab userId={userId} />;
  return <ReviewTab userId={userId} />;
}

// ── Habits tab ───────────────────────────────────────────────────────────────

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
 * Duplicates the `periodDays` switch in `app/(app)/progress/page.tsx`
 * rather than sharing it as an imported helper — for the same reason that
 * file's own comment gives: `scripts/check-i18n.mjs` matches a
 * translator variable to its namespace via a per-file textual regex on
 * `const t = getTranslations(...)`, not real scope analysis. A shared
 * helper taking `t` as a parameter would call `t(...)` in a file with no
 * such binding, and those calls would silently drop out of the i18n
 * completeness check instead of failing loudly on a missing translation.
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
  if (current > 0) {
    switch (periodDays) {
      case 1:
        parts.push(t("streak_unit_days", { n: current }));
        break;
      case 7:
        parts.push(t("streak_unit_weeks", { n: current }));
        break;
      case 14:
        parts.push(t("streak_unit_biweeks", { n: current }));
        break;
      case 30:
      case 31:
        parts.push(t("streak_unit_months", { n: current }));
        break;
      default:
        parts.push(t("streak_unit_generic", { n: current, d: periodDays }));
    }
  }
  if (best > 0) {
    // `best` is always ≥ `current` (computeHabitStreak keeps it that way):
    // equal means the currently running streak IS the all-time record.
    parts.push(current === best ? t("stat_streak_best_current") : t("stat_streak_best", { n: best }));
  }
  return parts.join(" · ");
}

/**
 * The habits tab's content column: a mono `GroupHeading` + subtitle, the
 * year selector (only when there's more than one year to pick from and at
 * least one habit), then one `List`+`Row` (via `HabitCard`) plus its
 * `ContributionGrid` per habit — or `EmptyState` when there is none.
 *
 * `habits`/`year`/`yearOptions` are pre-fetched by
 * `app/(app)/progress/page.tsx`, which also derives the page's rail sums
 * from the same `habits` array — one query, two consumers.
 */
export async function HabitsList({
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

// ── Achievements tab ─────────────────────────────────────────────────────────

async function AchievementsTab({ userId }: { userId: string }) {
  const t = await getTranslations("achievements");

  const userRow = await db
    .select({ timezone: users.timezone, coins: users.coins })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRow[0]?.timezone ?? null;
  const coins = userRow[0]?.coins ?? 0;

  await retroactivelyGrantAchievements(userId, timezone);
  const allAchievements = await getAchievementsWithProgress(userId, timezone);

  const currentLevelDef = getLevelForCoins(coins);
  const nextLevelDef = getNextLevel(currentLevelDef.level);
  const levelProgress = nextLevelDef
    ? Math.round(
        ((coins - currentLevelDef.minCoins) /
          (nextLevelDef.minCoins - currentLevelDef.minCoins)) *
          100
      )
    : 100;
  const coinsToNext = nextLevelDef ? nextLevelDef.minCoins - coins : 0;

  const earned = allAchievements.filter((a) => a.earnedAt != null);
  const total = allAchievements.length;
  const pct = Math.round((earned.length / Math.max(total, 1)) * 100);

  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((r) => [r, allAchievements.filter((a) => a.rarity === r)])
  );

  const recentlyEarned = [...earned]
    .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
    .slice(0, 3);

  const tierColor =
    currentLevelDef.level >= 10 ? "var(--rarity-legendary)"
    : currentLevelDef.level >= 7 ? "var(--accent-amber)"
    : currentLevelDef.level >= 4 ? "var(--accent-green)"
    : "var(--text-muted)";

  const maxLevel = LEVELS[LEVELS.length - 1].level;

  const RARITY_LABEL: Record<string, string> = {
    legendary: t("section_legendary"),
    epic: t("section_epic"),
    rare: t("section_rare"),
    common: t("section_common"),
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Level progression card */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
          border: `1.5px solid color-mix(in srgb, ${tierColor} 30%, var(--border))`,
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "16px",
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 0 24px color-mix(in srgb, ${tierColor} 6%, transparent)`,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tierColor, borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px", height: "56px", borderRadius: "14px",
                background: `color-mix(in srgb, ${tierColor} 15%, var(--bg-surface))`,
                border: `1.5px solid color-mix(in srgb, ${tierColor} 40%, transparent)`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.55rem", fontWeight: 700, color: tierColor, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>{t("level_label")}</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: tierColor, lineHeight: 1 }}>{currentLevelDef.level}</span>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, fontStyle: "italic", color: "var(--text-primary)", marginBottom: "3px" }}>
                {currentLevelDef.title}
              </div>
              {nextLevelDef ? (
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span style={{ color: tierColor, fontWeight: 600 }}>
                    {t("coins_to_next_level", { count: coinsToNext, level: nextLevelDef.level, title: nextLevelDef.title })}
                  </span>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: tierColor, fontWeight: 600 }}>
                  {t("level_max_reached")}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
            {t("level_of_max", { level: currentLevelDef.level, max: maxLevel })}
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "3px", backgroundColor: tierColor, width: `${levelProgress}%`, transition: "width 0.6s ease", opacity: 0.85 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "var(--font-ui)", fontSize: "0.68rem", color: "var(--text-muted)" }}>
            <span>{currentLevelDef.minCoins}</span>
            {nextLevelDef && <span style={{ color: tierColor, fontWeight: 600 }}>{levelProgress}%</span>}
            {nextLevelDef && <span>{nextLevelDef.minCoins}</span>}
          </div>
        </div>
      </div>

      {/* Hero header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "28px 28px 24px",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div aria-hidden="true" style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, var(--accent-amber) 0%, transparent 70%)", opacity: 0.07, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>🏆</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 1.8rem)", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {t("page_title")}
              </h2>
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.88rem", color: "var(--text-muted)", margin: "0 0 20px" }}>
              {t("page_subtitle", { earned: earned.length, total })}
            </p>
            <div style={{ width: "min(320px, 100%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                <span>{t("unlocked_count", { earned: earned.length, total })}</span>
                <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "3px", background: "linear-gradient(90deg, var(--accent-amber), var(--rarity-legendary))", width: `${pct}%`, transition: "width 0.8s ease" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignSelf: "center" }}>
            {RARITY_ORDER.map((rarity) => {
              const tier = byRarity[rarity] ?? [];
              const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
              const color = RARITY_ACCENT[rarity];
              return (
                <div key={rarity} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-ui)", fontSize: "0.75rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)", minWidth: "70px" }}>{RARITY_LABEL[rarity]}</span>
                  <span style={{ color, fontWeight: 700 }}>{earnedInTier}/{tier.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recently unlocked */}
      {recentlyEarned.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
            {t("recently_unlocked")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
            {recentlyEarned.map((a) => <AchievementCard key={a.key} achievement={a} highlighted />)}
          </div>
        </div>
      )}

      {/* Rarity sections */}
      {RARITY_ORDER.map((rarity) => {
        const tier = byRarity[rarity] ?? [];
        if (tier.length === 0) return null;
        const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
        const accentColor = RARITY_ACCENT[rarity];
        return (
          <section key={rarity} style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}`, flexShrink: 0 }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, color: accentColor, margin: 0 }}>
                {RARITY_LABEL[rarity]}
              </h3>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.72rem", fontWeight: 600, color: earnedInTier === tier.length ? accentColor : "var(--text-muted)", marginLeft: "auto", background: earnedInTier === tier.length ? `${accentColor}18` : "var(--bg-elevated)", border: `1px solid ${earnedInTier === tier.length ? accentColor : "var(--border)"}`, borderRadius: "20px", padding: "2px 8px" }}>
                {earnedInTier}/{tier.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
              {[
                ...tier.filter((a) => a.earnedAt != null),
                ...tier.filter((a) => a.earnedAt == null),
              ].map((achievement) => (
                <AchievementCard key={achievement.key} achievement={achievement} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Review tab ───────────────────────────────────────────────────────────────

async function ReviewTab({ userId }: { userId: string }) {
  const t = await getTranslations("review");

  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRows[0]?.timezone ?? null;

  const review = await getWeeklyReview(userId, timezone);

  const locale = await getLocale();

  const delta = review.completionsThisWeek - review.completionsLastWeek;
  let deltaText: string;
  let deltaColor: string;
  if (delta > 0) {
    deltaText = t("vs_last_week_up", { delta: String(delta) });
    deltaColor = "var(--accent-green)";
  } else if (delta < 0) {
    deltaText = t("vs_last_week_down", { delta: String(delta) });
    deltaColor = "var(--accent-red)";
  } else {
    deltaText = t("vs_last_week_same");
    deltaColor = "var(--text-muted)";
  }

  const motivationKey = (
    review.completionsThisWeek >= 10 ? "motivation_great" :
    review.completionsThisWeek >= 5  ? "motivation_good" :
    review.completionsThisWeek >= 1  ? "motivation_ok" :
    "motivation_zero"
  ) as "motivation_great" | "motivation_good" | "motivation_ok" | "motivation_zero";

  const weekSubtitle = t("page_subtitle", {
    start: formatShortDate(review.weekStart, locale),
    end: formatShortDate(review.weekEnd, locale),
  });

  return (
    <div className="max-w-4xl flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FontAwesomeIcon icon={faCalendarWeek} className="w-5 h-5" style={{ color: "var(--accent-amber)" }} aria-hidden="true" />
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>
            {t("page_title")}
          </h2>
        </div>
        <p className="text-sm" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>
          {weekSubtitle}
        </p>
      </div>

      {/* Summary Cards */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>
          {t("section_summary")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Completed */}
          <div className="card-hover rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("completed")}</span>
              <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" style={{ color: "var(--accent-green)" }} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>{review.completionsThisWeek}</span>
            <span className="text-xs font-medium" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: deltaColor }}>{deltaText}</span>
          </div>
          {/* Postponed */}
          <div className="card-hover rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("postponed")}</span>
              <FontAwesomeIcon icon={faForward} className="w-4 h-4" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>{review.postponementsThisWeek}</span>
          </div>
          {/* Coins */}
          <div className="card-hover rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("coins_earned")}</span>
              <FontAwesomeIcon icon={faCoins} className="w-4 h-4" style={{ color: "var(--coin-gold)" }} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--coin-gold)" }}>{review.coinsEarnedThisWeek}</span>
          </div>
          {/* Streak */}
          <div className="card-hover rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("streak")}</span>
              <FontAwesomeIcon icon={faFire} className="w-4 h-4" style={{ color: "var(--accent-red)" }} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>{review.streakCurrent}d</span>
            <span className="text-xs" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("streak_max")}: {review.streakMax}d</span>
          </div>
          {/* Tasks created */}
          <div className="card-hover rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("tasks_created")}</span>
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>{review.tasksCreatedThisWeek}</span>
          </div>
        </div>
      </section>

      {/* Top Topics */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>
          {t("section_topics")}
        </h3>
        {review.topTopics.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <FontAwesomeIcon icon={faFolderOpen} className="w-8 h-8 mb-2" style={{ color: "var(--text-muted)", opacity: 0.5 }} aria-hidden="true" />
            <p className="text-sm" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("no_topics")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {review.topTopics.map((topic) => (
              <div key={topic.title} className="card-hover rounded-2xl p-5 flex items-center gap-3" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <FontAwesomeIcon icon={resolveTopicIcon(topic.icon)} className="w-5 h-5 flex-shrink-0" style={{ color: "var(--accent-amber)" }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-primary)" }}>{topic.title}</p>
                  <p className="text-xs" style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}>{t("completions", { count: topic.completions })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Motivational message */}
      <section>
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderLeft: "4px solid var(--accent-amber)" }}>
          <p className="text-lg italic" style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}>
            {t(motivationKey)}
          </p>
        </div>
      </section>
    </div>
  );
}
