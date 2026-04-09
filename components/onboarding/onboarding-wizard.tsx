"use client";

/**
 * OnboardingWizard — main shell for the 4-step onboarding flow.
 *
 * Step state machine: welcome → topic → tasks → notifications.
 * Each step is skippable. On finish, marks onboarding as completed
 * and redirects to the dashboard.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { OnboardingProgress } from "./onboarding-progress";
import { WelcomeStep } from "./steps/welcome-step";
import { CreateTopicStep } from "./steps/create-topic-step";
import { AddTasksStep } from "./steps/add-tasks-step";
import { NotificationStep } from "./steps/notification-step";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFeather } from "@fortawesome/free-solid-svg-icons";

const STEPS = ["welcome", "topic", "tasks", "notifications"] as const;
type Step = (typeof STEPS)[number];

interface OnboardingWizardProps {
  userName: string | null;
}

/**
 * Orchestrates the 4-step onboarding wizard.
 *
 * @param userName - The user's display name for the welcome greeting
 */
export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const currentIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === STEPS.length - 1;

  const goForward = useCallback(() => {
    if (isLastStep) return;
    setDirection(1);
    setCurrentStep(STEPS[currentIndex + 1]);
  }, [currentIndex, isLastStep]);

  const goBack = useCallback(() => {
    if (isFirstStep) return;
    setDirection(-1);
    setCurrentStep(STEPS[currentIndex - 1]);
  }, [currentIndex, isFirstStep]);

  const handleTopicCreated = useCallback(
    (id: string, name: string) => {
      setTopicId(id);
      setTopicName(name);
      // Auto-advance to tasks step
      setDirection(1);
      setCurrentStep("tasks");
    },
    [],
  );

  async function handleFinish() {
    setIsCompleting(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/dashboard");
    } catch {
      // If it fails, still try to redirect — the layout gate will handle it
      router.push("/dashboard");
    }
  }

  function handleSkipOrNext() {
    if (isLastStep) {
      handleFinish();
    } else {
      goForward();
    }
  }

  // Step transition animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header with logo + progress */}
      <div
        className="px-6 pt-6 pb-2 flex flex-col items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faFeather}
            style={{ color: "var(--accent-amber)", fontSize: 20 }}
          />
          <span
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Momo
          </span>
        </div>
        <OnboardingProgress currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="px-6 py-6 min-h-[360px] flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {currentStep === "welcome" && (
              <WelcomeStep userName={userName} />
            )}
            {currentStep === "topic" && (
              <CreateTopicStep onTopicCreated={handleTopicCreated} />
            )}
            {currentStep === "tasks" && (
              <AddTasksStep topicId={topicId} topicName={topicName} />
            )}
            {currentStep === "notifications" && <NotificationStep />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with navigation buttons */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* Left: Back button */}
        <div>
          {!isFirstStep && (
            <button
              type="button"
              onClick={goBack}
              className="text-sm transition-opacity hover:opacity-80"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              {t("back")}
            </button>
          )}
        </div>

        {/* Right: Skip + Next/Finish */}
        <div className="flex items-center gap-3">
          {/* Skip (shown on topic and tasks steps, not on welcome or notifications) */}
          {(currentStep === "topic" || currentStep === "tasks") && (
            <button
              type="button"
              onClick={goForward}
              className="text-sm transition-opacity hover:opacity-80"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              {t("skip")}
            </button>
          )}

          <button
            type="button"
            onClick={handleSkipOrNext}
            disabled={isCompleting}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-opacity disabled:opacity-40 flex items-center gap-2"
            style={{
              backgroundColor: isLastStep
                ? "var(--accent-green)"
                : "var(--accent-amber)",
              color: "#1a1f1b",
              fontFamily: "var(--font-ui)",
            }}
          >
            {isLastStep ? (
              <>
                <FontAwesomeIcon icon={faCheck} size="sm" />
                {isCompleting ? "..." : t("finish")}
              </>
            ) : (
              t("next")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
