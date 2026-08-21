"use client";

/**
 * OnboardingProgress — step indicator for the onboarding wizard.
 * Renders 4 dots connected by a line, highlighting the current step.
 */

import { motion } from "motion/react";

const PROGRESS_STEPS = ["welcome", "topic", "tasks", "notifications"] as const;
type AnyStep = (typeof PROGRESS_STEPS)[number] | "complete";

interface OnboardingProgressProps {
  currentStep: AnyStep;
}

/**
 * 4-dot progress indicator with animated active dot.
 * On the "complete" step, all dots render as completed (green).
 *
 * @param currentStep - The currently active step key
 */
export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const isComplete = currentStep === "complete";
  const currentIndex = isComplete
    ? PROGRESS_STEPS.length
    : PROGRESS_STEPS.indexOf(currentStep as (typeof PROGRESS_STEPS)[number]);

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {PROGRESS_STEPS.map((step, i) => {
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
            {i < PROGRESS_STEPS.length - 1 && (
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
