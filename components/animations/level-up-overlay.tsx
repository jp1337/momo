"use client";

/**
 * LevelUpOverlay component — full-screen overlay shown when the user levels up.
 *
 * Features:
 * - Fixed full-screen overlay with dark semi-transparent background (z-50)
 * - Shows: large star icon, "Level Up!", new level number, new level title
 * - Framer Motion: fades in, stays for 3 seconds, then fades out
 * - Calls onDone() after animation completes so parent can clean up state
 *
 * @module components/animations/level-up-overlay
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LevelUpOverlayProps {
  /** The new level number (e.g. 3) */
  level: number;
  /** The new level title in German (e.g. "Alltagsmeister") */
  title: string;
  /** Called after the overlay has fully animated out */
  onDone: () => void;
}

/**
 * Full-screen level-up celebration overlay.
 * Auto-dismisses after 3 seconds.
 */
export function LevelUpOverlay({ level, title, onDone }: LevelUpOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <AnimatePresence>
      <motion.div
        key="level-up-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: "rgba(15, 20, 16, 0.88)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onDone}
        aria-modal="true"
        role="dialog"
        aria-label="Level up notification"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.05 }}
          className="flex flex-col items-center gap-5 px-10 py-10 rounded-3xl"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--accent-amber)",
            boxShadow:
              "0 0 40px color-mix(in srgb, var(--accent-amber) 30%, transparent), var(--shadow-lg)",
            maxWidth: "360px",
            width: "90%",
          }}
        >
          {/* Star icon */}
          <motion.span
            animate={{ rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-6xl select-none"
            aria-hidden="true"
          >
            ⭐
          </motion.span>

          {/* Level Up! heading */}
          <div className="text-center flex flex-col gap-2">
            <p
              className="text-sm font-semibold uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--accent-amber)",
              }}
            >
              Level Up!
            </p>
            <p
              className="text-5xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {level}
            </p>
            <p
              className="text-lg font-medium"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--coin-gold)",
              }}
            >
              {title}
            </p>
          </div>

          <p
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Tap anywhere to dismiss
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
