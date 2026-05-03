"use client";

/**
 * BulkActionBar — sticky bottom bar shown when ≥1 task is selected in bulk mode.
 *
 * Renders action buttons for: complete all, delete, change topic, set priority.
 * Slides up from the bottom with Framer Motion animation.
 * Topic + priority pickers are Radix UI DropdownMenus (arrow-key nav, focus
 * management, ARIA, type-ahead all from the library).
 */

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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ConfirmButton } from "@/components/ui/confirm-button";

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

const menuContentClass =
  "py-1 rounded-lg shadow-lg z-50 min-w-[180px] max-h-[240px] overflow-y-auto";
const menuContentStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
};

const menuItemClass =
  "w-full text-left px-3 py-2 text-xs cursor-pointer outline-none data-[highlighted]:bg-[color-mix(in_srgb,var(--accent-amber)_15%,transparent)]";

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
            // Frosted-surface treatment: this bar floats over the task list
            // and the bg blur emphasizes the layering.
            className="pointer-events-auto mx-auto max-w-2xl rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 flex-wrap frosted-surface"
            style={{
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
                className="p-2.5 -m-1 rounded transition-colors hover:opacity-70"
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
                  onClick={onComplete}
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

              {/* Change topic — Radix DropdownMenu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
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
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    align="start"
                    sideOffset={6}
                    className={menuContentClass}
                    style={menuContentStyle}
                  >
                    <DropdownMenu.Item
                      onSelect={() => onChangeTopic(null)}
                      className={menuItemClass}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t("bulk_no_topic")}
                    </DropdownMenu.Item>
                    {topics.map((topic) => (
                      <DropdownMenu.Item
                        key={topic.id}
                        onSelect={() => onChangeTopic(topic.id)}
                        className={`${menuItemClass} flex items-center gap-2`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        {topic.color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: topic.color }}
                          />
                        )}
                        {topic.title}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Set priority — Radix DropdownMenu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
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
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    align="end"
                    sideOffset={6}
                    className={`${menuContentClass} min-w-[140px]`}
                    style={menuContentStyle}
                  >
                    {(["HIGH", "NORMAL", "SOMEDAY"] as const).map((p) => (
                      <DropdownMenu.Item
                        key={p}
                        onSelect={() => onSetPriority(p)}
                        className={menuItemClass}
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
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Delete */}
              <ConfirmButton
                onConfirm={onDelete}
                confirmPrompt={t("bulk_confirm_delete", { count: selectedCount })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
                  color: "var(--accent-red)",
                  border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
                }}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                {t("bulk_delete")}
              </ConfirmButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
