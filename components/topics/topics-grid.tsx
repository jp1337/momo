"use client";

/**
 * TopicsGrid component — interactive grid of topic cards.
 *
 * Manages topic state after initial server-fetched data.
 * Handles create/edit/delete actions via the TopicForm modal.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TopicCard } from "./topic-card";
import { TopicForm } from "./topic-form";
import { TemplatePicker } from "./template-picker";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  defaultEnergyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  sequential: boolean;
  taskCount: number;
  completedCount: number;
}

interface TopicsGridProps {
  initialTopics: Topic[];
}

/**
 * Empty state for when the user has no topics.
 */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("topics");
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      <p className="text-2xl mb-3" role="img" aria-label="Folder">
        📂
      </p>
      <p
        className="text-base font-medium mb-1"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        {t("page_subtitle_empty")}
      </p>
      <p
        className="text-sm mb-4"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {t("empty_hint")}
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          backgroundColor: "var(--accent-amber)",
          color: "var(--bg-primary)",
        }}
      >
        {t("create_first")}
      </button>
    </div>
  );
}

/**
 * Interactive grid of topic cards with CRUD functionality.
 */
export function TopicsGrid({ initialTopics }: TopicsGridProps) {
  const t = useTranslations("topics");
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const editingTopic = topics.find((topic) => topic.id === editingTopicId);

  const refreshTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const data = await res.json() as { topics: Topic[] };
        setTopics(data.topics);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t("confirm_delete"))) return;
      try {
        const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
        if (res.ok) {
          setTopics((prev) => prev.filter((topic) => topic.id !== id));
        }
      } catch {
        // silent fail
      }
    },
    [t]
  );

  const handleFormSuccess = useCallback(async () => {
    setEditingTopicId(null);
    setShowCreateForm(false);
    await refreshTopics();
  }, [refreshTopics]);

  return (
    <div>
      {/* New Topic / Template buttons */}
      <div className="flex justify-end gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {t("from_template")}
        </button>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("new_topic")}
        </button>
      </div>

      {/* Empty state */}
      {topics.length === 0 && (
        <EmptyState onAdd={() => setShowCreateForm(true)} />
      )}

      {/* Topics grid */}
      {topics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              id={topic.id}
              title={topic.title}
              description={topic.description}
              color={topic.color}
              icon={topic.icon}
              priority={topic.priority}
              sequential={topic.sequential}
              taskCount={topic.taskCount}
              completedCount={topic.completedCount}
              onEdit={setEditingTopicId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onImported={async () => {
            setShowTemplatePicker(false);
            await refreshTopics();
          }}
          onCancel={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Topic form modal */}
      {(showCreateForm || editingTopicId) && (
        <TopicForm
          initialData={
            editingTopic
              ? {
                  id: editingTopic.id,
                  title: editingTopic.title,
                  description: editingTopic.description ?? "",
                  color: editingTopic.color ?? "#4a8c5c",
                  icon: editingTopic.icon ?? "📁",
                  priority: editingTopic.priority,
                  defaultEnergyLevel: editingTopic.defaultEnergyLevel ?? null,
                  sequential: editingTopic.sequential,
                }
              : undefined
          }
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTopicId(null);
          }}
        />
      )}
    </div>
  );
}
