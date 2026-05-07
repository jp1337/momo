"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Checkbox component - Styled checkbox for completing tasks.
 */

export interface CheckboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  variant?: "default" | "success" | "amber";
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, variant = "default", style, ...props }, ref) => {
    const handleToggle = () => {
      onCheckedChange?.(!checked);
    };

    const variantColors = {
      default: "var(--accent-amber)",
      success: "var(--accent-green)",
      amber: "var(--accent-amber)",
    };

    const activeColor = variantColors[variant];

    return (
      <button
        type="button"
        ref={ref}
        onClick={handleToggle}
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-[var(--radius-sm)] border-2 flex items-center justify-center transition-all duration-200 cursor-pointer",
          className
        )}
        style={{
          borderColor: checked ? activeColor : "var(--border)",
          backgroundColor: checked ? activeColor : "transparent",
          ...style,
        }}
        aria-checked={checked}
        {...props}
      >
        {checked && (
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
            style={{ color: "var(--bg-primary)" }}
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
