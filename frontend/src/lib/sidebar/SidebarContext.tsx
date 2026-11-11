"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SidebarType = "admin" | "account";

interface SidebarState {
  adminCollapsed: boolean;
  accountCollapsed: boolean;
  toggleAdmin: () => void;
  toggleAccount: () => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [accountCollapsed, setAccountCollapsed] = useState(false);

  useEffect(() => {
    const admin = typeof window !== "undefined" ? localStorage.getItem("zorvi_admin_sidebar_collapsed") : null;
    const account = typeof window !== "undefined" ? localStorage.getItem("zorvi_account_sidebar_collapsed") : null;
    if (admin === "true") setAdminCollapsed(true);
    if (account === "true") setAccountCollapsed(true);
  }, []);

  const toggleAdmin = () => {
    setAdminCollapsed((v) => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem("zorvi_admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  const toggleAccount = () => {
    setAccountCollapsed((v) => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem("zorvi_account_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ adminCollapsed, accountCollapsed, toggleAdmin, toggleAccount }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
