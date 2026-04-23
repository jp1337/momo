"use client";

/**
 * FocusModeView — two-phase focus session.
 *
 * Phase 1 (select): Pick 1–3 tasks to work on.
 * Phase 2 (work): One task at a time, full-screen, distraction-free.
 * Phase 3 (done): Celebration with summary.
 *
 * Runs outside the app shell — no Navbar or Sidebar present.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faCheck, faForward, faFire } from "@fortawesome/free-solid-svg-icons";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "select" | "work" | "done";

interface FocusTask {
  id: string;
  title: string;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  coinValue: number;
  topicId: string | null;
  estimatedMinutes: number | null;
  energyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
}

interface TopicOption {
  id: string;
  title: string;
  color: string | null;
}

interface FocusModeViewProps {
  initialTasks: FocusTask[];
  topics: TopicOption[];
}

const MAX_SELECTION = 3;

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "var(--priority-high, #ef4444)",
  NORMAL: "var(--accent-amber)",
  SOMEDAY: "var(--text-muted)",
};

// ─── Selection Phase ─────────────────────────────────────────────────────────

function SelectionPhase({
  tasks,
  topics,
  onStart,
  onExit,
}: {
  tasks: FocusTask[];
  topics: TopicOption[];
  onStart: (selected: FocusTask[]) => void;
  onExit: () => void;
}) {
  const t = useTranslations("focus");
  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));
  const [selected, setSelected] = useState<FocusTask[]>([]);

  const toggle = useCallback((task: FocusTask) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === task.id)) {
        return prev.filter((s) => s.id !== task.id);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, task];
    });
  }, []);

  if (tasks.length === 0) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          textAlign: "center",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "3rem" }}>☀️</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            fontWeight: 700,
            fontStyle: "italic",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {t("empty_title")}
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)", margin: 0 }}>
          {t("empty_subtitle")}
        </p>
        <button
          onClick={onExit}
          style={{
            marginTop: "8px",
            fontFamily: "var(--font-ui)",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--accent-amber)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {t("empty_back")}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              fontWeight: 700,
              fontStyle: "italic",
              color: "var(--text-primary)",
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}
          >
            {t("select_title")}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            {t("select_subtitle")}
          </p>
        </div>
        <button
          onClick={onExit}
          aria-label={t("work_exit")}
          style={{
            flexShrink: 0,
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
            marginTop: "4px",
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {/* Task list — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 120px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {tasks.map((task) => {
          const isSelected = selected.some((s) => s.id === task.id);
          const isDisabled = !isSelected && selected.length >= MAX_SELECTION;
          const topic = task.topicId ? topicMap.get(task.topicId) : null;

          return (
            <motion.button
              key={task.id}
              onClick={() => !isDisabled && toggle(task)}
              whileTap={isDisabled ? undefined : { scale: 0.98 }}
              style={{
                textAlign: "left",
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                border: isSelected
                  ? "1.5px solid var(--accent-amber)"
                  : "1px solid var(--border)",
                backgroundColor: isSelected ? "color-mix(in srgb, var(--accent-amber) 6%, var(--bg-elevated))" : "var(--bg-surface)",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                transition: "border-color 0.15s, background-color 0.15s, opacity 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: isSelected
                  ? "0 0 0 1px color-mix(in srgb, var(--accent-amber) 20%, transparent)"
                  : "none",
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  border: isSelected ? "none" : "1.5px solid var(--border)",
                  backgroundColor: isSelected ? "var(--accent-amber)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background-color 0.15s",
                }}
              >
                {isSelected && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    style={{ fontSize: "0.7rem", color: "#000" }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    lineHeight: 1.35,
                    marginBottom: "4px",
                  }}
                >
                  {task.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {topic && (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.68rem",
                        color: topic.color ?? "var(--text-muted)",
                        border: `1px solid ${topic.color ?? "var(--border)"}`,
                        borderRadius: "4px",
                        padding: "1px 5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {topic.title}
                    </span>
                  )}
                  {task.estimatedMinutes && (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ⏱ {task.estimatedMinutes} Min
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.68rem",
                      color: "var(--coin-gold, #f59e0b)",
                    }}
                  >
                    🪙 {task.coinValue}
                  </span>
                </div>
              </div>

              {/* Priority dot */}
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: PRIORITY_COLOR[task.priority] ?? "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Sticky bottom CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 24px",
          backgroundColor: "var(--bg-primary)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            color: selected.length > 0 ? "var(--accent-amber)" : "var(--text-muted)",
            fontWeight: selected.length > 0 ? 600 : 400,
            transition: "color 0.2s",
          }}
        >
          {t("select_selected", { selected: selected.length, max: MAX_SELECTION })}
        </span>
        <motion.button
          onClick={() => selected.length > 0 && onStart(selected)}
          whileTap={selected.length > 0 ? { scale: 0.97 } : undefined}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: selected.length > 0 ? "#000" : "var(--text-muted)",
            backgroundColor: selected.length > 0 ? "var(--accent-amber)" : "var(--bg-elevated)",
            border: "none",
            borderRadius: "10px",
            padding: "12px 24px",
            cursor: selected.length > 0 ? "pointer" : "not-allowed",
            transition: "background-color 0.2s, color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {t("select_start")}
          <FontAwesomeIcon icon={faFire} style={{ fontSize: "0.85rem" }} />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Work Phase ──────────────────────────────────────────────────────────────

