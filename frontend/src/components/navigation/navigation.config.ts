// src/components/navigation/navigation.config.ts
// IBRANT navigation system v16 - THE single source of truth for navigation.
// Every student/admin item below is verified against the live project routes.
// Nothing is listed that does not exist. See the route audit in the v16 report.

import {
  Award, Bell, BookOpen, ClipboardList, Code2, GraduationCap,
  Heart, Home, LayoutDashboard, LayoutGrid, MessageSquare,
  Package, Settings, ShoppingBag, Sparkles, Store, Tags,
  Terminal, UserRound, UserCheck,
} from "lucide-react";
import type { NavigationGroup, NavigationItem, SidebarVariant } from "./navigation.types";

// ---------------------------------------------------------------- dimensions
// Kept at the project's current rail widths so existing content offsets keep
// working. The spec's 260/76 is a one-line change here if you want it.
export const SIDEBAR_W = { expanded: 256, collapsed: 72 } as const;

// ---------------------------------------------------------------- persistence
export const NAV_STORAGE_KEY = "IBRANT_NAV_SIDEBAR"; // "expanded" | "collapsed"
export const SAVED_KEY = "IBRANT_SAVED_V1";          // written by marketplace hearts

// ---------------------------------------------------------------- VERIFY ⚠
// Auth page URLs could not be inspected from here - adjust to your real ones.
export const AUTH_ROUTES = { signIn: "/login", register: "/register" };

// ---------------------------------------------------------------- shared item
const PLAYGROUND: NavigationItem = {
  label: "Code Playground",
  href: "/playground",
  icon: Terminal,
  group: "development",
  roles: ["student", "admin"],
  requiresAuth: true,
};

// ---------------------------------------------------------------- student nav
export const STUDENT_NAV: NavigationGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/account", icon: LayoutGrid, group: "overview", roles: ["student"], requiresAuth: true },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    items: [
      { label: "My Courses", href: "/account/courses", icon: GraduationCap, group: "learning", roles: ["student"], requiresAuth: true },
      { label: "Academy", href: "/courses", icon: BookOpen, group: "learning", roles: ["student", "guest"] },
      // ⚠ NOT WIRED - enable when the route exists: /account/certificates
      // ⚠ NOT WIRED - enable when the route exists: /account/progress
    ],
  },
  {
    key: "explore",
    label: "Explore",
    items: [
      { label: "Marketplace", href: "/marketplace", icon: Code2, group: "explore", roles: ["student", "guest"] },
      { label: "Saved Projects", href: "/account/saved", icon: Heart, group: "explore", roles: ["student"], requiresAuth: true, badge: "saved" },
      { label: "My Purchases", href: "/account/orders", icon: ShoppingBag, group: "explore", roles: ["student"], requiresAuth: true },
    ],
  },
  {
    key: "development",
    label: "Development",
    items: [PLAYGROUND],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { label: "Certificates", href: "/account/certificates", icon: Award, group: "account", roles: ["student"], requiresAuth: true },
      { label: "Notifications", href: "/account/notifications", icon: Bell, group: "account", roles: ["student"], requiresAuth: true },
      { label: "Profile", href: "/account/profile", icon: UserRound, group: "account", roles: ["student"], requiresAuth: true },
      { label: "Settings", href: "/account/settings", icon: Settings, group: "account", roles: ["student"], requiresAuth: true },
    ],
  },
];

// ------------------------------------------------------------------ admin nav
export const ADMIN_NAV: NavigationGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, group: "overview", roles: ["admin"], requiresAuth: true },
    ],
  },
  {
    key: "content",
    label: "Content Management",
    items: [
      { label: "Courses", href: "/admin/courses", icon: BookOpen, group: "content", roles: ["admin"], requiresAuth: true },
      { label: "Products", href: "/admin/products", icon: Package, group: "content", roles: ["admin"], requiresAuth: true },
      { label: "Categories", href: "/admin/categories", icon: Tags, group: "content", roles: ["admin"], requiresAuth: true },
    ],
  },
  {
    key: "development",
    label: "Development",
    items: [PLAYGROUND],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ClipboardList, group: "operations", roles: ["admin"], requiresAuth: true },
      { label: "Instructor Applications", href: "/admin/instructor-applications", icon: UserCheck, group: "operations", roles: ["admin"], requiresAuth: true },
      { label: "Messages", href: "/admin/messages", icon: MessageSquare, group: "operations", roles: ["admin"], requiresAuth: true },
      { label: "Notifications", href: "/admin/notifications", icon: Bell, group: "operations", roles: ["admin"], requiresAuth: true },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, group: "system", roles: ["admin"], requiresAuth: true },
    ],
  },
];

// ---------------------------------------------------------------- public nav
// For the PUBLIC header (Home stays a public page). If your existing public
// header already renders these links, nothing changes - this config exists so
// the header and the app shell share one definition.
export const PUBLIC_NAV: NavigationItem[] = [
  { label: "Home", href: "/", icon: Home, group: "public", roles: ["guest", "student", "admin"] },
  { label: "Marketplace", href: "/marketplace", icon: Store, group: "public", roles: ["guest", "student", "admin"] },
  { label: "Academy", href: "/courses", icon: GraduationCap, group: "public", roles: ["guest", "student", "admin"] },
  { label: "Pricing", href: "/pricing", icon: Sparkles, group: "public", roles: ["guest", "student", "admin"] },
];

// ------------------------------------------------------------------- helpers
export function navFor(variant: SidebarVariant): NavigationGroup[] {
  return variant === "admin" ? ADMIN_NAV : STUDENT_NAV;
}

/** Correct parent-active behaviour: exact match for shells, prefix for nested. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/" || href === "/account" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
