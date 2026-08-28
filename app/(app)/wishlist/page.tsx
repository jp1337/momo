/**
 * Wishlist page — Phase 5.
 *
 * Server component that fetches wishlist items, budget summary, and user coin
 * balance for the current user, then passes them to the interactive
 * WishlistView client component.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserWishlistItems, getBudgetSummary } from "@/lib/wishlist";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Wishlist",
};

/**
 * Wishlist page.
 * Fetches all wishlist items, budget summary, and user coin balance.
 * Renders the interactive WishlistView client component.
 */
export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const t = await getTranslations("wishlist");

  const [items, budget, userRows] = await Promise.all([
    getUserWishlistItems(userId),
    getBudgetSummary(userId),
    db
      .select({ coins: users.coins })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  const userCoins = userRows[0]?.coins ?? 0;

  // Serialize items — dates → ISO strings, decimals → strings
  const serializedItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    price: item.price ?? null,
    url: item.url ?? null,
    priority: item.priority,
    status: item.status,
    coinUnlockThreshold: item.coinUnlockThreshold ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  const header = (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
        {t("page_subtitle")}
      </p>
    </div>
  );

  return (
    <WishlistView
      header={header}
      initialItems={serializedItems}
      initialBudget={budget}
      userCoins={userCoins}
    />
  );
}