function WorkPhase({
  tasks,
  topics,
  currentIndex,
  onComplete,
  onSkip,
  onExit,
  isCompleting,
}: {
  tasks: FocusTask[];
  topics: TopicOption[];
  currentIndex: number;
  onComplete: () => void;
  onSkip: () => void;
  onExit: () => void;
  isCompleting: boolean;
}) {
  const t = useTranslations("focus");
  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));
  const task = tasks[currentIndex];
  const topic = task.topicId ? topicMap.get(task.topicId) : null;
  const total = tasks.length;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow behind the card */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-amber) 8%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Top bar: progress dots + exit */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {tasks.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentIndex ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                backgroundColor:
                  i < currentIndex
                    ? "var(--accent-amber)"
                    : i === currentIndex
                    ? "var(--accent-amber)"
                    : "var(--border)",
                opacity: i < currentIndex ? 0.4 : 1,
                transition: "width 0.3s ease, background-color 0.3s",
              }}
            />
          ))}
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginLeft: "4px",
            }}
          >
            {currentIndex + 1} / {total}
          </span>
        </div>

        <button
          onClick={onExit}
          aria-label={t("work_exit")}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
          {t("work_exit")}
        </button>
      </div>

      {/* Main content — centered task card */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              width: "100%",
              maxWidth: "560px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "36px 32px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Topic + meta row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >
              {topic && (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: topic.color ?? "var(--text-muted)",
                    border: `1px solid ${topic.color ?? "var(--border)"}`,
                    borderRadius: "5px",
                    padding: "2px 7px",
                  }}
                >
                  {topic.title}
                </span>
              )}
              {task.estimatedMinutes && (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "5px",
                    padding: "2px 7px",
                    border: "1px solid var(--border)",
                  }}
                >
                  ⏱ {task.estimatedMinutes} Min
                </span>
              )}
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.72rem",
                  color: "var(--coin-gold, #f59e0b)",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                  border: "1px solid var(--border)",
                  marginLeft: "auto",
                }}
              >
                🪙 +{task.coinValue}
              </span>
            </div>

            {/* Task title */}
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
                fontWeight: 700,
                fontStyle: "italic",
                color: "var(--text-primary)",
                lineHeight: 1.25,
                margin: "0 0 32px",
              }}
            >
              {task.title}
            </h2>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <motion.button
                onClick={onComplete}
                disabled={isCompleting}
                whileTap={{ scale: 0.97 }}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#000",
                  backgroundColor: isCompleting ? "var(--bg-surface)" : "var(--accent-amber)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "16px",
                  cursor: isCompleting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "background-color 0.15s",
                }}
              >
                <FontAwesomeIcon icon={faCheck} />
                {t("work_done_btn")}
              </motion.button>

              <button
                onClick={onSkip}
                disabled={isCompleting}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  opacity: 0.7,
                }}
              >
                <FontAwesomeIcon icon={faForward} style={{ fontSize: "0.75rem" }} />
                {t("work_skip")}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Done Phase ───────────────────────────────────────────────────────────────

