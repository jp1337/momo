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
  title: "Wishlist — Momo",
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
          {t("page_subtitle")}
        </p>
      </div>

      {/* Interactive wishlist view */}
      <WishlistView
        initialItems={serializedItems}
        initialBudget={budget}
        userCoins={userCoins}
      />
    </div>
  );
}
