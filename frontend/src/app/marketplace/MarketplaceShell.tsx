"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, FolderKanban, Heart, LayoutDashboard, ShoppingBag, Terminal, Home, Store } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/design-system/cn";

const links = [
  { label: "Home", href: "/", icon: Home },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "Saved projects", href: "/account/saved", icon: Heart },
  { label: "My purchases", href: "/account/orders", icon: ShoppingBag },
  { label: "Build workspace", href: "/build", icon: FolderKanban },
  { label: "Code playground", href: "/playground", icon: Terminal },
];

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Guest";
  const email = user?.email || "Sign in for purchases";

  return (
    <div className="mx-auto flex w-full max-w-[1440px] items-start gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <aside className="hidden w-60 shrink-0 xl:block">
        <nav aria-label="Marketplace navigation" className="sticky top-5 space-y-1 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 shadow-xl shadow-black/10">
          <div className="mb-3 flex items-center gap-2 border-b border-white/[0.07] px-2 pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Code2 size={18} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-white">Marketplace</span><span className="block text-[11px] text-[#7A8199]">Explore and manage projects</span></span>
          </div>
          {links.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || (href === "/marketplace" && pathname.startsWith("/marketplace/")) || (href === "/account/orders" && pathname.startsWith("/account/orders"));
            return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-[#7559E8]/15 font-semibold text-white ring-1 ring-[#7559E8]/20" : "text-[#B7BDD0] hover:bg-white/[0.05] hover:text-white")}><Icon size={16} className={active ? "text-[#A78BFA]" : "text-[#7A8199]"} />{label}</Link>;
          })}
          <div className="mt-4 border-t border-white/[0.07] pt-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.035] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-sm font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{displayName}</span><span className="block truncate text-[11px] text-[#7A8199]">{email}</span></span>
            </div>
            {!isAuthenticated && <Link href="/login" className="mt-2 block rounded-lg bg-[#7559E8] px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-[#8B70FF]">Sign in</Link>}
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <nav aria-label="Marketplace quick navigation" className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
          {links.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition", (pathname === href || (href === "/marketplace" && pathname.startsWith("/marketplace/"))) ? "border-[#7559E8]/40 bg-[#7559E8]/15 text-white" : "border-white/[0.08] bg-white/[0.025] text-[#B7BDD0] hover:bg-white/[0.06]")}><Icon size={14} />{label}</Link>)}
        </nav>
        {children}
      </div>
    </div>
  );
}
