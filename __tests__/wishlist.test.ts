/**
 * Integration tests for lib/wishlist.ts.
 *
 * Covers: getUserWishlistItems, createWishlistItem, updateWishlistItem,
 * deleteWishlistItem, markAsBought (coin deduction + INSUFFICIENT_COINS),
 * unmarkAsBought (coin refund), discardWishlistItem, restoreWishlistItem,
 * getBudgetSummary (monthly sum).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import {
  getUserWishlistItems,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  markAsBought,
  unmarkAsBought,
  discardWishlistItem,
  restoreWishlistItem,
  getBudgetSummary,
} from "@/lib/wishlist";
import { createTestUser, createTestWishlistItem } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

async function getUserCoins(userId: string): Promise<number> {
  const [row] = await db
    .select({ coins: users.coins })
    .from(users)
    .where(eq(users.id, userId));
  return row.coins;
}

// ─── getUserWishlistItems ─────────────────────────────────────────────────────

describe("getUserWishlistItems", () => {
  it("returns all wishlist items for the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestWishlistItem(user.id, { title: "Keyboard" });
    await createTestWishlistItem(user.id, { title: "Monitor" });

    const result = await getUserWishlistItems(user.id);
    expect(result).toHaveLength(2);
    const titles = result.map((i) => i.title);
    expect(titles).toContain("Keyboard");
    expect(titles).toContain("Monitor");
  });

  it("isolates items by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestWishlistItem(userA.id, { title: "Private item" });

    const result = await getUserWishlistItems(userB.id);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when user has no items", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getUserWishlistItems(user.id);
    expect(result).toHaveLength(0);
  });
});

// ─── createWishlistItem ───────────────────────────────────────────────────────

describe("createWishlistItem", () => {
  it("creates a wishlist item with the given title and priority", async () => {
    const user = await createTestUser({ timezone: TZ });

    const item = await createWishlistItem(user.id, {
      title: "New Headphones",
      priority: "WANT",
    });

    expect(item.id).toBeDefined();
    expect(item.title).toBe("New Headphones");
    expect(item.priority).toBe("WANT");
    expect(item.status).toBe("OPEN");
    expect(item.userId).toBe(user.id);
  });

  it("creates a wishlist item with coin threshold", async () => {
    const user = await createTestUser({ timezone: TZ });

    const item = await createWishlistItem(user.id, {
      title: "Premium Item",
      priority: "WANT",
      coinUnlockThreshold: 100,
    });

    expect(item.coinUnlockThreshold).toBe(100);
  });
});

// ─── updateWishlistItem ───────────────────────────────────────────────────────

describe("updateWishlistItem", () => {
  it("updates the title", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { title: "Old Title" });

    const updated = await updateWishlistItem(item.id, user.id, { title: "New Title" });
    expect(updated.title).toBe("New Title");
  });

  it("updates the priority", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { priority: "SOMEDAY" });

    const updated = await updateWishlistItem(item.id, user.id, { priority: "WANT" });
    expect(updated.priority).toBe("WANT");
  });

  it("throws when item belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(userA.id);

    await expect(
      updateWishlistItem(item.id, userB.id, { title: "Hacked" })
    ).rejects.toThrow();
  });
});

// ─── markAsBought ─────────────────────────────────────────────────────────────

describe("markAsBought", () => {
  it("marks an item as bought without coin deduction when no threshold set", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 10 });
    const item = await createTestWishlistItem(user.id, { coinUnlockThreshold: null });

    const result = await markAsBought(item.id, user.id);
    expect(result.item.status).toBe("BOUGHT");
    expect(result.coinsSpent).toBe(0);
    expect(await getUserCoins(user.id)).toBe(10); // no deduction
  });

  it("deducts coins when coinUnlockThreshold is set", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 50 });
    const item = await createTestWishlistItem(user.id, { coinUnlockThreshold: 30 });

    const result = await markAsBought(item.id, user.id);
    expect(result.item.status).toBe("BOUGHT");
    expect(result.coinsSpent).toBe(30);
    expect(await getUserCoins(user.id)).toBe(20);
  });

  it("throws INSUFFICIENT_COINS when user cannot afford item", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 5 });
    const item = await createTestWishlistItem(user.id, { coinUnlockThreshold: 50 });

    await expect(markAsBought(item.id, user.id)).rejects.toThrow("INSUFFICIENT_COINS");
  });

  it("throws when item belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(userA.id);

    await expect(markAsBought(item.id, userB.id)).rejects.toThrow();
  });

  it("throws when item is already bought", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { status: "BOUGHT" });

    await expect(markAsBought(item.id, user.id)).rejects.toThrow();
  });
});

// ─── unmarkAsBought ───────────────────────────────────────────────────────────

describe("unmarkAsBought", () => {
  it("reverts a bought item to OPEN without coin refund when no threshold", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 10 });
    const item = await createTestWishlistItem(user.id, {
      status: "BOUGHT",
      coinUnlockThreshold: null,
    });

    const result = await unmarkAsBought(item.id, user.id);
    expect(result.item.status).toBe("OPEN");
    expect(result.coinsRefunded).toBe(0);
    expect(await getUserCoins(user.id)).toBe(10);
  });

  it("refunds coins when item had a coinUnlockThreshold", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 20 });
    const item = await createTestWishlistItem(user.id, {
      status: "BOUGHT",
      coinUnlockThreshold: 30,
    });

    const result = await unmarkAsBought(item.id, user.id);
    expect(result.item.status).toBe("OPEN");
    expect(result.coinsRefunded).toBe(30);
    expect(await getUserCoins(user.id)).toBe(50);
  });

  it("throws when item is not in BOUGHT status", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { status: "OPEN" });

    await expect(unmarkAsBought(item.id, user.id)).rejects.toThrow();
  });
});

// ─── discardWishlistItem / restoreWishlistItem ────────────────────────────────

describe("discardWishlistItem", () => {
  it("sets status to DISCARDED", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { status: "OPEN" });

    const result = await discardWishlistItem(item.id, user.id);
    expect(result.status).toBe("DISCARDED");
  });

  it("throws when item belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(userA.id);

    await expect(discardWishlistItem(item.id, userB.id)).rejects.toThrow();
  });
});

describe("restoreWishlistItem", () => {
  it("sets status back to OPEN", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { status: "DISCARDED" });

    const result = await restoreWishlistItem(item.id, user.id);
    expect(result.status).toBe("OPEN");
  });
});

// ─── deleteWishlistItem ───────────────────────────────────────────────────────

describe("deleteWishlistItem", () => {
  it("removes the item from the database", async () => {
    const user = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(user.id, { title: "Delete Me" });

    await deleteWishlistItem(item.id, user.id);

    const remaining = await getUserWishlistItems(user.id);
    expect(remaining.find((i) => i.id === item.id)).toBeUndefined();
  });

  it("throws when item belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const item = await createTestWishlistItem(userA.id);

    await expect(deleteWishlistItem(item.id, userB.id)).rejects.toThrow();
  });
});

// ─── getBudgetSummary ─────────────────────────────────────────────────────────

describe("getBudgetSummary", () => {
  it("returns zero spentThisMonth when no bought items this month", async () => {
    const user = await createTestUser({ timezone: TZ });

    const summary = await getBudgetSummary(user.id);
    expect(summary.spentThisMonth).toBe(0);
    expect(summary.monthlyBudget).toBeNull();
    expect(summary.remaining).toBeNull();
  });

  it("returns correct monthly spend for a bought item with price", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Create and buy an item with a price
    const item = await createWishlistItem(user.id, {
      title: "Coffee Maker",
      priority: "WANT",
      price: 49.99,
    });
    await markAsBought(item.id, user.id);

    const summary = await getBudgetSummary(user.id);
    expect(Number(summary.spentThisMonth)).toBeCloseTo(49.99, 1);
  });
});
