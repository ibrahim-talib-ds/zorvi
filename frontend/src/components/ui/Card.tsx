import * as React from "react";
import { cn } from "@/lib/design-system/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg bg-bg-surface border border-bg-border shadow-md",
          hoverable &&
            "transition-all duration-200 hover:bg-bg-elevated hover:shadow-lg cursor-pointer",
          paddingMap[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";
