"use client";

// src/components/navigation/AppSidebar.tsx
// THE one shared sidebar for the whole authenticated application.
//
//   <AppSidebar variant="student" />   <- accounts area
//   <AppSidebar variant="admin" />     <- admin area (same visuals)
//
// Drop-in compatible with the previous sidebars: the legacy props
// (collapsed / onToggle / mobileOpen / onMobileClose) are accepted and still
// work, so existing layouts keep compiling and behaving. New integrations
// should just pass variant and let SidebarProvider own the state.

import type { ReactNode } from "react";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarProfile } from "./SidebarProfile";
import { MobileNavButton, MobileSidebar } from "./MobileSidebar";
import { SIDEBAR_W } from "./navigation.config";
import type { SidebarVariant } from "./navigation.types";

export interface AppSidebarProps {
  variant?: SidebarVariant;
  /** Legacy props - accepted so existing layouts keep working untouched. */
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Accepted for layout compatibility (children live in the page's <main>). */
  children?: ReactNode;
  /** Internal: false when rendered by AppShell (header owns the menu button). */
  standaloneMobile?: boolean;
}

export function AppSidebar(props: AppSidebarProps) {
  return (
    <SidebarProvider>
      <AppSidebarCore {...props} standaloneMobile={props.standaloneMobile ?? true} />
    </SidebarProvider>
  );
}

/** Advanced: renders the rail + drawer, requires an existing SidebarProvider. */
export function AppSidebarCore({
  variant = "student",
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  standaloneMobile = true,
}: AppSidebarProps) {
  const ctx = useSidebar();
  const expanded = collapsed === undefined ? ctx.expanded : !collapsed;
  const toggle = onToggle ?? ctx.toggleExpanded;
  const drawerOpen = mobileOpen === undefined ? ctx.mobileOpen : mobileOpen;
  const closeDrawer = onMobileClose ?? ctx.closeMobile;

  return (
    <>
      <aside
        aria-label="Application sidebar"
        data-variant={variant}
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/5 bg-[#0B0F1D] transition-[width] duration-200 md:flex motion-reduce:transition-none"
        style={{ width: expanded ? SIDEBAR_W.expanded : SIDEBAR_W.collapsed }}
      >
        <SidebarHeader expanded={expanded} onToggle={toggle} />
        <SidebarNavigation variant={variant} expanded={expanded} />
        <SidebarFooter variant={variant} expanded={expanded} />
        <SidebarProfile variant={variant} expanded={expanded} onClose={closeDrawer} />
      </aside>

      <MobileSidebar variant={variant} open={drawerOpen} onClose={closeDrawer} />
      {standaloneMobile && mobileOpen === undefined && <MobileNavButton />}
    </>
  );
}