function DonePhase({
  completedCount,
  totalCoins,
  onExit,
}: {
  completedCount: number;
  totalCoins: number;
  onExit: () => void;
}) {
  const t = useTranslations("focus");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-amber) 12%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
        style={{ fontSize: "4rem", marginBottom: "24px", lineHeight: 1 }}
      >
        🎯
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
          fontWeight: 700,
          fontStyle: "italic",
          color: "var(--text-primary)",
          margin: "0 0 12px",
        }}
      >
        {t("done_title")}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "40px",
        }}
      >
        {completedCount > 0 && (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--accent-amber)",
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 12%, var(--bg-elevated))",
              border: "1px solid color-mix(in srgb, var(--accent-amber) 30%, var(--border))",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            ✓ {t("done_tasks", { count: completedCount })}
          </span>
        )}
        {totalCoins > 0 && (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--coin-gold, #f59e0b)",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            🪙 {t("done_coins", { coins: totalCoins })}
          </span>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        onClick={onExit}
        whileTap={{ scale: 0.97 }}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#000",
          backgroundColor: "var(--accent-amber)",
          border: "none",
          borderRadius: "12px",
          padding: "14px 32px",
          cursor: "pointer",
        }}
      >
        {t("done_back")}
      </motion.button>
    </motion.div>
  );
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrates the three focus phases.
 */
export function FocusModeView({ initialTasks, topics }: FocusModeViewProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<FocusTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleStart = useCallback((tasks: FocusTask[]) => {
    setSelected(tasks);
    setCurrentIndex(0);
    setPhase("work");
  }, []);

  const handleExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const advance = useCallback(
    (tasks: FocusTask[], idx: number) => {
      if (idx + 1 >= tasks.length) {
        setPhase("done");
      } else {
        setCurrentIndex(idx + 1);
      }
    },
    []
  );

  const handleComplete = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    const task = selected[currentIndex];
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          coinsEarned?: number;
          newLevel?: { level: number; title: string } | null;
          unlockedAchievements?: AchievementItem[];
        };
        triggerSmallConfetti();
        dispatchCoinsEarned(data.coinsEarned ?? 0);
        setCompletedCount((c) => c + 1);
        setTotalCoins((c) => c + (data.coinsEarned ?? 0));
        if (data.newLevel) setLevelUp(data.newLevel);
        if (data.unlockedAchievements?.length) {
          setAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
        }
      }
    } catch {
      // silent fail — still advance
    }
    setIsCompleting(false);
    advance(selected, currentIndex);
  }, [isCompleting, selected, currentIndex, advance]);

  const handleSkip = useCallback(() => {
    advance(selected, currentIndex);
  }, [selected, currentIndex, advance]);

  return (
    <>
      {/* Overlays — always mounted regardless of phase */}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onDone={() => setLevelUp(null)}
        />
      )}
      {achievements.length > 0 && (
        <AchievementToast
          achievements={achievements}
          onAllDone={() => setAchievements([])}
        />
      )}

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div key="select" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <SelectionPhase
              tasks={initialTasks}
              topics={topics}
              onStart={handleStart}
              onExit={handleExit}
            />
          </motion.div>
        )}
        {phase === "work" && (
          <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <WorkPhase
              tasks={selected}
              topics={topics}
              currentIndex={currentIndex}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onExit={handleExit}
              isCompleting={isCompleting}
            />
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DonePhase
              completedCount={completedCount}
              totalCoins={totalCoins}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
