"use client";

// src/components/navigation/SidebarProvider.tsx
// One shared state provider for the desktop rail AND the mobile drawer.
// - Expanded/collapsed preference persists in localStorage (ibrant_NAV_SIDEBAR)
// - Hydration-safe: initial render is identical on server and client; the
//   stored preference is applied in an effect after mount.
// - Reads the saved-projects count ONCE per 1.5s tick (no repeated reads per item).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  NAV_STORAGE_KEY,
  SAVED_KEY,
  SIDEBAR_MIN_W,
  SIDEBAR_MAX_W,
  SIDEBAR_W,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "./navigation.config";
import type { SidebarContextValue } from "./navigation.types";

const SidebarCtx = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpandedState] = useState(true);
  const [desktopWidth, setDesktopWidthState] = useState<number>(SIDEBAR_W.expanded);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // restore stored preference once, after mount (never during hydration)
  useEffect(() => {
    try {
      const v = localStorage.getItem(NAV_STORAGE_KEY);
      if (v === "collapsed") setExpandedState(false);
      else if (v === "expanded") setExpandedState(true);

      const savedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
      if (Number.isFinite(savedWidth) && savedWidth > 0) {
        setDesktopWidthState(
          Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, savedWidth))
        );
      }
    } catch { /* private mode etc. - keep default */ }
  }, []);

  const setExpanded = (value: boolean) => {
    setExpandedState(value);
    try { localStorage.setItem(NAV_STORAGE_KEY, value ? "expanded" : "collapsed"); } catch { /* ignore */ }
  };

  const setDesktopWidth = (width: number) => {
    const next = Math.min(
      SIDEBAR_MAX_W,
      Math.max(SIDEBAR_MIN_W, Math.round(width))
    );

    setDesktopWidthState(next);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(next));
    } catch {
      // Keep the current width for this session if storage is unavailable.
    }
  };

  const toggleExpanded = () => setExpanded(!expanded);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  // live "Saved" badge - storage event (cross-tab) + light polling (same tab)
  useEffect(() => {
    const read = () => {
      try {
        const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
        const n = raw && typeof raw === "object" ? Object.keys(raw).length : 0;
        setSavedCount((prev) => (prev === n ? prev : n));
      } catch { setSavedCount((prev) => (prev === 0 ? prev : 0)); }
    };
    read();
    window.addEventListener("storage", read);
    const iv = window.setInterval(read, 1500);
    return () => { window.removeEventListener("storage", read); window.clearInterval(iv); };
  }, []);

  return (
    <SidebarCtx.Provider
      value={{ expanded, mobileOpen, savedCount, desktopWidth, setDesktopWidth, toggleExpanded, setExpanded, openMobile, closeMobile }}
    >
      {children}
    </SidebarCtx.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used inside a SidebarProvider - render AppSidebar or AppShell at the top of the layout");
  return ctx;
}
