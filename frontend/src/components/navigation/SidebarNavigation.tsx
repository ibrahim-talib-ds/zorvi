"use client";

// src/components/navigation/SidebarNavigation.tsx
// Renders the groups for the active variant from the centralized config.
// Same component for student and admin - only the configuration differs.

import { navFor } from "./navigation.config";
import { useSidebar } from "./SidebarProvider";
import { SidebarGroup } from "./SidebarGroup";
import type { SidebarVariant } from "./navigation.types";

export function SidebarNavigation({ variant, expanded }: { variant: SidebarVariant; expanded?: boolean }) {
  const ctx = useSidebar();
  const isOpen = expanded ?? ctx.expanded;
  const groups = navFor(variant);

  return (
    <nav
      id="app-sidebar-nav"
      aria-label="Application navigation"
      className="flex-1 overflow-y-auto overflow-x-hidden py-2"
    >
      {groups.map((group) => (
        <SidebarGroup
          key={group.key}
          group={group}
          expanded={isOpen}
          badgeOf={(badge) => (badge === "saved" ? ctx.savedCount : undefined)}
        />
      ))}
    </nav>
  );
}
