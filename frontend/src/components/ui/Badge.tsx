import * as React from "react";
import { cn } from "@/lib/design-system/cn";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-bg-elevated text-text-secondary border-bg-border",
  brand:   "bg-brand/15 text-brand-subtle border-brand/30",
  success: "bg-accent-teal/15 text-accent-teal border-accent-teal/30",
  warning: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  danger:  "bg-accent-rose/15 text-accent-rose border-accent-rose/30",
  info:    "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
