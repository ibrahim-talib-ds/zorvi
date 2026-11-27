// src/components/navigation/navigation.types.ts
// ibrant navigation system v16 - shared types (single source of truth)

import type { LucideIcon } from "lucide-react";

/** Who can see a navigation item. */
export type NavRole = "guest" | "student" | "admin";

/** Which application shell variant the sidebar renders for. */
export type SidebarVariant = "student" | "admin";

/** Supported live badges (wired to real data only). */
export type NavBadge = "saved";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  roles: NavRole[];
  /** Route needs an authenticated session. */
  requiresAuth?: boolean;
  /** Optional badge wired in SidebarProvider (e.g. saved-projects count). */
  badge?: NavBadge;
}

export interface NavigationGroup {
  key: string;
  label: string;
  items: NavigationItem[];
}

/** Shared sidebar state - one provider for desktop rail + mobile drawer. */
export type SidebarContextValue = {
  expanded: boolean;
  mobileOpen: boolean;
  savedCount: number;
  desktopWidth: number;
  setDesktopWidth: (width: number) => void;
  toggleExpanded: () => void;
  setExpanded: (value: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
};
