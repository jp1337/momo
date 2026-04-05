"use client";

/**
 * TopicDetailActions — Edit and Delete buttons for the topic detail page.
 *
 * Rendered as a Client Component so it can manage modal/confirm state.
 * Placed in the topic header to allow editing or deleting the topic from its detail view.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TopicForm } from "@/components/topics/topic-form";

interface TopicDetailActionsProps {
  topic: {
    id: string;
    title: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    priority: "HIGH" | "NORMAL" | "SOMEDAY";
  };
}

/**
 * Edit and Delete action buttons for the topic detail page header.
 * Edit opens the TopicForm modal; Delete confirms and redirects to /topics.
 */
export function TopicDetailActions({ topic }: TopicDetailActionsProps) {
  const t = useTranslations("topics");
  const router = useRouter();
  const [showEditForm, setShowEditForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("confirm_delete"))) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/topics");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setShowEditForm(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("aria_edit")}
          title={t("aria_edit")}
        >
          ✎
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("aria_delete")}
          title={t("aria_delete")}
        >
          ✕
        </button>
      </div>

      {showEditForm && (
        <TopicForm
          initialData={{
            id: topic.id,
            title: topic.title,
            description: topic.description ?? "",
            color: topic.color ?? "#4a8c5c",
            icon: topic.icon ?? "folder",
            priority: topic.priority,
          }}
          onSuccess={() => {
            setShowEditForm(false);
            router.refresh();
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}
    </>
  );
}
