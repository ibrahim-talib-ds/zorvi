"use client";

// src/components/navigation/SidebarGroup.tsx
// A labelled group of navigation items. Section headings are hidden when the
// rail is collapsed (a subtle divider keeps the rhythm instead).

import { SidebarItem } from "./SidebarItem";
import type { NavigationGroup as NavGroupType } from "./navigation.types";

export function SidebarGroup({
  group,
  expanded,
  badgeOf,
}: {
  group: NavGroupType;
  expanded: boolean;
  badgeOf?: (badge: string) => number | undefined;
}) {
  return (
    <div className="px-2">
      {expanded ? (
        <p className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5A6285]">
          {group.label}
        </p>
      ) : (
        <div className="mx-2 my-3 border-t border-white/5" aria-hidden="true" />
      )}
      <div className="space-y-1">
        {group.items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            expanded={expanded}
            badgeCount={item.badge ? badgeOf?.(item.badge) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
