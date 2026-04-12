"use client";

/**
 * AchievementCard — single achievement tile for the /achievements gallery.
 *
 * Renders differently depending on earned/locked state:
 *  - Earned: full color, icon, title, description, earned date, coin badge
 *  - Locked + normal: dimmed, lock icon, title, description, optional progress bar
 *  - Locked + secret: dimmed, question mark, "???" title and "secret" hint text
 *
 * @module components/achievements/achievement-card
 */

import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import type { AchievementWithProgress } from "@/lib/statistics";

type Rarity = "common" | "rare" | "epic" | "legendary";

/** CSS color for each rarity tier */
const RARITY_COLORS: Record<Rarity, string> = {
  common: "var(--text-muted)",
  rare: "var(--accent-green)",
  epic: "var(--accent-amber)",
  legendary: "var(--rarity-legendary)",
};

/** Border color for earned achievement cards */
function rarityBorder(rarity: string): string {
  return RARITY_COLORS[rarity as Rarity] ?? RARITY_COLORS.common;
}

interface AchievementCardProps {
  achievement: AchievementWithProgress;
}

/**
 * Renders a single achievement card for the gallery page.
 */
export function AchievementCard({ achievement }: AchievementCardProps) {
  const t = useTranslations("achievements");
  const earned = achievement.earnedAt != null;
  const isSecret = achievement.secret && !earned;
  const rarity = achievement.rarity as Rarity;
  const color = rarityBorder(rarity);

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: earned
          ? `1.5px solid ${color}`
          : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        opacity: earned ? 1 : 0.55,
        transition: "opacity 0.2s, transform 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Earned glow accent — subtle top strip */}
      {earned && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: color,
            borderRadius: "12px 12px 0 0",
          }}
        />
      )}

      {/* Header row: icon + rarity badge + coin reward */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Icon */}
          <span
            style={{
              fontSize: "2rem",
              lineHeight: 1,
              filter: earned ? "none" : "grayscale(1)",
            }}
            aria-hidden="true"
          >
            {isSecret ? (
              <FontAwesomeIcon icon={faLock} style={{ fontSize: "1.5rem", color: "var(--text-muted)" }} />
            ) : (
              achievement.icon
            )}
          </span>

          {/* Rarity badge */}
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color,
              border: `1px solid ${color}`,
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            {t(`rarity_${rarity}`)}
          </span>
        </div>

        {/* Coin reward */}
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: earned ? "var(--coin-gold)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          🪙 {t("coin_reward", { coins: achievement.coinReward })}
        </span>
      </div>

      {/* Title + description */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: earned ? "var(--text-primary)" : "var(--text-muted)",
            marginBottom: "3px",
          }}
        >
          {isSecret ? t("secret_title") : achievement.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            lineHeight: 1.4,
          }}
        >
          {isSecret ? t("secret_description") : achievement.description}
        </div>
      </div>

      {/* Earned date */}
      {earned && achievement.earnedAt && (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            marginTop: "auto",
          }}
        >
          {t("earned_at", {
            date: new Date(achievement.earnedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })}
        </div>
      )}

      {/* Progress bar for locked, non-secret achievements with countable progress */}
      {!earned && !isSecret && achievement.progress && (
        <div style={{ marginTop: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-ui)",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              marginBottom: "4px",
            }}
          >
            <span>{t("progress", achievement.progress)}</span>
            <span>{Math.round((achievement.progress.current / achievement.progress.total) * 100)}%</span>
          </div>
          <div
            style={{
              height: "4px",
              borderRadius: "2px",
              backgroundColor: "var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: "2px",
                backgroundColor: color,
                width: `${Math.round((achievement.progress.current / achievement.progress.total) * 100)}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
