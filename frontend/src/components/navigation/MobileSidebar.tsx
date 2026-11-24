"use client";

// src/components/navigation/MobileSidebar.tsx
// Proper off-canvas drawer for <768px: backdrop, slide-in panel, close button
// INSIDE the drawer (never covered), Escape to close, body scroll lock, focus
// restore, closes on route change, 200ms motion (reduced-motion respected).

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarProfile } from "./SidebarProfile";
import { useSidebar } from "./SidebarProvider";
import type { SidebarVariant } from "./navigation.types";

export function MobileSidebar({
  variant,
  open,
  onClose,
}: {
  variant: SidebarVariant;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // close when the route changes (ref keeps this effect stable)
  useEffect(() => {
    closeRef.current();
  }, [pathname]);

  // body lock + Escape + focus management
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Application navigation"
        className={`fixed inset-y-0 left-0 z-[60] flex w-[280px] max-w-[85vw] flex-col bg-[#0B0F1D] shadow-2xl transition-transform duration-200 md:hidden motion-reduce:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-2 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-[#929CBD] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <div className="pr-14">
          <SidebarHeader expanded showToggle={false} />
        </div>
        <SidebarNavigation variant={variant} expanded />
        <SidebarFooter variant={variant} expanded />
        <SidebarProfile variant={variant} expanded onClose={onClose} />
      </div>
    </>
  );
}

/** Floating opener for pages that do NOT pass a mobileOpen prop to AppSidebar. */
export function MobileNavButton() {
  const { openMobile } = useSidebar();
  return (
    <button
      type="button"
      onClick={openMobile}
      aria-label="Open navigation"
      aria-controls="app-sidebar-nav"
      className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0B0F1D]/90 text-white shadow-lg backdrop-blur transition hover:bg-[#0B0F1D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] md:hidden motion-reduce:transition-none"
    >
      <Menu size={20} aria-hidden="true" />
    </button>
  );
}
