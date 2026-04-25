/**
 * Topics list page — Phase 2.
 *
 * Server component that fetches topics for the current user with task counts.
 * Renders a grid of TopicCards with create/edit/delete capabilities.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTopics } from "@/lib/topics";
import { TopicsGrid } from "@/components/topics/topics-grid";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Topics",
};

/**
 * Topics list page.
 * Fetches all topics with task counts for the authenticated user.
 */
export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("topics");

  const topics = await getUserTopics(session.user.id);

  const serializedTopics = topics.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    color: t.color ?? null,
    icon: t.icon ?? null,
    priority: t.priority,
    defaultEnergyLevel: t.defaultEnergyLevel ?? null,
    sequential: t.sequential,
    taskCount: t.taskCount,
    completedCount: t.completedCount,
  }));

  const subtitle =
    topics.length === 0
      ? t("page_subtitle_empty")
      : t("page_subtitle", { count: topics.length });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("page_title")}
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {subtitle}
        </p>
      </div>

      <TopicsGrid initialTopics={serializedTopics} />
    </div>
  );
}
