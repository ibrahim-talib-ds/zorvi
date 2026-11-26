"use client";

// src/components/navigation/AppShell.tsx
// The authenticated application shell: ONE fixed header (72px) + ONE sidebar
// (AppSidebarCore, same component for student/admin) + ONE main area.
// Z-order: header z-30 < sidebar z-40 < backdrop z-50 < drawer z-[60], so no
// overlapping controls. Content offset uses a single CSS variable (--sb-w) -
// no hardcoded duplicate offsets anywhere.

import type { CSSProperties, ReactNode } from "react";
import { SIDEBAR_W } from "./navigation.config";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { AppSidebarCore } from "./AppSidebar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { SidebarVariant } from "./navigation.types";

export function AppShell({
  variant = "student",
  children,
}: {
  variant?: SidebarVariant;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Shell variant={variant}>{children}</Shell>
    </SidebarProvider>
  );
}

function Shell({ variant, children }: { variant: SidebarVariant; children: ReactNode }) {
  const { expanded, openMobile, desktopWidth } = useSidebar();
  const sbVar = { "--sb-w": `${expanded ? desktopWidth : SIDEBAR_W.collapsed}px` } as CSSProperties;

  return (
    <div style={sbVar} className="flex min-h-screen flex-col bg-bg-deep text-text-primary">
      <Header onMenuClick={openMobile} />

      <AppSidebarCore variant={variant} standaloneMobile={false} />

      <main className="flex-1 pt-[72px] transition-[padding] duration-200 md:pl-[var(--sb-w)] motion-reduce:transition-none">
        {children}
      </main>

      <div className="mt-auto md:pl-[var(--sb-w)]">
        <Footer />
      </div>
    </div>
  );
}
