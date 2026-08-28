/**
 * ProgressTabs — der Dispatcher der vier Tabs von /progress.
 *
 * Jeder Tab besitzt seinen eigenen `PageFrame` samt Rand und bekommt die
 * gemeinsame Kopfzeile als `header` gereicht. Das ist der Grund, warum die
 * Seite selbst nur noch auth, Tab-Wahl und Kopfzeile kennt: ein Rand gehört
 * zu einem Tab, nicht zu einer Route (Spec §3).
 */

import type { ReactNode } from "react";
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
import { AchievementCard } from "@/components/achievements/achievement-card";
import { HabitsTab } from "./tabs/habits-tab";
import { ReviewTab } from "./tabs/review-tab";

export type Tab = "habits" | "achievements" | "review";
export const VALID_TABS: Tab[] = ["habits", "achievements", "review"];

export interface ProgressTabsProps {
  tab: Tab;
  userId: string;
  /** Die eine Fraunces-Überschrift plus die Tab-Leiste. Jeder Tab rendert sie als erstes Kind seiner Lesespalte. */
  header: ReactNode;
  /** Roher `?year=`-Wert; nur der Habits-Tab wertet ihn aus. */
  yearParam?: string;
}

// ── Achievements constants ──────────────────────────────────────────────────

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;
const RARITY_ACCENT: Record<string, string> = {
  legendary: "var(--rarity-legendary)",
  epic: "var(--accent-amber)",
  rare: "var(--accent-green)",
  common: "var(--text-muted)",
};

// ── Main component ───────────────────────────────────────────────────────────

/**
 * Wählt den Tab. Jeder Zweig holt seine eigenen Daten; nur der aktive läuft.
 *
 * @param props.tab - der gewählte Tab
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile, die jeder Tab als erstes rendert
 * @param props.yearParam - roher `?year=`-Wert, nur für den Habits-Tab
 * @returns Den Inhalt des gewählten Tabs
 */
export async function ProgressTabs({ tab, userId, header, yearParam }: ProgressTabsProps) {
  if (tab === "achievements") return <AchievementsTab userId={userId} header={header} />;
  if (tab === "review") return <ReviewTab userId={userId} header={header} />;
  return <HabitsTab userId={userId} header={header} yearParam={yearParam} />;
}

// ── Achievements tab ─────────────────────────────────────────────────────────

/**
 * Der Errungenschaften-Tab. Noch unmigriert — Task 2 der Phase 2 holt ihn
 * aus dieser Datei heraus und in `tabs/achievements-tab.tsx`; hier bekommt
 * er vorerst nur die `header`-Prop und seinen bisherigen Wrapper, damit sich
 * optisch nichts ändert.
 *
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile der Seite
 * @returns Der Errungenschaften-Tab
 */
async function AchievementsTab({ userId, header }: { userId: string; header: ReactNode }) {
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {header}
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
    </div>
  );
}
