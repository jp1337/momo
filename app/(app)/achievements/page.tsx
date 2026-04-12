/**
 * Achievements Gallery — /achievements
 *
 * Displays all 31 achievements organised by rarity tier (Legendary → Common).
 * Each tier is collapsible-free but visually separated.
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
import { AchievementCard } from "@/components/achievements/achievement-card";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Errungenschaften — Momo",
};

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

const RARITY_ACCENT: Record<string, string> = {
  legendary: "var(--rarity-legendary)",
  epic: "var(--accent-amber)",
  rare: "var(--accent-green)",
  common: "var(--text-muted)",
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

  // Fetch user's timezone for energy streak computation
  const userRow = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const timezone = userRow[0]?.timezone ?? null;

  const allAchievements = await getAchievementsWithProgress(session.user.id, timezone);

  const earned = allAchievements.filter((a) => a.earnedAt != null);
  const total = allAchievements.length;

  // Group by rarity
  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((r) => [r, allAchievements.filter((a) => a.rarity === r)])
  );

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 20px 64px",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <FontAwesomeIcon
            icon={faTrophy}
            style={{ color: "var(--accent-amber)", fontSize: "1.5rem" }}
          />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
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
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          {t("page_subtitle", { earned: earned.length, total })}
        </p>
      </div>

      {/* Progress overview bar */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "36px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            fontFamily: "var(--font-ui)",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
            {earned.length} / {total}
          </span>
          <span style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.9rem" }}>
            {Math.round((earned.length / Math.max(total, 1)) * 100)}%
          </span>
        </div>
        <div
          style={{
            height: "8px",
            borderRadius: "4px",
            backgroundColor: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "4px",
              background: "linear-gradient(90deg, var(--accent-amber), var(--rarity-legendary))",
              width: `${Math.round((earned.length / Math.max(total, 1)) * 100)}%`,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        {/* Per-rarity earned counts */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "14px",
            flexWrap: "wrap",
          }}
        >
          {RARITY_ORDER.map((rarity) => {
            const tier = byRarity[rarity] ?? [];
            const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
            return (
              <span
                key={rarity}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.72rem",
                  color: RARITY_ACCENT[rarity],
                  fontWeight: 600,
                }}
              >
                {earnedInTier}/{tier.length} {t(`rarity_${rarity}`)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Rarity sections */}
      {RARITY_ORDER.map((rarity) => {
        const tier = byRarity[rarity] ?? [];
        if (tier.length === 0) return null;
        const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
        const accentColor = RARITY_ACCENT[rarity];

        return (
          <section key={rarity} style={{ marginBottom: "40px" }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: `1px solid var(--border)`,
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: accentColor,
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: accentColor,
                  margin: 0,
                }}
              >
                {t(`section_${rarity}`)}
              </h2>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginLeft: "auto",
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
                gap: "12px",
              }}
            >
              {/* Earned achievements first, then locked */}
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
