/**
 * Wishlist business logic for Momo.
 * All wishlist-related database operations go through this module.
 * Every function filters by userId to ensure data isolation between users.
 *
 * @module lib/wishlist
 */

import { db } from "@/lib/db";
import { wishlistItems, users } from "@/lib/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import type {
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
} from "@/lib/validators";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A wishlist item row as returned from the database */
export type WishlistItem = typeof wishlistItems.$inferSelect;

/** Result of marking a wishlist item as bought */
export interface MarkAsBoughtResult {
  item: WishlistItem;
  /** Number of coins deducted (0 if no coinUnlockThreshold) */
  coinsSpent: number;
}

/** Result of reverting a bought wishlist item */
export interface UnmarkAsBoughtResult {
  item: WishlistItem;
  /** Number of coins refunded (0 if no coinUnlockThreshold) */
  coinsRefunded: number;
}

/** Budget summary for a user */
export interface BudgetSummary {
  /** The user's configured monthly budget (null if not set) */
  monthlyBudget: number | null;
  /** Sum of prices of all BOUGHT items this calendar month */
  spentThisMonth: number;
  /** Remaining budget this month (null if monthlyBudget is not set) */
  remaining: number | null;
}

// ─── Priority sort order ──────────────────────────────────────────────────────

/**
 * Priority ordering for open wishlist items.
 * WANT → NICE_TO_HAVE → SOMEDAY (highest priority first).
 */
const PRIORITY_ORDER: Record<string, number> = {
  WANT: 0,
  NICE_TO_HAVE: 1,
  SOMEDAY: 2,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all wishlist items for a user.
 * Open items first (ordered by priority: WANT → NICE_TO_HAVE → SOMEDAY),
 * then bought and discarded items ordered by creation date descending.
 *
 * @param userId - The authenticated user's UUID
 * @returns Array of wishlist items
 */
export async function getUserWishlistItems(
  userId: string
): Promise<WishlistItem[]> {
  const rows = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));

  // Sort: OPEN items first by priority, then BOUGHT/DISCARDED by createdAt desc
  return rows.sort((a, b) => {
    const aIsOpen = a.status === "OPEN";
    const bIsOpen = b.status === "OPEN";

    if (aIsOpen && !bIsOpen) return -1;
    if (!aIsOpen && bIsOpen) return 1;

    if (aIsOpen && bIsOpen) {
      const aPriority = PRIORITY_ORDER[a.priority] ?? 99;
      const bPriority = PRIORITY_ORDER[b.priority] ?? 99;
      return aPriority - bPriority;
    }

    // Both non-open: sort by creation date (already handled by SQL desc)
    return 0;
  });
}

/**
 * Creates a new wishlist item for a user.
 *
 * @param userId - The authenticated user's UUID
 * @param input - Validated wishlist item creation input
 * @returns The newly created wishlist item
 */
export async function createWishlistItem(
  userId: string,
  input: CreateWishlistItemInput
): Promise<WishlistItem> {
  const rows = await db
    .insert(wishlistItems)
    .values({
      userId,
      title: input.title,
      price: input.price !== null && input.price !== undefined
        ? String(input.price)
        : null,
      url: input.url ?? null,
      priority: input.priority,
      coinUnlockThreshold: input.coinUnlockThreshold ?? null,
      status: "OPEN",
    })
    .returning();

  return rows[0];
}

/**
 * Updates a wishlist item. Only the owner can update.
 * Only the fields provided in input are updated (partial update).
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @param input - Partial update input
 * @returns The updated wishlist item
 * @throws Error if item not found or not owned by user
 */
export async function updateWishlistItem(
  itemId: string,
  userId: string,
  input: UpdateWishlistItemInput
): Promise<WishlistItem> {
  const updateValues: Partial<typeof wishlistItems.$inferInsert> = {};

  if (input.title !== undefined) updateValues.title = input.title;
  if (input.url !== undefined) updateValues.url = input.url ?? null;
  if (input.priority !== undefined) updateValues.priority = input.priority;
  if (input.coinUnlockThreshold !== undefined)
    updateValues.coinUnlockThreshold = input.coinUnlockThreshold ?? null;

  // Handle price — convert number to string for decimal column, null stays null
  if (input.price !== undefined) {
    updateValues.price =
      input.price !== null ? String(input.price) : null;
  }

  const rows = await db
    .update(wishlistItems)
    .set(updateValues)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Wishlist item not found or access denied");
  }

  return rows[0];
}

/**
 * Marks a wishlist item as bought (status → BOUGHT). Does not delete it.
 * If the item has a coinUnlockThreshold, coins are atomically deducted
 * from the user's balance in a transaction.
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated item and the number of coins spent
 * @throws Error("INSUFFICIENT_COINS") if user doesn't have enough coins
 * @throws Error if item not found or not owned by user
 */
export async function markAsBought(
  itemId: string,
  userId: string
): Promise<MarkAsBoughtResult> {
  // Load item first to check threshold
  const existing = await getWishlistItemById(itemId, userId);
  if (!existing) {
    throw new Error("Wishlist item not found or access denied");
  }
  if (existing.status !== "OPEN") {
    throw new Error("Wishlist item is not open");
  }

  const threshold = existing.coinUnlockThreshold;

  // No coin threshold — simple status update
  if (threshold === null || threshold <= 0) {
    const rows = await db
      .update(wishlistItems)
      .set({ status: "BOUGHT" })
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
      .returning();
    return { item: rows[0], coinsSpent: 0 };
  }

  // Coin threshold set — atomic deduction in a transaction
  const result = await db.transaction(async (tx) => {
    // Read current coin balance
    const [user] = await tx
      .select({ coins: users.coins })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || user.coins < threshold) {
      throw new Error("INSUFFICIENT_COINS");
    }

    // Deduct coins atomically
    await tx
      .update(users)
      .set({ coins: sql`${users.coins} - ${threshold}` })
      .where(eq(users.id, userId));

    // Mark as bought
    const rows = await tx
      .update(wishlistItems)
      .set({ status: "BOUGHT" })
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
      .returning();

    return { item: rows[0], coinsSpent: threshold };
  });

  return result;
}

