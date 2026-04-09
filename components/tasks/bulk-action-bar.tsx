"use client";

/**
 * BulkActionBar — sticky bottom bar shown when ≥1 task is selected in bulk mode.
 *
 * Renders action buttons for: complete all, delete, change topic, set priority.
 * Slides up from the bottom with Framer Motion animation.
 * Dumb component — all actions are callbacks from the parent.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faTrash,
  faFolderOpen,
  faFlag,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
}

interface BulkActionBarProps {
  selectedCount: number;
  topics: TopicOption[];
  hasNonCompleted: boolean;
  onDelete: () => void;
  onComplete: () => void;
  onChangeTopic: (topicId: string | null) => void;
  onSetPriority: (priority: "HIGH" | "NORMAL" | "SOMEDAY") => void;
  onClearSelection: () => void;
}

/**
 * Floating action bar for bulk task operations.
 * Appears at the bottom of the viewport when tasks are selected.
 */
export function BulkActionBar({
  selectedCount,
  topics,
  hasNonCompleted,
  onDelete,
  onComplete,
  onChangeTopic,
  onSetPriority,
  onClearSelection,
}: BulkActionBarProps) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const closeMenus = () => {
    setShowTopicMenu(false);
    setShowPriorityMenu(false);
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className="pointer-events-auto mx-auto max-w-2xl rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 flex-wrap"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {/* Selection count + clear */}
            <div className="flex items-center gap-2 mr-auto">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--accent-amber)" }}
              >
                {t("bulk_selected_count", { count: selectedCount })}
              </span>
              <button
                onClick={onClearSelection}
                className="p-1 rounded transition-colors hover:opacity-70"
                aria-label={t("bulk_exit_select")}
                style={{ color: "var(--text-muted)" }}
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {/* Complete */}
              {hasNonCompleted && (
                <button
                  onClick={() => { closeMenus(); onComplete(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent-green) 15%, transparent)",
                    color: "var(--accent-green)",
                    border: "1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)",
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                  {t("bulk_complete")}
                </button>
              )}

              {/* Change topic — dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowPriorityMenu(false); setShowTopicMenu((v) => !v); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--text-muted) 10%, transparent)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <FontAwesomeIcon icon={faFolderOpen} className="w-3 h-3" />
                  {t("bulk_change_topic")}
                </button>
                {showTopicMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTopicMenu(false)} />
                    <div
                      className="absolute bottom-full mb-2 left-0 z-50 py-1 rounded-lg shadow-lg min-w-[180px] max-h-[240px] overflow-y-auto"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <button
                        onClick={() => { onChangeTopic(null); setShowTopicMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t("bulk_no_topic")}
                      </button>
                      {topics.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => { onChangeTopic(topic.id); setShowTopicMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80 flex items-center gap-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {topic.color && (
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: topic.color }}
                            />
                          )}
                          {topic.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Set priority — dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowTopicMenu(false); setShowPriorityMenu((v) => !v); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--text-muted) 10%, transparent)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <FontAwesomeIcon icon={faFlag} className="w-3 h-3" />
                  {t("bulk_set_priority")}
                </button>
                {showPriorityMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPriorityMenu(false)} />
                    <div
                      className="absolute bottom-full mb-2 right-0 z-50 py-1 rounded-lg shadow-lg min-w-[140px]"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {(["HIGH", "NORMAL", "SOMEDAY"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => { onSetPriority(p); setShowPriorityMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80"
                          style={{
                            color:
                              p === "HIGH"
                                ? "var(--accent-red)"
                                : p === "NORMAL"
                                ? "var(--accent-amber)"
                                : "var(--text-muted)",
                          }}
                        >
                          {tCommon(`priority_${p.toLowerCase()}` as "priority_high" | "priority_normal" | "priority_someday")}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => { closeMenus(); onDelete(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
                  color: "var(--accent-red)",
                  border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
                }}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                {t("bulk_delete")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
