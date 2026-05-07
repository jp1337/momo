"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge component - Small visual indicator for status, priority, or categories.
 */

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "danger" | "amber" | "outline";
}

function Badge({ className, variant = "default", style, children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variantStyles = {
    default: "border-transparent bg-[var(--bg-elevated)] text-[var(--text-primary)]",
    secondary: "border-transparent bg-[var(--bg-elevated)] text-[var(--text-muted)]",
    success: "border-transparent bg-[color-mix(in_srgb,var(--accent-green)_15%,transparent)] text-[var(--accent-green)] border-[color-mix(in_srgb,var(--accent-green)_25%,transparent)]",
    danger: "border-transparent bg-[color-mix(in_srgb,var(--accent-red)_15%,transparent)] text-[var(--accent-red)] border-[color-mix(in_srgb,var(--accent-red)_25%,transparent)]",
    amber: "border-transparent bg-[color-mix(in_srgb,var(--accent-amber)_15%,transparent)] text-[var(--accent-amber)] border-[color-mix(in_srgb,var(--accent-amber)_25%,transparent)]",
    outline: "text-[var(--text-primary)] border-[var(--border)]",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge };
