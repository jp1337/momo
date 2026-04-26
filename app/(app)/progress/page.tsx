/**
 * Progress page — unified view of Habits, Achievements, and Weekly Review.
 *
 * Replaces three separate sidebar entries with one consolidated "Progress" page.
 * Tab navigation via ?tab= search param (habits | achievements | review).
 * Server Component — each tab section fetches its own data.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { ProgressTabs } from "@/components/progress/progress-tabs";

export const metadata: Metadata = {
  title: "Progress",
};

type Tab = "habits" | "achievements" | "review";
const VALID_TABS: Tab[] = ["habits", "achievements", "review"];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("progress");
  const params = await searchParams;
  const tab: Tab = VALID_TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "habits";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("page_title")}
        </h1>

        {/* Tab navigation */}
        <div className="flex gap-1 mt-4">
          {(["habits", "achievements", "review"] as const).map((key) => {
            const labelKey = `tab_${key}` as const;
            const isActive = tab === key;
            return (
              <Link
                key={key}
                href={`/progress?tab=${key}`}
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  textDecoration: "none",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  color: isActive ? "var(--accent-amber)" : "var(--text-muted)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-amber)"
                    : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <ProgressTabs tab={tab} userId={session.user.id} year={params.year} />
    </div>
  );
}
