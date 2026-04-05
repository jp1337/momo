/**
 * Centralised contract for the "coinsEarned" custom DOM event.
 *
 * All dispatchers and listeners import from here to avoid magic strings and
 * to ensure the event detail shape is consistently typed across the app.
 */

/** The canonical event name for the coinsEarned custom event. */
export const COINS_EARNED_EVENT = "coinsEarned" as const;

/**
 * Dispatches a "coinsEarned" custom event on the window.
 *
 * Guards against invalid deltas (NaN, Infinity, zero) so the CoinCounter
 * never receives garbage values and skips unnecessary animations.
 *
 * @param delta - Positive number when coins are earned, negative when refunded
 */
export function dispatchCoinsEarned(delta: number): void {
  if (typeof window === "undefined") return; // SSR guard
  if (!isFinite(delta) || delta === 0) return;
  window.dispatchEvent(
    new CustomEvent(COINS_EARNED_EVENT, { detail: { delta } })
  );
}
