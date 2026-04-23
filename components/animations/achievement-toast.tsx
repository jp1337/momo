"use client";

/**
 * AchievementToast — spectacular unlock notification for earned achievements.
 *
 * Features:
 * - Rarity-aware: legendary/epic/rare/common each get distinct colors + glow
 * - Entrance: scale-bounce up from bottom-right (feels like a reward pop)
 * - Icon pops in with overshoot spring after the card appears
 * - Coin reward badge shown prominently
 * - Shimmer sweep animation on legendary tier
 * - Auto-dismisses after 5s; click to dismiss early
 * - Multiple achievements queue sequentially (one at a time)
 *
 * @module components/animations/achievement-toast
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AchievementItem {
  key: string;
  icon: string;
  title: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  coinReward?: number;
}

interface AchievementToastProps {
  achievements: AchievementItem[];
  onAllDone?: () => void;
}

const RARITY_CONFIG = {
  legendary: {
    color: "var(--rarity-legendary)",
    label: "Legendär",
    glow: "0 0 32px color-mix(in srgb, var(--rarity-legendary) 50%, transparent), 0 0 8px color-mix(in srgb, var(--rarity-legendary) 30%, transparent)",
    shimmer: true,
  },
  epic: {
    color: "var(--accent-amber)",
    label: "Episch",
    glow: "0 0 24px color-mix(in srgb, var(--accent-amber) 40%, transparent), 0 0 6px color-mix(in srgb, var(--accent-amber) 25%, transparent)",
    shimmer: false,
  },
  rare: {
    color: "var(--accent-green)",
    label: "Selten",
    glow: "0 0 20px color-mix(in srgb, var(--accent-green) 35%, transparent)",
    shimmer: false,
  },
  common: {
    color: "var(--text-muted)",
    label: "Gewöhnlich",
    glow: "0 2px 12px rgba(0,0,0,0.15)",
    shimmer: false,
  },
};

function SingleToast({
  achievement,
  onDone,
}: {
  achievement: AchievementItem;
  onDone: () => void;
}) {
  const rarity = achievement.rarity ?? "common";
  const cfg = RARITY_CONFIG[rarity];
  const [iconVisible, setIconVisible] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setIconVisible(true), 120);
    const t2 = setTimeout(onDone, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <motion.div
      key={achievement.key}
      initial={{ scale: 0.6, y: 40, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={onDone}
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: `1.5px solid ${cfg.color}`,
        borderRadius: "16px",
        padding: "0",
        minWidth: "260px",
        maxWidth: "320px",
        overflow: "hidden",
        boxShadow: cfg.glow,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Shimmer sweep (legendary only) */}
      {cfg.shimmer && (
        <motion.div
          aria-hidden="true"
          animate={{ x: [`-100%`, `200%`] }}
          transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Top accent bar */}
      <div
        style={{
          height: "3px",
          background: rarity === "legendary"
            ? `linear-gradient(90deg, ${cfg.color}, var(--accent-amber), ${cfg.color})`
            : cfg.color,
          backgroundSize: "200% 100%",
        }}
      />

      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: "10px", position: "relative", zIndex: 2 }}>
        {/* Header: "Achievement unlocked" label + rarity badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: cfg.color,
            }}
          >
            Errungenschaft freigeschaltet
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: cfg.color,
              border: `1px solid ${cfg.color}`,
              borderRadius: "4px",
              padding: "1px 5px",
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Icon + title + coin reward */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={iconVisible ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -20 }}
            transition={{ type: "spring", stiffness: 600, damping: 15 }}
            style={{
              fontSize: "2.4rem",
              lineHeight: 1,
              flexShrink: 0,
              filter: rarity === "legendary"
                ? `drop-shadow(0 0 8px ${cfg.color})`
                : "none",
            }}
            aria-hidden="true"
          >
            {achievement.icon}
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {achievement.title}
            </span>
            {achievement.coinReward != null && (
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--coin-gold)",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                🪙 +{achievement.coinReward} Coins
              </span>
            )}
          </div>
        </div>

        {/* Progress strip (auto-dismiss timer) */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 5, ease: "linear" }}
          style={{
            height: "2px",
            borderRadius: "1px",
            backgroundColor: cfg.color,
            transformOrigin: "left center",
            opacity: 0.5,
          }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Queued achievement toast manager.
 * Displays achievements one at a time from the provided list.
 */
export function AchievementToast({ achievements, onAllDone }: AchievementToastProps) {
  const [queue, setQueue] = useState<AchievementItem[]>(achievements);
  const [current, setCurrent] = useState<AchievementItem | null>(achievements[0] ?? null);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Direct setState in effect is intentional: reset display state on new achievement batch.
  useEffect(() => {
    setQueue(achievements);
    setCurrent(achievements[0] ?? null);
  }, [achievements]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDone = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      setCurrent(next[0] ?? null);
      if (next.length === 0) onAllDone?.();
      return next;
    });
  }, [onAllDone]);

  if (!current || queue.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "88px", // above mobile nav bar
        right: "16px",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="wait">
        {current && (
          <div style={{ pointerEvents: "auto" }}>
            <SingleToast key={current.key} achievement={current} onDone={handleDone} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
