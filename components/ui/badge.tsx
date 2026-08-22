"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge component - Small visual indicator for status, priority, or categories.
 */

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "neutral" | "done" | "danger" | "amber";
}

function Badge({ className, variant = "neutral", style, children, ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-[var(--radius-sm)] border-0 px-2 py-0.5 text-xs font-medium " +
    "transition-colors font-ui outline-none";

  // done/danger/amber dropped their color-mix(15%) tint (Task B4,
  // 2026-08-22): a 15% tint measured 2.58:1 (amber) to 4.21:1 (danger) in
  // light mode, and dark danger landed at 4.38:1 too — all under the
  // 4.5:1 floor. There is no single tint percentage that clears 4.5:1 for
  // every one of the three colors in both themes: the tightest ceiling
  // (amber, light) allows at most ~7%, which reads as barely-there and
  // buys no visible "chip" over having no fill at all. Rather than nudge
  // the number and leave a fragile margin, these three variants drop the
  // tint and let the text itself carry the badge — consistent with how
  // --done/--danger/--amber already appear as plain colored text
  // elsewhere (quest completion state, amber hint links): color is the
  // signal, not a surface. `neutral` keeps its --raised fill: it has no
  // color of its own to carry the distinction, so it needs the surface.
  const variantStyles = {
    // Ein Badge ist ein Label, keine Affordanz — es bekommt --raised als
    // Flaeche, aber bewusst KEINE Haarlinie: die Pillenform traegt die
    // Abgrenzung schon.
    neutral: "bg-[var(--raised)] text-[var(--ink-2)]",
    done: "bg-transparent text-[var(--done)]",
    danger: "bg-transparent text-[var(--danger)]",
    amber: "bg-transparent text-[var(--amber)]",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} style={style} {...props}>
      {children}
    </div>
  );
}

export { Badge };
