"use client";

/**
 * CoinCounter — animated coin balance display for the navbar.
 *
 * Receives the initial coin balance from the server-rendered layout.
 * Listens for "coinsEarned" custom events dispatched by TaskList after
 * task completion, and animates the counter using Framer Motion.
 */

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { COINS_EARNED_EVENT } from "@/lib/client/coin-events";

interface CoinCounterProps {
  /** Initial coin balance fetched server-side */
  initialCoins: number;
}

/**
 * Animated coin counter displayed in the navbar.
 * Counts up smoothly whenever coins are earned from task completion.
 */
export function CoinCounter({ initialCoins }: CoinCounterProps) {
  const [displayValue, setDisplayValue] = useState(initialCoins);
  const currentCoins = useRef(initialCoins);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleCoinsEarned = (e: Event) => {
      const { delta } = (e as CustomEvent<{ delta: number }>).detail;
      const from = currentCoins.current;
      const to = from + delta;
      currentCoins.current = to;

      animate(from, to, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      });
    };

    window.addEventListener(COINS_EARNED_EVENT, handleCoinsEarned);
    return () => window.removeEventListener(COINS_EARNED_EVENT, handleCoinsEarned);
  }, []);

  return (
    <span
      ref={nodeRef}
      data-testid="coin-counter"
      className="flex items-center gap-1.5 text-sm font-medium px-2.5 rounded-[var(--radius-sm)] h-9"
      style={{
        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        color: "var(--coin-gold)",
        // Task B12 (2026-08-22): was a hardcoded RGB-with-alpha fill at 12%
        // plus a hardcoded RGB-with-alpha border at 25%, both pinned to
        // amber's old hex — literals, so neither responded to the theme, and
        // the fill measured 3.34:1 in light mode. Now a
        // token-based wash, with the tint at 6% rather than the 12% used by
        // similar amber washes elsewhere (e.g. components/layout/level-badge.tsx):
        // --amber was darkened for AA in Task B4, and at 12% the composited
        // background only reaches 4.23:1 against the resulting fill in light
        // mode; 6% clears 4.5:1 with margin in both themes (4.58 light,
        // 8.44 dark — computed against --bg-surface, the navbar's actual
        // background). The border is dropped rather than tokenised: a wash
        // is a fill, not an affordance, and rule 3 gives an edge only to
        // affordances.
        backgroundColor: "color-mix(in srgb, var(--amber) 6%, transparent)",
      }}
      title="Your coin balance"
    >
      <FontAwesomeIcon icon={faCoins} className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{displayValue}</span>
    </span>
  );
}
