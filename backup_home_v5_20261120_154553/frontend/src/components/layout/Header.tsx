"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu, X, User as UserIcon, LogOut, Package, GraduationCap, Shield,
  ChevronDown, Settings, LayoutDashboard, Bell, Globe, Check,
} from "lucide-react";
import { cn } from "@/lib/design-system/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { locales } from "@/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Tr } from "@/components/i18n/Tr";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const BASE_NAV = [
  { href: "/", label: "nav.home" },
  { href: "/marketplace", label: "nav.marketplace" },
  { href: "/courses", label: "nav.academy" },
  { href: "/pricing", label: "nav.pricing" },
  { href: "/about", label: "nav.about" },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  href: string | null;
  unread: boolean;
  readAt: string | null;
}

export function Header() {
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fetch notifications
  useEffect(() => {
    if (!user || !token || !isAuthenticated) {
      setNotifications([]);
      return;
    }
    (async () => {
      try {
        const { fetchMyNotifications } = await import("@/lib/api/notifications");
        const real = await fetchMyNotifications(token);
        const notes: Notification[] = real.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleString(),
          href: n.href,
          unread: n.read_at === null,
          readAt: n.read_at,
        }));
        setNotifications(notes);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user, token, isAuthenticated]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    setDropdownOpen(false);
    router.push("/");
  };

  const isAdmin = user?.roles?.some((r) => r.name === "admin" || r.name === "super_admin") ?? false;
  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const activeLang = locales.find((l) => l.code === lang) || locales[0];
  const visibleNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));
  const unreadCount = visibleNotifications.filter((n) => n.unread).length;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const navLinks = isAuthenticated
    ? [{ href: isAdmin ? "/admin" : "/account", label: "nav.dashboard" }, ...BASE_NAV.slice(1)]
    : BASE_NAV;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          "bg-gradient-to-b from-bg-deep via-bg-deep to-bg-deep",
          "border-b border-white/5",
          scrolled ? "h-16 shadow-lg shadow-black/30" : "h-16"
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 group">
            <img
              src="/images/logo/ibrant-mark.png"
              alt="IBRANT"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#8B70FF]">
              IBRANT
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {navLinks.map((l) => {
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative text-[15px] font-medium transition-colors hover:text-text-primary whitespace-nowrap px-3 py-2 rounded-md hover:bg-bg-border/40",
                    isActive ? "text-text-primary" : "text-text-secondary"
                  )}
                >
                  <Tr k={l.label} />
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-[#7559E8] to-[#A78BFA] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            {/* Language */}
            <div className="relative" ref={langRef} data-no-translate>
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition"
                aria-label={t("nav.menu")}
              >
                <Globe size={16} />
                <span className="hidden md:inline text-xs">
                  {activeLang.flag} {activeLang.code.toUpperCase()}
                </span>
                <ChevronDown size={12} className={cn("transition-transform hidden md:inline", langOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-52 rounded-lg border border-white/10 bg-bg-surface shadow-2xl shadow-black/50 overflow-hidden z-50"
                  >
                    <div className="max-h-80 overflow-y-auto">
                      {locales.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code);
                            setLangOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition",
                            lang === l.code
                              ? "bg-[#7559E8]/15 text-text-primary"
                              : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                          )}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span className="flex-1">{l.name}</span>
                          {lang === l.code && <Check size={14} className="text-[#8B70FF]" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <ThemeToggle compact />

            {isLoading ? (
              <div className="w-20 h-9 rounded-lg bg-white/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                {/* Admin pill */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-[#F5A623]/40 bg-[#F5A623]/10 px-3 py-1.5 text-sm font-semibold text-[#F5A623] hover:bg-[#F5A623]/20 transition"
                  >
                    <Shield size={14} /> <Tr k="nav.admin" />
                  </Link>
                )}

                {/* Notification bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/5 transition"
                    aria-label={t("nav.notifications")}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F05D70] text-[9px] font-bold text-text-primary flex items-center justify-center border border-bg-deep">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-80 max-w-[calc(100vw-32px)] rounded-xl border border-white/10 bg-bg-surface shadow-2xl shadow-black/50 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-text-primary"><Tr k="nav.notifications" /></h3>
                          {unreadCount > 0 && (
                            <span className="text-xs text-[#A78BFA]">
                              {unreadCount} <Tr k="nav.new_suffix" />
                            </span>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {visibleNotifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell size={24} className="text-text-muted mx-auto mb-2" />
                              <p className="text-sm text-text-secondary"><Tr k="nav.no_notifications" /></p>
                            </div>
                          ) : (
                            visibleNotifications.map((n) => (
                              <div
                                key={n.id}
                                className="group flex items-start gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition"
                              >
                                <Link
                                  href={n.href || "#"}
                                  onClick={() => setNotifOpen(false)}
                                  className="flex items-start gap-2 flex-1 min-w-0"
                                >
                                  <div className={"mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 " + (n.unread ? "bg-[#7559E8]" : "bg-transparent")} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{n.title}</p>
                                    <p className="text-xs text-text-secondary truncate mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-text-muted mt-1">{n.time}</p>
                                  </div>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDismiss(n.id);
                                  }}
                                  className="flex-shrink-0 p-1 rounded hover:bg-[#F05D70]/20 text-text-muted hover:text-[#F05D70] transition opacity-0 group-hover:opacity-100"
                                  title={t("nav.dismiss")}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 pl-1.5 pr-2 py-1.5 hover:bg-white/10 transition"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#7559E8]/30 border border-[#7559E8]/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#A78BFA] bg-[#7559E8]/20">
                        {user.full_name ? user.full_name.slice(0, 2).toUpperCase() : "U"}
                      </div>
                    </div>
                    <span className="hidden xl:inline text-sm font-medium text-text-primary max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown size={12} className={cn("text-text-muted transition-transform", dropdownOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-bg-surface shadow-2xl shadow-black/50 overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-white/5">
                          <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                          <p className="text-xs text-text-muted truncate">{user.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link href="/account" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#A78BFA] hover:bg-[#7559E8]/15 hover:text-text-primary transition">
                            <LayoutDashboard size={16} /> <Tr k="nav.my_dashboard" />
                          </Link>
                          <div className="my-1 border-t border-white/5" />
                          <Link href="/account/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition">
                            <UserIcon size={16} /> <Tr k="nav.profile" />
                          </Link>
                          <Link href="/account/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition">
                            <Settings size={16} /> <Tr k="nav.settings" />
                          </Link>
                          <Link href="/account/orders" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition">
                            <Package size={16} /> <Tr k="nav.my_orders" />
                          </Link>
                          <Link href="/courses" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition">
                            <GraduationCap size={16} /> <Tr k="nav.browse_courses" />
                          </Link>
                        </div>
                        <div className="p-1.5 border-t border-white/5">
                          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#F05D70] hover:bg-[#F05D70]/10 transition">
                            <LogOut size={16} /> <Tr k="nav.logout" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="inline-flex items-center rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition">
                  <Tr k="nav.login" />
                </Link>
                <Link href="/register" className="rounded-md bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-text-primary hover:brightness-110 transition whitespace-nowrap">
                  <Tr k="nav.get_started" />
                </Link>
              </>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden text-text-primary p-1.5 rounded-md hover:bg-white/5 transition"
              aria-label={t("nav.toggle_menu")}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <>
            {/* Dark backdrop that dims the page */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Compact side panel — slides in from the right */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-20 right-3 w-[300px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-110px)] bg-bg-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 lg:hidden flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                <span className="font-display text-lg font-extrabold text-text-primary"><Tr k="nav.menu" /></span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition"
                  aria-label={t("nav.close_menu")}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 overflow-y-auto py-2">
                {navLinks.map((l) => {
                  const isActive = pathname === l.href;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={"block px-4 py-3 text-sm font-medium transition border-l-2 " + (
                        isActive
                          ? "text-text-primary bg-[#7559E8]/10 border-[#7559E8]"
                          : "text-text-secondary hover:text-text-primary hover:bg-white/5 border-transparent"
                      )}
                    >
                      <Tr k={l.label} />
                    </Link>
                  );
                })}
              </nav>

              {/* Language grid */}
              <div className="grid grid-cols-2 gap-1.5 p-2.5 border-t border-white/5" data-no-translate>
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-2 text-xs transition",
                      lang === l.code
                        ? "bg-[#7559E8]/15 text-text-primary"
                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                    )}
                  >
                    <span>{l.flag}</span>
                    <span className="truncate">{l.name}</span>
                  </button>
                ))}
              </div>

              {/* Theme */}
              <div className="px-2.5 pt-2.5 border-t border-bg-border/60">
                <ThemeToggle />
              </div>

              {/* Auth Section */}
              <div className="border-t border-white/5 p-2.5 space-y-1.5 flex-shrink-0">
                {isAuthenticated && user ? (
                  <>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/30 px-3 py-2.5 text-sm font-semibold text-[#F5A623] hover:bg-[#F5A623]/20 transition"
                      >
                        <Shield size={14} /> <Tr k="nav.admin_panel" />
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-white/10 transition"
                    >
                      <UserIcon size={14} /> <Tr k="nav.my_profile" />
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-white/10 transition"
                    >
                      <Package size={14} /> <Tr k="nav.my_orders" />
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setOpen(false); }}
                      className="w-full flex items-center gap-2 rounded-lg bg-[#F05D70]/10 border border-[#F05D70]/20 px-3 py-2.5 text-sm font-medium text-[#F05D70] hover:bg-[#F05D70]/20 transition"
                    >
                      <LogOut size={14} /> <Tr k="nav.logout" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="block text-center rounded-lg bg-white/5 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-white/10 transition"
                    >
                      <Tr k="nav.login" />
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="block text-center rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2.5 text-sm font-semibold text-text-primary hover:brightness-110 transition"
                    >
                      <Tr k="nav.get_started" />
                    </Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
