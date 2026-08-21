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

  const variantStyles = {
    neutral: "bg-[var(--s2)] text-[var(--ink-2)]",
    done: "bg-[color-mix(in_srgb,var(--done)_15%,transparent)] text-[var(--done)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
    amber: "bg-[color-mix(in_srgb,var(--amber)_15%,transparent)] text-[var(--amber)]",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} style={style} {...props}>
      {children}
    </div>
  );
}

export { Badge };
