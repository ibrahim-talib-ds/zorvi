"use client";

// src/components/navigation/SidebarProfile.tsx
// Bottom profile block: avatar (initials fallback from REAL user data), name,
// role label, account dropdown. Real routes only: /account, /account/orders,
// Back to Website (/), Sign Out (existing auth mechanism).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, LogOut, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { SidebarVariant } from "./navigation.types";

function initialsOf(name?: string, email?: string): string {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).slice(0, 2);
    const out = parts.map((p) => p[0]?.toUpperCase() || "").join("");
    if (out) return out;
  }
  const e = (email || "").trim();
  return e ? e[0].toUpperCase() : "U";
}

export function SidebarProfile({
  variant,
  expanded,
  onClose,
}: {
  variant: SidebarVariant;
  expanded?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth() as {
    user?: { full_name?: string; email?: string; avatar_url?: string } | null;
    logout?: () => void;
  };
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const name = user?.full_name || user?.email || "My Account";
  const roleLabel = variant === "admin" ? "Administrator" : "Student";

  const go = (href: string) => {
    setOpen(false);
    onClose?.();
    router.push(href);
  };
  const signOut = () => {
    setOpen(false);
    onClose?.();
    if (typeof logout === "function") logout();
    router.push("/");
  };

  const itemCls =
    "flex w-full min-h-[44px] items-center gap-2.5 px-4 text-sm text-[#D7DDF3] transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none";

  return (
    <div ref={rootRef} className="relative border-t border-white/5 p-3">
      {open && (
        <div role="menu" aria-label="Account menu" className="absolute bottom-full left-0 right-0 z-[70] mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#12172E] p-1 shadow-2xl">
          {variant === "student" ? (
            <>
              <button type="button" role="menuitem" onClick={() => go("/account")} className={itemCls}>
                <User size={15} aria-hidden="true" /> My Profile
              </button>
              <button type="button" role="menuitem" onClick={() => go("/account/orders")} className={itemCls}>
                <ShoppingBag size={15} aria-hidden="true" /> My Purchases
              </button>
            </>
          ) : (
            <button type="button" role="menuitem" onClick={() => go("/")} className={itemCls}>
              <Globe size={15} aria-hidden="true" /> Back to Website
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className={`border-t border-white/5 font-medium text-[#FF7A8A] hover:bg-[#FF7A8A]/10 focus-visible:bg-[#FF7A8A]/10 ${itemCls}`}
          >
            <LogOut size={15} aria-hidden="true" /> Sign Out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu — ${name}`}
        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none ${
          expanded ? "" : "justify-center"
        }`}
      >
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-sm font-bold text-white"
          >
            {initialsOf(user?.full_name, user?.email)}
          </span>
        )}
        {expanded && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{name}</span>
            <span className="block truncate text-[11px] text-[#929CBD]">{roleLabel}</span>
          </span>
        )}
        {expanded && (
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`shrink-0 text-[#929CBD] transition motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
    </div>
  );
}
