"use client";

/**
 * AchievementCard — single achievement tile for the /achievements gallery.
 *
 * Renders differently depending on earned/locked state:
 *  - Earned: full color, icon, title, description, earned date, coin badge
 *  - Locked + normal: dimmed, lock icon, title, description, optional progress bar
 *  - Locked + secret: dimmed, question mark, "???" title and "secret" hint text
 *  - highlighted: slightly elevated border-glow for "recently earned" showcase
 *
 * @module components/achievements/achievement-card
 */

import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import type { AchievementWithProgress } from "@/lib/statistics";

type Rarity = "common" | "rare" | "epic" | "legendary";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "var(--text-muted)",
  rare: "var(--accent-green)",
  epic: "var(--accent-amber)",
  legendary: "var(--rarity-legendary)",
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Gewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
};

function rarityColor(rarity: string): string {
  return RARITY_COLORS[rarity as Rarity] ?? RARITY_COLORS.common;
}

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  /** When true, renders with a glow border for the "recently earned" showcase. */
  highlighted?: boolean;
}

/**
 * Renders a single achievement card for the gallery page.
 */
export function AchievementCard({ achievement, highlighted = false }: AchievementCardProps) {
  const t = useTranslations("achievements");
  const earned = achievement.earnedAt != null;
  const isSecret = achievement.secret && !earned;
  const rarity = achievement.rarity as Rarity;
  const color = rarityColor(rarity);

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: earned
          ? `1.5px solid ${color}`
          : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        opacity: earned ? 1 : 0.5,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden",
        boxShadow: highlighted && earned
          ? `0 0 16px ${color}40, 0 2px 8px rgba(0,0,0,0.1)`
          : earned
          ? `0 1px 4px rgba(0,0,0,0.06)`
          : "none",
        transition: "box-shadow 0.2s, opacity 0.2s",
      }}
    >
      {/* Top accent strip for earned cards */}
      {earned && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: highlighted
              ? `linear-gradient(90deg, ${color}, var(--accent-amber))`
              : color,
            borderRadius: "12px 12px 0 0",
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Icon */}
          <span
            style={{
              fontSize: "1.8rem",
              lineHeight: 1,
              filter: earned ? "none" : "grayscale(1) opacity(0.6)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {isSecret ? (
              <FontAwesomeIcon icon={faLock} style={{ fontSize: "1.3rem", color: "var(--text-muted)" }} />
            ) : (
              achievement.icon
            )}
          </span>

          {/* Rarity badge */}
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color,
              border: `1px solid ${color}`,
              borderRadius: "4px",
              padding: "2px 5px",
              whiteSpace: "nowrap",
            }}
          >
            {RARITY_LABELS[rarity] ?? rarity}
          </span>
        </div>

        {/* Coin reward */}
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: earned ? "var(--coin-gold)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          🪙 +{achievement.coinReward}
        </span>
      </div>

      {/* Title + description */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.92rem",
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
            fontSize: "0.76rem",
            color: "var(--text-muted)",
            lineHeight: 1.45,
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
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>✓</span>
          <span>
            {new Date(achievement.earnedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Progress bar for locked, non-secret achievements */}
      {!earned && !isSecret && achievement.progress && (
        <div style={{ marginTop: "2px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-ui)",
              fontSize: "0.66rem",
              color: "var(--text-muted)",
              marginBottom: "4px",
            }}
          >
            <span>{achievement.progress.current} / {achievement.progress.total}</span>
            <span>{Math.round((achievement.progress.current / achievement.progress.total) * 100)}%</span>
          </div>
          <div
            style={{
              height: "3px",
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
                transition: "width 0.5s ease",
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