/**
 * Reverts a BOUGHT wishlist item back to OPEN status (undo buy).
 * If the item had a coinUnlockThreshold, coins are atomically refunded
 * to the user's balance (floored at 0 via GREATEST for safety).
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated item and the number of coins refunded
 * @throws Error if item not found, not owned by user, or not in BOUGHT status
 */
export async function unmarkAsBought(
  itemId: string,
  userId: string
): Promise<UnmarkAsBoughtResult> {
  const existing = await getWishlistItemById(itemId, userId);
  if (!existing) {
    throw new Error("Wishlist item not found or access denied");
  }
  if (existing.status !== "BOUGHT") {
    throw new Error("Wishlist item is not marked as bought");
  }

  const threshold = existing.coinUnlockThreshold;

  // No coin threshold — simple status revert
  if (threshold === null || threshold <= 0) {
    const rows = await db
      .update(wishlistItems)
      .set({ status: "OPEN" })
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
      .returning();
    return { item: rows[0], coinsRefunded: 0 };
  }

  // Coin threshold set — atomic refund in a transaction
  const result = await db.transaction(async (tx) => {
    // Refund coins atomically (GREATEST prevents negative balance)
    await tx
      .update(users)
      .set({ coins: sql`GREATEST(${users.coins} + ${threshold}, 0)` })
      .where(eq(users.id, userId));

    // Revert status to OPEN
    const rows = await tx
      .update(wishlistItems)
      .set({ status: "OPEN" })
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
      .returning();

    return { item: rows[0], coinsRefunded: threshold };
  });

  return result;
}

/**
 * Marks a wishlist item as discarded (status → DISCARDED).
 * The item remains in the database but is visually de-emphasised in the UI.
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated wishlist item
 * @throws Error if item not found or not owned by user
 */
export async function discardWishlistItem(
  itemId: string,
  userId: string
): Promise<WishlistItem> {
  const rows = await db
    .update(wishlistItems)
    .set({ status: "DISCARDED" })
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Wishlist item not found or access denied");
  }

  return rows[0];
}

/**
 * Restores a DISCARDED wishlist item back to OPEN status (undo discard).
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated wishlist item
 * @throws Error if item not found, not owned by user, or not in DISCARDED status
 */
export async function restoreWishlistItem(
  itemId: string,
  userId: string
): Promise<WishlistItem> {
  const existing = await getWishlistItemById(itemId, userId);
  if (!existing) {
    throw new Error("Wishlist item not found or access denied");
  }
  if (existing.status !== "DISCARDED") {
    throw new Error("Wishlist item is not discarded");
  }

  const rows = await db
    .update(wishlistItems)
    .set({ status: "OPEN" })
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Wishlist item not found or access denied");
  }

  return rows[0];
}

/**
 * Permanently deletes a wishlist item.
 * Recommended only for DISCARDED items, but not enforced at this layer
 * (the API route should guard this).
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @throws Error if item not found or not owned by user
 */
export async function deleteWishlistItem(
  itemId: string,
  userId: string
): Promise<void> {
  const rows = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))
    .returning({ id: wishlistItems.id });

  if (!rows[0]) {
    throw new Error("Wishlist item not found or access denied");
  }
}

/**
 * Returns a single wishlist item by ID, scoped to the authenticated user.
 *
 * @param itemId - The wishlist item's UUID
 * @param userId - The authenticated user's UUID
 * @returns The item if found and owned by the user, or null
 */
export async function getWishlistItemById(
  itemId: string,
  userId: string
): Promise<WishlistItem | null> {
  const rows = await db
    .select()
    .from(wishlistItems)
    .where(
      and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId))
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns the user's monthly budget setting and total spent this month
 * (sum of prices of all BOUGHT items created in the current calendar month).
 *
 * @param userId - The user's UUID
 * @returns Budget summary with monthlyBudget, spentThisMonth, and remaining
 */
export async function getBudgetSummary(userId: string): Promise<BudgetSummary> {
  // Fetch the user's monthly budget setting
  const userRows = await db
    .select({ monthlyBudget: users.monthlyBudget })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const rawBudget = userRows[0]?.monthlyBudget ?? null;
  const monthlyBudget = rawBudget !== null ? Number(rawBudget) : null;

  // Calculate start of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Sum prices of BOUGHT items created this month
  const spentRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${wishlistItems.price}), 0)` })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.status, "BOUGHT"),
        gte(wishlistItems.createdAt, startOfMonth)
      )
    );

  const spentThisMonth = Number(spentRows[0]?.total ?? 0);
  const remaining = monthlyBudget !== null ? monthlyBudget - spentThisMonth : null;

  return { monthlyBudget, spentThisMonth, remaining };
}

/**
 * Updates the user's monthly budget setting.
 * Pass null to remove the budget limit.
 *
 * @param userId - The user's UUID
 * @param budget - The new monthly budget amount, or null to clear it
 */
export async function updateMonthlyBudget(
  userId: string,
  budget: number | null
): Promise<void> {
  await db
    .update(users)
    .set({
      monthlyBudget: budget !== null ? String(budget) : null,
    })
    .where(eq(users.id, userId));
}
