"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Button component - A versatile button that follows Momo's design system.
 */

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">>,
    HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", asChild = false, style, children, ...props }, ref) => {
    const Comp = (asChild ? Slot : motion.button) as typeof motion.button;

    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

    const variantStyles = {
      primary: "bg-[var(--accent-amber)] text-[var(--bg-primary)] hover:opacity-90",
      secondary: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-muted)]",
      ghost: "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
      danger: "bg-[var(--accent-red)] text-white hover:opacity-90",
      success: "bg-[var(--accent-green)] text-white hover:opacity-90",
      outline: "bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs",
      md: "h-10 px-5 py-2.5",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    const combinedStyle = {
      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
      ...style,
    };

    return (
      <Comp
        ref={ref}
        whileTap={asChild ? undefined : { scale: 0.98 }}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        style={combinedStyle}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button };
