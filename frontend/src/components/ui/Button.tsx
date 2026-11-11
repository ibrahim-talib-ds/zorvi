"use client";

import * as React from "react";
import { cn } from "@/lib/design-system/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "icon";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-white border border-brand hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand-subtle shadow-md hover:shadow-glow-brand",
  secondary:
    "bg-transparent text-text-primary border border-bg-border hover:bg-bg-elevated focus-visible:ring-2 focus-visible:ring-brand-subtle",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text-primary hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-brand-subtle",
  destructive:
    "bg-transparent text-accent-rose border border-accent-rose hover:bg-accent-rose/10 focus-visible:ring-2 focus-visible:ring-accent-rose/50",
  icon:
    "bg-bg-surface text-text-secondary border border-bg-border hover:bg-bg-elevated hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-subtle",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-md gap-2",
  md: "h-11 px-5 text-sm rounded-md gap-2",
  lg: "h-13 px-6 text-base rounded-md gap-2",
};

const iconSizeClasses: Record<Size, string> = {
  sm: "h-9 w-9 rounded-md",
  md: "h-11 w-11 rounded-md",
  lg: "h-13 w-13 rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const isIcon = variant === "icon";
    const sizeCls = isIcon ? iconSizeClasses[size] : sizeClasses[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-150",
          "focus:outline-none focus-visible:outline-none",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeCls,
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          <>
            {leftIcon}
            {!isIcon && children}
            {rightIcon}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
