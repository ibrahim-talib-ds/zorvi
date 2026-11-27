"use client";

import { cn } from "@/lib/design-system/cn";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tr } from "@/components/i18n/Tr";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/lib/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";

/* ------------------------------------------------------------------ */
/* Navigation + route metadata                                          */
/* ------------------------------------------------------------------ */

type NavItem = { href: string; k: string; icon: string; exact?: boolean };
type NavGroup = { labelKey: string; items: NavItem[] };

const USER_NAV: NavGroup[] = [
  {
    labelKey: "dashboard.group.manage",
    items: [
      { href: "/account", k: "dashboard.nav.dashboard", icon: "grid", exact: true },
      { href: "/account/courses", k: "dashboard.nav.myCourses", icon: "book" },
      { href: "/account/orders", k: "dashboard.nav.orders", icon: "cart" },
      { href: "/account/certificates", k: "dashboard.nav.certificates", icon: "award" },
    ],
  },
  {
    labelKey: "dashboard.group.account",
    items: [
      { href: "/account/notifications", k: "dashboard.nav.notifications", icon: "bell" },
      { href: "/account/profile", k: "dashboard.nav.profile", icon: "user" },
      { href: "/account/settings", k: "dashboard.nav.settings", icon: "cog" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    labelKey: "dashboard.group.overview",
    items: [
      { href: "/admin", k: "dashboard.nav.dashboard", icon: "grid", exact: true },
    ],
  },
  {
    labelKey: "dashboard.group.manage",
    items: [
      { href: "/admin/products", k: "dashboard.nav.products", icon: "box" },
      { href: "/admin/orders", k: "dashboard.nav.orders", icon: "cart" },
      { href: "/admin/categories", k: "dashboard.nav.categories", icon: "layers" },
      { href: "/admin/courses", k: "dashboard.nav.courses", icon: "book" },
      { href: "/admin/instructor-applications", k: "dashboard.nav.instructorApps", icon: "clipboard" },
      { href: "/admin/notifications", k: "dashboard.nav.notifications", icon: "bell" },
      { href: "/admin/messages", k: "dashboard.nav.messages", icon: "inbox" },
    ],
  },
  {
    labelKey: "dashboard.group.system",
    items: [
      { href: "/admin/settings", k: "dashboard.nav.settings", icon: "cog" },
    ],
  },
];

const USER_BASE = "/account";
const ADMIN_BASE = "/admin";

/* ------------------------------------------------------------------ */
/* Inline icons (stroke-based, no icon library dependency)              */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<string, string> = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  book: "M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zm0 0a2 2 0 012-2h13M8 7h7",
  cart: "M3 4h2l2.3 11.2a1.5 1.5 0 001.5 1.2h8.4a1.5 1.5 0 001.5-1.2L20.5 8H6M10 20.5a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z",
  award: "M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 13.5L7 21l5-3 5 3-1.5-7.5",
  bell: "M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h11zm-3 0v1a3 3 0 11-6 0v-1",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0",
  cog: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  plus: "M12 5v14M5 12h14",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
  search: "M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z",
  chevron: "M9 5l7 7-7 7",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  chevronsLeft: "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  chevronsRight: "M13 17l5-5-5-5M6 17l5-5-5-5",
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "h-4 w-4 shrink-0"}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name] || ICON_PATHS.grid} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function itemClasses(active: boolean, admin: boolean): string {
  const base =
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40";
  if (active) {
    if (admin) {
      return (
        base + " border border-[#A78BFA]/25 bg-[#A78BFA]/10 font-semibold text-[#A78BFA]"
      );
    }
    return base + " bg-bg-elevated font-semibold text-text-primary";
  }
  return base + " text-text-secondary hover:bg-bg-elevated hover:text-text-primary";
}

/* ------------------------------------------------------------------ */
/* Shell                                                                */
/* ------------------------------------------------------------------ */

