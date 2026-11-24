"use client";

// src/components/navigation/SidebarItem.tsx
// One navigation link: active state from the real route, 44px+ touch target,
// reduced-motion friendly, badge support, tooltip wrapper when collapsed.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "./navigation.config";
import { SidebarTooltip } from "./SidebarTooltip";
import type { NavigationItem } from "./navigation.types";

export function SidebarItem({
  item,
  expanded,
  badgeCount,
}: {
  item: NavigationItem;
  expanded: boolean;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const showBadge = item.badge === "saved" && (badgeCount ?? 0) > 0;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={`relative flex min-h-[44px] items-center rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none ${
        expanded ? "gap-3 px-3 py-2.5" : "h-11 w-11 justify-center"
      } ${
        active
          ? "bg-[#7559E8]/15 text-white ring-1 ring-[#7559E8]/30"
          : "text-[#929CBD] hover:bg-white/[0.05] hover:text-white focus-visible:bg-white/[0.05] focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA]"
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#A78BFA] ${expanded ? "left-0" : "left-1.5"}`}
        />
      )}
      <Icon size={18} aria-hidden="true" className={`shrink-0 ${active ? "text-[#A78BFA]" : ""}`} />
      {expanded && <span className="truncate">{item.label}</span>}
      {expanded && showBadge && (
        <span className="ml-auto rounded-full bg-[#7559E8] px-2 py-0.5 text-[10px] font-bold text-white">
          {badgeCount}
        </span>
      )}
      {!expanded && showBadge && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#7559E8]" aria-hidden="true" />
      )}
    </Link>
  );

  return expanded ? link : <SidebarTooltip label={item.label}>{link}</SidebarTooltip>;
}
