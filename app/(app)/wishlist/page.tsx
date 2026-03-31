/**
 * Wishlist page — placeholder for Phase 5.
 * Will display wishlist items with coin-gating and budget tracking.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist",
};

/**
 * Wishlist page.
 * Wishlist functionality will be implemented in Phase 5.
 */
export default function WishlistPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-3xl font-semibold mb-2"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        Wishlist
      </h1>
      <p
        className="text-base mb-8"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        Track the things you want, and spend more consciously.
      </p>

      <div
        className="rounded-2xl p-8 text-center"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            color: "var(--text-muted)",
          }}
        >
          Wishlist & budget tracking is coming in Phase 5.
        </p>
      </div>
    </div>
  );
}
