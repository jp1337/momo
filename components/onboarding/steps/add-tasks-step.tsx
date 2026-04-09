"use client";

/**
 * AddTasksStep — third step of the onboarding wizard.
 * Quick-add tasks to the topic created in step 2.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface AddedTask {
  id: string;
  title: string;
}

interface AddTasksStepProps {
  topicId: string | null;
  topicName: string | null;
}

/**
 * Inline quick-add form for tasks during onboarding.
 *
 * @param topicId - The topic to add tasks to (null if topic was skipped)
 * @param topicName - Display name of the topic
 */
export function AddTasksStep({ topicId, topicName }: AddTasksStepProps) {
  const t = useTranslations("onboarding");

  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<AddedTask[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If topic was skipped, show a message instead
  if (!topicId) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {t("tasks_skipped_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("tasks_skipped_subtitle")}
        </p>
      </div>
    );
  }

  async function handleAdd() {
    if (!input.trim() || !topicId) return;
    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.trim(),
          topicId,
          type: "ONE_TIME",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create task");
      }

      const { task } = await res.json();
      setTasks((prev) => [...prev, { id: task.id, title: task.title }]);
      setInput("");
    } catch {
      setError(t("tasks_error"));
    } finally {
      setIsAdding(false);
    }
  }

  function handleRemove(taskId: string) {
    // Optimistic remove from list (no API call to keep it simple — task stays in DB)
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center flex flex-col gap-2">
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {t("tasks_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("tasks_subtitle", { topicName: topicName ?? "" })}
        </p>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={t("tasks_placeholder")}
            maxLength={200}
            autoFocus
            disabled={isAdding}
            className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!input.trim() || isAdding}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: "var(--accent-amber)",
              color: "#1a1f1b",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("tasks_add")}
          </button>
        </div>

        <p
          className="text-xs"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("tasks_hint")}
        </p>

        {/* Task list */}
        <div className="flex flex-col gap-1.5 min-h-[60px]">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="text-sm truncate"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-primary)",
                  }}
                >
                  {task.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(task.id)}
                  className="shrink-0 ml-2 p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  <FontAwesomeIcon icon={faXmark} size="sm" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <p
              className="text-xs text-center py-4"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              {t("tasks_added_count", { count: 0 })}
            </p>
          )}
        </div>

        {tasks.length > 0 && (
          <p
            className="text-xs text-center"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--accent-green)",
            }}
          >
            {t("tasks_added_count", { count: tasks.length })}
          </p>
        )}

        {error && (
          <p
            className="text-xs text-center"
            style={{ color: "var(--accent-red)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
