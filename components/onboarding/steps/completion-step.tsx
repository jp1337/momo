"use client";

/**
 * CompletionStep — final celebration step of the onboarding wizard.
 *
 * Fires a confetti burst on mount, displays an animated amber moment
 * with Lora italic "Deine erste Quest wartet.", then lets the user
 * navigate to the dashboard via button or auto-redirect after 3s.
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faFeather } from "@fortawesome/free-solid-svg-icons";
import { triggerConfetti } from "@/components/animations/confetti";

interface CompletionStepProps {
  onNavigate: () => void;
}

/**
 * Celebration screen shown after the last onboarding step.
 * Auto-redirects to dashboard after 3 seconds.
 *
 * @param onNavigate - Called when the user clicks "Let's go" or after auto-redirect
 */
export function CompletionStep({ onNavigate }: CompletionStepProps) {
  const t = useTranslations("onboarding");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Slight delay so the slide-in animation plays first
    const confettiTimer = setTimeout(() => {
      triggerConfetti();
      // Second burst for extra celebration
      setTimeout(triggerConfetti, 400);
    }, 300);

    timerRef.current = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        onNavigate();
      }
    }, 3200);

    return () => {
      clearTimeout(confettiTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onNavigate]);

  function handleClick() {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onNavigate();
  }

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Animated amber halo + icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
        className="relative flex items-center justify-center"
      >
        {/* Outer glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="absolute w-28 h-28 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 35%, transparent) 0%, transparent 70%)",
          }}
        />
        {/* Icon container */}
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-amber) 22%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--accent-amber) 40%, transparent)",
          }}
        >
          <FontAwesomeIcon
            icon={faFeather}
            style={{ color: "var(--accent-amber)", fontSize: 32 }}
          />
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        className="flex flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
      >
        <h1
          className="text-3xl sm:text-4xl font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {t("complete_title")}
        </h1>

        {/* Lora italic "Deine erste Quest wartet." */}
        <p
          className="text-base sm:text-lg italic leading-relaxed max-w-xs"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-secondary)",
            fontStyle: "italic",
          }}
        >
          {t("complete_subtitle")}
        </p>
      </motion.div>

      {/* CTA button + auto-redirect progress bar */}
      <motion.div
        className="flex flex-col items-center gap-3 w-full max-w-xs"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={handleClick}
          className="w-full rounded-xl px-6 py-3 text-base font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
          style={{
            backgroundColor: "var(--accent-amber)",
            color: "#1a1f1b",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("complete_cta")}
          <FontAwesomeIcon icon={faArrowRight} size="sm" />
        </button>

        {/* Auto-redirect progress bar */}
        <div
          className="w-full h-0.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: "var(--accent-amber)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear", delay: 0.2 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
