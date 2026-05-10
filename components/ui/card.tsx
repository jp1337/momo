"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Card component - The primary container for content in Momo.
 */

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, asChild = false, style, children, ...props }, ref) => {
    const Comp = (asChild ? Slot : motion.div) as typeof motion.div;

    const combinedStyle = {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--border)",
      boxShadow: "var(--shadow-sm)",
      ...style,
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg)] p-6 border transition-all duration-200",
          hover && "card-hover",
          className
        )}
        style={combinedStyle}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Card.displayName = "Card";

const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props}>
    {children}
  </div>
);

const CardTitle = ({ className, style, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-xl font-semibold leading-tight", className)}
    style={{
      fontFamily: "var(--font-display, 'Lora', serif)",
      color: "var(--text-primary)",
      ...style,
    }}
    {...props}
  >
    {children}
  </h3>
);

const CardDescription = ({ className, style, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm", className)}
    style={{
      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
      color: "var(--text-muted)",
      ...style,
    }}
    {...props}
  >
    {children}
  </p>
);

const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(className)} {...props}>
    {children}
  </div>
);

const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center pt-4 mt-4 border-t border-[var(--border)]", className)} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
