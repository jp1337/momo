"use client";

/**
 * OnboardingProgress — step indicator for the onboarding wizard.
 * Renders 4 dots connected by a line, highlighting the current step.
 */

import { motion } from "framer-motion";

const STEPS = ["welcome", "topic", "tasks", "notifications"] as const;

interface OnboardingProgressProps {
  currentStep: (typeof STEPS)[number];
}

/**
 * 4-dot progress indicator with animated active dot.
 *
 * @param currentStep - The currently active step key
 */
export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step} className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isCurrent ? 1.3 : 1,
                backgroundColor: isCompleted
                  ? "var(--accent-green)"
                  : isCurrent
                    ? "var(--accent-amber)"
                    : "var(--border)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
              }}
            />
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: isCompleted
                    ? "var(--accent-green)"
                    : "var(--border)",
                  transition: "background-color 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
