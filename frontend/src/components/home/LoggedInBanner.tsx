"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export function LoggedInBanner() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user) return null;

  const isAdmin = user.roles?.some((r) => r.name === "admin" || r.name === "super_admin") ?? false;
  const displayName = user.full_name || user.email.split("@")[0];
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="border-b border-white/5 bg-gradient-to-r from-[#7559E8]/10 via-[#0B0F1D] to-[#0B0F1D]">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#7559E8]/30 border border-[#7559E8]/40 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user.avatar_url ? (
              <img
                src={`http://127.0.0.1:8010${user.avatar_url}`}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-[#A78BFA]">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">
              Welcome back, <span className="font-semibold">{displayName}</span>
            </p>
            <p className="text-xs text-[#7A8199] truncate hidden sm:block">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-md bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] transition whitespace-nowrap"
          >
            <LayoutDashboard size={14} /> Dashboard
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-2 rounded-md border border-[#F5A623]/40 bg-[#F5A623]/10 px-4 py-2 text-sm font-semibold text-[#F5A623] hover:bg-[#F5A623]/20 transition whitespace-nowrap"
            >
              <Shield size={14} /> Admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
