"use client";

/**
 * AchievementToast component — sliding toast notifications for unlocked achievements.
 *
 * Features:
 * - Fixed position at bottom-right corner (z-50)
 * - Shows icon + "Achievement unlocked!" + achievement title
 * - Framer Motion: slides in from the right, auto-dismisses after 4 seconds per item
 * - Supports multiple achievements queued in sequence
 * - Uses --bg-surface background with --accent-amber border per design rules
 *
 * @module components/animations/achievement-toast
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AchievementItem {
  key: string;
  icon: string;
  title: string;
}

interface AchievementToastProps {
  /** Array of achievements to display (shown one at a time, queued) */
  achievements: AchievementItem[];
  /** Called when all achievements have been displayed */
  onAllDone?: () => void;
}

/**
 * Toast notification for a single achievement unlock.
 */
function SingleToast({
  achievement,
  onDone,
}: {
  achievement: AchievementItem;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      key={achievement.key}
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--accent-amber)",
        boxShadow:
          "0 0 16px color-mix(in srgb, var(--accent-amber) 20%, transparent), var(--shadow-md)",
        minWidth: "240px",
        maxWidth: "320px",
      }}
      onClick={onDone}
      role="status"
      aria-live="polite"
    >
      {/* Achievement icon */}
      <span className="text-2xl select-none flex-shrink-0" aria-hidden="true">
        {achievement.icon}
      </span>

      {/* Text */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--accent-amber)",
          }}
        >
          Achievement unlocked!
        </span>
        <span
          className="text-sm font-medium truncate"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-primary)",
          }}
        >
          {achievement.title}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Queued achievement toast manager.
 * Displays achievements one at a time from the provided list.
 */
export function AchievementToast({
  achievements,
  onAllDone,
}: AchievementToastProps) {
  const [queue, setQueue] = useState<AchievementItem[]>(achievements);
  const [current, setCurrent] = useState<AchievementItem | null>(
    achievements[0] ?? null
  );

  // Sync queue when new achievements are passed.
  // Direct setState calls here are intentional: we reset the display state whenever
  // a new batch of achievements arrives from the parent, which is the expected use case.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(achievements);
    setCurrent(achievements[0] ?? null);
  }, [achievements]);

  const handleDone = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      setCurrent(next[0] ?? null);
      if (next.length === 0) {
        onAllDone?.();
      }
      return next;
    });
  }, [onAllDone]);

  if (!current || queue.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end"
      aria-label="Achievement notifications"
    >
      <AnimatePresence mode="wait">
        {current && (
          <SingleToast
            key={current.key}
            achievement={current}
            onDone={handleDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