export function DashboardShell({
  children,
  variant = "user",
}: {
  children: React.ReactNode;
  variant?: "user" | "admin";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Auto-collapse on small screens (tablet/mobile)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  }, []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pIndex, setPIndex] = useState(0);

  const admin = variant === "admin";
  const nav = admin ? ADMIN_NAV : USER_NAV;
  const base = admin ? ADMIN_BASE : USER_BASE;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Close overlays on navigation.
  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  // Global shortcuts: Ctrl/Cmd+K toggles the palette, Esc closes overlays.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll while the palette is open.
  useEffect(() => {
    if (!paletteOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paletteOpen]);

  // Breadcrumb: current section (most specific matching route).
  const current = useMemo(() => {
    const all = nav.flatMap((g) => g.items);
    const matches = all.filter((it) => isActive(pathname, it));
    return matches.sort((a, b) => b.href.length - a.href.length)[0];
  }, [pathname, nav]);

  // Command palette items: nav of this area + create-route extras (admin).
  const paletteItems: { href: string; k: string; icon: string }[] = useMemo(() => {
    const items = nav.flatMap((g) => g.items);
    const extras: { href: string; k: string; icon: string }[] = admin
      ? [
          { href: "/admin/products/new", k: "dashboard.nav.newProduct", icon: "plus" },
          { href: "/admin/courses/new", k: "dashboard.nav.newCourse", icon: "plus" },
        ]
      : [];
    const all = [...items, ...extras.filter((x) => !items.some((i) => i.href === x.href))];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (it) =>
        it.href.toLowerCase().includes(q) || it.k.toLowerCase().includes(q)
    );
  }, [nav, query, admin]);

  useEffect(() => {
    setPIndex(0);
  }, [query, paletteOpen]);

  const go = (href: string) => {
    setPaletteOpen(false);
    setQuery("");
    router.push(href);
  };

  const onPaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPIndex((i) => Math.min(i + 1, Math.max(paletteItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = paletteItems[pIndex];
      if (target) go(target.href);
    }
  };

  const Brand = ({ inDrawer }: { inDrawer?: boolean }) => (
    <Link
      href={base}
      className={
        "flex items-center gap-2 px-1 " + (inDrawer ? "mb-2" : "pb-2 md:justify-center lg:justify-start")
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo/ibrant-mark.svg"
        alt=""
        className="h-8 w-8 object-contain"
      />
      <span className="hidden min-w-0 whitespace-nowrap font-display text-lg font-extrabold tracking-tight lg:inline">
        <span className="text-[#8B5CF6]">ibr</span><span className="text-[#F2A900]">ant</span>
        {admin && <span className="text-[#7559E8]"> Admin</span>}
      </span>
    </Link>
  );

  const SidebarFooter = ({ inDrawer }: { inDrawer?: boolean }) => (
    <div
      className={
        "mt-auto space-y-1 " + (inDrawer ? "border-t border-bg-border pt-3" : "border-t border-bg-border pt-3")
      }
    >
      <div
        className={
          "flex items-center gap-2.5 rounded-lg bg-bg-elevated px-2 py-2 " +
          (inDrawer ? "" : "md:justify-center lg:justify-start")
        }
      >
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
          <Avatar name={user?.full_name} size={32} />
        </div>
        <div className={`hidden min-w-0 flex-1 ${isCollapsed ? "lg:hidden" : "lg:block"}`}>
          <p className="truncate text-sm font-medium text-text-primary">
            {user ? (user.full_name || "User") : "Guest"}
          </p>
          {user && <p className="truncate text-xs text-text-muted">{user.email}</p>}
        </div>
      </div>
      <Link
        href="/"
        className={
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary " +
          (inDrawer ? "" : "md:justify-center lg:justify-start")
        }
      >
        <Icon name="globe" />
        <span className={inDrawer ? "" : "hidden lg:inline"}>
          <Tr k="dashboard.nav.site" />
        </span>
      </Link>
      {user ? (
        <button
          type="button"
          onClick={handleLogout}
          className={
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#F05D70] transition-colors hover:bg-[#F05D70]/10 " +
            (inDrawer ? "" : "md:justify-center lg:justify-start")
          }
        >
          <Icon name="logout" />
          <span className={inDrawer ? "" : (isCollapsed ? "hidden" : "hidden lg:inline")}>
            <Tr k="dashboard.page.logout" />
          </span>
        </button>
      ) : (
        <Link
          href="/login"
          className={
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#8B70FF] transition-colors hover:bg-bg-elevated " +
            (inDrawer ? "" : "md:justify-center lg:justify-start")
          }
        >
          <Icon name="user" />
          <span className={inDrawer ? "" : (isCollapsed ? "hidden" : "hidden lg:inline")}>
            Log In
          </span>
        </Link>
      )}
    </div>
  );

  const navGroups = (
    <>
      {nav.map((group) => (
        <div key={group.labelKey}>
          <p className="hidden px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted lg:block">
            <Tr k={group.labelKey} />
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={itemClasses(active, admin) + " md:justify-center lg:justify-start"}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="hidden min-w-0 truncate lg:inline">
                      <Tr k={item.k} />
                    </span>
                    {active && (
                      <Icon
                        name="chevron"
                        className="ml-auto hidden h-3.5 w-3.5 opacity-60 lg:block"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );

  const drawerGroups = (
    <>
      {nav.map((group) => (
        <div key={group.labelKey}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            <Tr k={group.labelKey} />
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={itemClasses(active, admin)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="min-w-0 truncate">
                      <Tr k={item.k} />
                    </span>
                    {active && (
                      <Icon name="chevron" className="ml-auto h-3.5 w-3.5 opacity-60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-full">
      {/* Sidebar: icon rail on tablet (md), full on desktop (lg+) */}
      <aside className={cn(
        "fixed bottom-0 left-0 top-[72px] z-20 hidden flex-col overflow-y-auto border-r border-bg-border bg-bg-surface px-2 py-4 md:flex transition-all duration-300",
        isCollapsed ? "w-[68px] px-2" : "w-64 px-3"
      )}>
        <div className="flex items-center justify-between w-full mb-2">
          {!isCollapsed && <Brand />}
          {isCollapsed && <div className="w-full flex justify-center"><img src="/images/logo/ibrant-mark.svg" className="h-8 w-8 object-contain" alt="" /></div>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-full py-2 mb-4 rounded-lg bg-bg-elevated text-text-muted hover:text-text-primary transition-all"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={isCollapsed ? "chevronsRight" : "chevronsLeft"} />
            {!isCollapsed && <span className="ml-2 text-xs font-semibold">Collapse Sidebar</span>}
          </button>
        </div>
        <nav className="mt-3 space-y-5" aria-label={admin ? "Admin" : "Account"}>
          {navGroups}
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-bg-deep/70 backdrop-blur-sm"
          />
          <div className="absolute bottom-0 left-0 top-[72px] w-72 max-w-[85vw] overflow-y-auto border-r border-bg-border bg-bg-surface px-3 py-4">
            <div className="flex items-center justify-between">
              <Brand inDrawer />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              >
                <Icon name="x" />
              </button>
            </div>
            <nav className="mt-3 space-y-5" aria-label={admin ? "Admin" : "Account"}>
              {drawerGroups}
            </nav>
            <SidebarFooter inDrawer />
          </div>
        </div>
      )}

      {/* Command palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setPaletteOpen(false)}
            className="absolute inset-0 bg-bg-deep/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-bg-border bg-bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-bg-border px-4">
              <span className="text-text-muted">
                <Icon name="search" />
              </span>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onPaletteKeyDown}
                placeholder="Search"
                className="w-full bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <kbd className="hidden rounded border border-bg-border px-1.5 py-0.5 text-[10px] text-text-muted sm:inline">
                Esc
              </kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
              {paletteItems.map((it, i) => (
                <li key={it.href} role="option" aria-selected={i === pIndex}>
                  <button
                    type="button"
                    onClick={() => go(it.href)}
                    onMouseEnter={() => setPIndex(i)}
                    className={
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors " +
                      (i === pIndex
                        ? "bg-bg-elevated text-text-primary"
                        : "text-text-secondary")
                    }
                  >
                    <Icon name={it.icon} />
                    <span className="min-w-0 flex-1 truncate">
                      <Tr k={it.k} />
                    </span>
                    <span className="text-[11px] text-text-muted">{it.href}</span>
                  </button>
                </li>
              ))}
              {paletteItems.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-text-muted">
                  <Tr k="dashboard.search.pages" />
                </li>
              )}
            </ul>
            <div className="flex items-center justify-between border-t border-bg-border px-4 py-2 text-[11px] text-text-muted">
              <span>&#8593; &#8595; &#9166;</span>
              <span>Esc</span>
            </div>
          </div>
        </div>
      )}

      <main className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        isCollapsed ? "md:pl-[68px]" : "md:pl-64"
      )}>
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
