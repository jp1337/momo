"use client";

/**
 * Tooltip — Momo-styled wrapper around Radix UI Tooltip primitive.
 *
 * Replaces native HTML `title=` attributes with proper themed tooltips that
 * also appear on keyboard focus, not just hover.
 *
 * The TooltipProvider is mounted once in the root layout — individual call
 * sites just use <Tooltip>/<TooltipTrigger>/<TooltipContent>.
 *
 * Usage:
 *   <Tooltip>
 *     <TooltipTrigger asChild>
 *       <button aria-label="Edit"><EditIcon /></button>
 *     </TooltipTrigger>
 *     <TooltipContent>Edit topic</TooltipContent>
 *   </Tooltip>
 */

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode, CSSProperties } from "react";

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

interface TooltipContentProps {
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Override styles (rare — most tooltips look the same) */
  style?: CSSProperties;
}

/**
 * TooltipContent — themed bubble rendered through a portal.
 * Includes the small arrow that points back at the trigger.
 */
export function TooltipContent({
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  style,
}: TooltipContentProps) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 px-2.5 py-1.5 rounded-md text-xs font-medium select-none"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxWidth: "260px",
          ...style,
        }}
      >
        {children}
        <RadixTooltip.Arrow
          width={10}
          height={5}
          style={{ fill: "var(--bg-elevated)" }}
        />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
}
