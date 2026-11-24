"use client";

// src/components/navigation/SidebarTooltip.tsx
// Accessible tooltip for collapsed-rail items: shows on hover AND keyboard
// focus; the label is also exposed via aria-label on the link itself, so
// screen readers never depend on the visual tooltip.

import type { ReactNode } from "react";

export function SidebarTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative flex w-full">
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 z-[70] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#161B36] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 motion-reduce:transition-none"
      >
        {label}
      </span>
    </span>
  );
}
