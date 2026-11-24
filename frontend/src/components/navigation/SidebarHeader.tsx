"use client";

// src/components/navigation/SidebarHeader.tsx
// Brand block + the collapse control. 44px hit areas, visible focus, aria
// attributes wired to the nav landmark. showToggle=false inside the mobile
// drawer (which has its own close button).

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarTooltip } from "./SidebarTooltip";

export function SidebarHeader({
  expanded,
  onToggle,
  showToggle = true,
}: {
  expanded: boolean;
  onToggle?: () => void;
  showToggle?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/5 px-3 py-3" style={{ minHeight: 64 }}>
      <Link
        href="/"
        aria-label="IBRANT home"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7559E8] to-[#8B70FF] shadow-lg shadow-[#7559E8]/25"
      >
        <span className="font-display text-lg font-extrabold text-white" aria-hidden="true">I</span>
      </Link>

      {expanded && (
        <Link href="/" className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-display text-base font-extrabold tracking-wide text-white">
            IBRANT
          </span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-[#7A8199]">
            Learning Platform
          </span>
        </Link>
      )}

      {showToggle && onToggle && (
        <SidebarTooltip label={expanded ? "Collapse sidebar" : "Expand sidebar"}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="app-sidebar-nav"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#929CBD] transition hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none ${
              expanded ? "" : "mr-1"
            }`}
          >
            {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </SidebarTooltip>
      )}
    </div>
  );
}
