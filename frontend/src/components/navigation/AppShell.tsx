"use client";

// src/components/navigation/AppShell.tsx
// The authenticated application shell: ONE fixed header (h-16) + ONE sidebar
// (AppSidebarCore, same component for student/admin) + ONE main area.
// Z-order: header z-30 < sidebar z-40 < backdrop z-50 < drawer z-[60], so no
// overlapping controls. Content offset uses a single CSS variable (--sb-w) -
// no hardcoded duplicate offsets anywhere.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { SIDEBAR_W } from "./navigation.config";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { AppSidebarCore } from "./AppSidebar";
import { Footer } from "@/components/layout/Footer";
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
  const { user } = useAuth() as { user?: { full_name?: string; email?: string } | null };
  const sbVar = { "--sb-w": `${expanded ? desktopWidth : SIDEBAR_W.collapsed}px` } as CSSProperties;
  const homeHref = variant === "admin" ? "/admin" : "/account";

  return (
    <div style={sbVar} className="flex min-h-screen flex-col bg-bg-deep text-text-primary">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-[#0B0F1D]/95 px-4 backdrop-blur transition-[padding] duration-200 md:pl-[var(--sb-w)] motion-reduce:transition-none">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Open navigation"
          aria-controls="app-sidebar-nav"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] md:hidden motion-reduce:transition-none"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <Link href="/" className="font-display text-lg font-extrabold tracking-wide text-white">
          IBRANT
        </Link>
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[#7A8199] sm:inline">
          {variant === "admin" ? "Admin Console" : "Learning Platform"}
        </span>

        <div className="ml-auto flex items-center">
          <Link
            href={homeHref}
            className="flex h-9 max-w-[220px] items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-[#D7DDF3] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none"
          >
            <span className="truncate">
              {(user?.full_name || user?.email || "Account").slice(0, 24)}
            </span>
          </Link>
        </div>
      </header>

      <AppSidebarCore variant={variant} standaloneMobile={false} />

      <main className="flex-1 pt-16 transition-[padding] duration-200 md:pl-[var(--sb-w)] motion-reduce:transition-none">
        {children}
      </main>

      <div className="mt-auto md:pl-[var(--sb-w)]">
        <Footer />
      </div>
    </div>
  );
}
