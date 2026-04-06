"use client";

/**
 * EmotionalClosure — displays an affirmation or Michael Ende quote
 * after the user completes their daily quest.
 *
 * The quote is deterministic per day (same quote on refresh, new one tomorrow).
 * Uses Framer Motion for a gentle fade-in with delay so it appears
 * after the main celebration text.
 */

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface EmotionalClosureProps {
  /** Whether the feature is enabled by the user */
  enabled: boolean;
}

/**
 * Returns the day-of-year (1–366) for a given date.
 * Used to deterministically pick a quote that stays consistent all day.
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Displays a daily quote or affirmation after quest completion.
 * Returns null if the feature is disabled.
 */
export function EmotionalClosure({ enabled }: EmotionalClosureProps) {
  const t = useTranslations("closure");

  if (!enabled) return null;

  const quoteCount = parseInt(t("quote_count"), 10);
  const index = getDayOfYear(new Date()) % quoteCount;
  const quote = t(`quote_${index}` as Parameters<typeof t>[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-2 pt-3"
    >
      {/* Thin centered divider */}
      <div
        className="w-3/5 h-px"
        style={{ backgroundColor: "var(--border)", opacity: 0.6 }}
      />

      {/* Quote text */}
      <p
        className="text-sm text-center leading-relaxed px-2"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          fontStyle: "italic",
          color: "var(--text-muted)",
          maxWidth: "28rem",
        }}
      >
        {quote}
      </p>
    </motion.div>
  );
}
