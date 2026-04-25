/**
 * Achievements Gallery — /achievements
 *
 * Displays all achievements organised by rarity tier (Legendary → Common).
 * On every load: seeds achievement definitions and retroactively grants any
 * achievements the user has already earned (idempotent, no duplicate grants).
 *
 *  - Earned achievements: full colour, rarity border, coin badge, earned date
 *  - Locked normal: dimmed, progress bar for countable milestones
 *  - Locked secret: shows "???" until earned — no spoilers
 *
 * Server Component. Requires authentication.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAchievementsWithProgress } from "@/lib/statistics";
import { retroactivelyGrantAchievements, getLevelForCoins, getNextLevel, LEVELS } from "@/lib/gamification";
import { AchievementCard } from "@/components/achievements/achievement-card";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Errungenschaften",
};

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

const RARITY_ACCENT: Record<string, string> = {
  legendary: "var(--rarity-legendary)",
  epic: "var(--accent-amber)",
  rare: "var(--accent-green)",
  common: "var(--text-muted)",
};

const RARITY_LABEL_DE: Record<string, string> = {
  legendary: "Legendär",
  epic: "Episch",
  rare: "Selten",
  common: "Gewöhnlich",
};

/**
 * Achievement gallery page.
 * Groups achievements by rarity (Legendary first) and shows earned vs locked state.
 */
export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("achievements");

  const userRow = await db
    .select({ timezone: users.timezone, coins: users.coins })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const timezone = userRow[0]?.timezone ?? null;
  const coins = userRow[0]?.coins ?? 0;

  // Seed + retroactively grant achievements (idempotent — safe every page load)
  await retroactivelyGrantAchievements(session.user.id, timezone);

  const allAchievements = await getAchievementsWithProgress(session.user.id, timezone);

  // Level progression (computed from coins — always accurate, not from stale DB level)
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

  // Group by rarity
  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((r) => [r, allAchievements.filter((a) => a.rarity === r)])
  );

  // Latest 3 earned achievements for the "recently unlocked" showcase
  const recentlyEarned = [...earned]
    .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
    .slice(0, 3);

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "32px 20px 80px",
      }}
    >
      {/* ── Level progression card ───────────────────────────────────────────── */}
      {(() => {
        const tierColor =
          currentLevelDef.level >= 10 ? "var(--rarity-legendary)"
          : currentLevelDef.level >= 7 ? "var(--accent-amber)"
          : currentLevelDef.level >= 4 ? "var(--accent-green)"
          : "var(--text-muted)";
        const maxLevel = LEVELS[LEVELS.length - 1].level;
        return (
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
            {/* Top accent */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tierColor, borderRadius: "16px 16px 0 0" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Level number badge */}
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: `color-mix(in srgb, ${tierColor} 15%, var(--bg-surface))`,
                    border: `1.5px solid color-mix(in srgb, ${tierColor} 40%, transparent)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.55rem", fontWeight: 700, color: tierColor, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>Lv.</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: tierColor, lineHeight: 1 }}>{currentLevelDef.level}</span>
                </div>

                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, fontStyle: "italic", color: "var(--text-primary)", marginBottom: "3px" }}>
                    {currentLevelDef.title}
                  </div>
                  {nextLevelDef ? (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Noch <span style={{ color: tierColor, fontWeight: 600 }}>{coinsToNext} Coins</span> bis Level {nextLevelDef.level} · {nextLevelDef.title}
                    </div>
                  ) : (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.75rem", color: tierColor, fontWeight: 600 }}>
                      Maximales Level erreicht 🎉
                    </div>
                  )}
                </div>
              </div>

              {/* Level out of max */}
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                {currentLevelDef.level} / {maxLevel}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "var(--border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: "3px",
                  backgroundColor: tierColor,
                  width: `${levelProgress}%`,
                  transition: "width 0.6s ease",
                  opacity: 0.85,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "var(--font-ui)", fontSize: "0.68rem", color: "var(--text-muted)" }}>
                <span>{currentLevelDef.minCoins} Coins</span>
                {nextLevelDef && <span style={{ color: tierColor, fontWeight: 600 }}>{levelProgress}%</span>}
                {nextLevelDef && <span>{nextLevelDef.minCoins} Coins</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Hero header ───────────────────────────────────────────────────────── */}
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
        {/* Decorative background glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-amber) 0%, transparent 70%)",
            opacity: 0.07,
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>🏆</span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t("page_title")}
              </h1>
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                margin: "0 0 20px",
              }}
            >
              {t("page_subtitle", { earned: earned.length, total })}
            </p>

            {/* Progress bar */}
            <div style={{ width: "min(320px, 100%)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                <span>{earned.length} / {total} freigeschaltet</span>
                <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "3px",
                    background: "linear-gradient(90deg, var(--accent-amber), var(--rarity-legendary))",
                    width: `${pct}%`,
                    transition: "width 0.8s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Per-rarity breakdown pills */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              alignSelf: "center",
            }}
          >
            {RARITY_ORDER.map((rarity) => {
              const tier = byRarity[rarity] ?? [];
              const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
              const color = RARITY_ACCENT[rarity];
              return (
                <div
                  key={rarity}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "var(--text-muted)", minWidth: "70px" }}>{RARITY_LABEL_DE[rarity]}</span>
                  <span style={{ color, fontWeight: 700 }}>{earnedInTier}/{tier.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Recently unlocked showcase ─────────────────────────────────────────── */}
      {recentlyEarned.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 12px",
            }}
          >
            Zuletzt freigeschaltet
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "10px",
            }}
          >
            {recentlyEarned.map((a) => (
              <AchievementCard key={a.key} achievement={a} highlighted />
            ))}
          </div>
        </div>
      )}

      {/* ── Rarity sections ────────────────────────────────────────────────────── */}
      {RARITY_ORDER.map((rarity) => {
        const tier = byRarity[rarity] ?? [];
        if (tier.length === 0) return null;
        const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
        const accentColor = RARITY_ACCENT[rarity];

        return (
          <section key={rarity} style={{ marginBottom: "44px" }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "14px",
                paddingBottom: "12px",
                borderBottom: `1px solid var(--border)`,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: accentColor,
                  margin: 0,
                  letterSpacing: "0.01em",
                }}
              >
                {t(`section_${rarity}`)}
              </h2>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: earnedInTier === tier.length ? accentColor : "var(--text-muted)",
                  marginLeft: "auto",
                  background: earnedInTier === tier.length ? `${accentColor}18` : "var(--bg-elevated)",
                  border: `1px solid ${earnedInTier === tier.length ? accentColor : "var(--border)"}`,
                  borderRadius: "20px",
                  padding: "2px 8px",
                }}
              >
                {earnedInTier}/{tier.length}
              </span>
            </div>

            {/* Achievement grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "10px",
              }}
            >
              {/* Earned first, then locked */}
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
    </main>
  );
}
