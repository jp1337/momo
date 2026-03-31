"use client";

/**
 * Confetti animation utilities for Momo.
 *
 * Uses canvas-confetti to fire celebratory bursts of confetti
 * in the app's brand colors: amber, gold, and green.
 *
 * @module components/animations/confetti
 */

import confetti from "canvas-confetti";

/** Brand colors used in confetti bursts */
const CONFETTI_COLORS = [
  "#f0a500", // --accent-amber
  "#ffd060", // --coin-gold
  "#4a8c5c", // --accent-green
  "#ede0c8", // --text-primary (warm cream)
];

/**
 * Fires a large celebratory confetti burst from the center of the screen.
 * Used when completing the daily quest.
 */
export function triggerConfetti(): void {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.5, y: 0.55 },
    colors: CONFETTI_COLORS,
    ticks: 200,
    gravity: 0.9,
    scalar: 1.1,
    shapes: ["circle", "square"],
  });
}

/**
 * Fires a smaller, lighter confetti burst.
 * Used when completing regular tasks in the task list.
 */
export function triggerSmallConfetti(): void {
  confetti({
    particleCount: 40,
    spread: 55,
    origin: { x: 0.5, y: 0.6 },
    colors: CONFETTI_COLORS,
    ticks: 120,
    gravity: 1.1,
    scalar: 0.85,
    shapes: ["circle"],
  });
}
