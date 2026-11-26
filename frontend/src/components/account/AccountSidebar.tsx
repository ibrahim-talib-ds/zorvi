"use client";

// components/account/AccountSidebar.tsx - v15
// Same export + props contract (AccountSidebar, collapsed/onToggle/mobileOpen/
// onMobileClose) so account/layout.tsx keeps working untouched.
// NEW: drag-to-resize desktop edge (mouse + touch), persisted width,
// double-click edge or chevron to collapse, live "Saved" count badge
// (reads IBRANT_SAVED_V1 - the same key the marketplace hearts write).

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid, GraduationCap, Heart, ShoppingBag, Code2, BookOpen,
  Sparkles, ArrowLeft, LogOut, X, ChevronLeft, Terminal
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/design-system/cn";

const W_KEY = "IBRANT_ACCOUNT_SIDEBAR_W";
const SAVED_KEY = "IBRANT_SAVED_V1";
const MIN_W = 64;
const MAX_W = 360;

export function AccountSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [width, setWidth] = useState(256);
  const [dragging, setDragging] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const asideRef = useRef<HTMLElement | null>(null);
  const wRef = useRef(256);

  useEffect(() => {
    try {
      const w = Number(localStorage.getItem(W_KEY));
      if (w >= MIN_W && w <= MAX_W) { setWidth(w); wRef.current = w; }
    } catch { /* ignore */ }
  }, []);

  // live saved count: storage event (cross-tab) + light polling (same tab)
  useEffect(() => {
    const read = () => {
      try {
        const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
        setSavedCount(v && typeof v === "object" ? Object.keys(v).length : 0);
      } catch { setSavedCount(0); }
    };
    read();
    window.addEventListener("storage", read);
    const iv = window.setInterval(read, 1500);
    return () => { window.removeEventListener("storage", read); window.clearInterval(iv); };
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    if (window.innerWidth < 768) return;
    e.preventDefault();
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      const w = Math.min(MAX_W, Math.max(MIN_W, Math.round(ev.clientX - left)));
      wRef.current = w;
      setWidth(w);
    };
    const up = () => {
      setDragging(false);
      try { localStorage.setItem(W_KEY, String(wRef.current)); } catch { /* ignore */ }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const links = [
    { group: "Overview", items: [
      { href: "/account", label: "Dashboard", icon: LayoutGrid },
      { href: "/account/courses", label: "My Courses", icon: GraduationCap },
      { href: "/account/saved", label: "Saved Projects", icon: Heart, badge: savedCount },
      { href: "/account/orders", label: "My Purchases", icon: ShoppingBag },
    ]},
    { group: "Explore", items: [
      { href: "/marketplace", label: "Marketplace", icon: Code2 },
      { href: "/courses", label: "Academy", icon: BookOpen },
      { href: "/build", label: "Build Workspace", icon: Terminal },
      { href: "/playground", label: "Code Playground", icon: Code2 },
      { href: "/pricing", label: "Pricing", icon: Sparkles },
    ]},
  ];

  const handleLogout = () => {
    if (typeof logout === "function") logout();
    router.push("/");
  };

  const narrow = collapsed || width < 132;
  const effWidth = collapsed ? 72 : width;

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4">
        <Link href="/account" className="flex items-center gap-2 overflow-hidden">
          {narrow ? (
            <span className="font-display text-xl font-extrabold tracking-tight text-[#7559E8]">Z</span>
          ) : (
            <span className="whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-white">
              IBRANT <span className="text-[#7559E8]">· Learn · Build · Grow</span>
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden text-[#7A8199] transition hover:text-white md:flex"
        >
          <ChevronLeft className={cn("transition-transform", collapsed && "rotate-180")} size={18} />
        </button>
        <button onClick={onMobileClose} className="text-[#7A8199] hover:text-white md:hidden">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {links.map((group) => (
          <div key={group.group}>
            {!narrow && (
              <h4 className="mb-2 whitespace-nowrap px-3 font-mono text-xs uppercase tracking-wider text-[#7A8199]">
                {group.group}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={narrow ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                      narrow && "justify-center px-2",
                      isActive ? "bg-[#7559E8]/10 text-[#A78BFA]" : "text-[#B7BDD0] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={18} className={cn("shrink-0", isActive ? "text-[#A78BFA]" : "text-[#7A8199]")} />
                    {!narrow && <span className="whitespace-nowrap">{item.label}</span>}
                    {!narrow && typeof item.badge === "number" && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-[#F05D70]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#F05D70]">
                        {item.badge}
                      </span>
                    )}
                    {narrow && typeof item.badge === "number" && item.badge > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F05D70]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/5 p-3">
        <div className={cn("flex items-center gap-3 rounded-lg bg-white/5 px-2 py-2", narrow && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-sm font-bold text-white">
            {(user?.full_name || "L").charAt(0).toUpperCase()}
          </span>
          {!narrow && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.full_name || "Learner"}</p>
              <p className="truncate text-xs text-[#7A8199]">{user?.email}</p>
            </div>
          )}
        </div>
        <Link href="/" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#B7BDD0] transition hover:bg-white/5 hover:text-white", narrow && "justify-center px-2")}>
          <ArrowLeft size={18} className="shrink-0" /> {!narrow && "Back to Site"}
        </Link>
        <button onClick={handleLogout} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#F05D70] transition hover:bg-[#F05D70]/10", narrow && "justify-center px-2")}>
          <LogOut size={18} className="shrink-0" /> {!narrow && "Log Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - resizable */}
      <aside
        ref={asideRef}
        style={{ width: effWidth, transition: dragging ? "none" : undefined }}
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-white/5 bg-[#0B0F1D] transition-all duration-200 sticky top-0 h-screen z-40 md:flex",
          dragging && "select-none"
        )}
      >
        {sidebarContent}
        <div
          onPointerDown={startDrag}
          onDoubleClick={onToggle}
          title="Drag to resize · double-click to collapse"
          style={{ touchAction: "none" }}
          className={cn(
            "absolute right-0 top-0 z-20 hidden h-full w-1.5 cursor-ew-resize items-center justify-center transition hover:bg-[#7559E8]/30 md:flex",
            dragging && "bg-[#7559E8]/40"
          )}
        >
          <span className="h-10 w-0.5 rounded-full bg-white/20" />
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-[#0B0F1D] transition-transform duration-300 md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        {sidebarContent}
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onMobileClose} />}
    </>
  );
}
