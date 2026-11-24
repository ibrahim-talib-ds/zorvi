"use client";

// src/components/navigation/SidebarFooter.tsx
// Premium upgrade card for students (route /pricing exists and is public).
// Hidden when collapsed, hidden for admins.

import Link from "next/link";
import { Crown } from "lucide-react";
import { useSidebar } from "./SidebarProvider";
import type { SidebarVariant } from "./navigation.types";

export function SidebarFooter({ variant, expanded }: { variant: SidebarVariant; expanded?: boolean }) {
  const ctx = useSidebar();
  const isOpen = expanded ?? ctx.expanded;
  if (variant !== "student" || !isOpen) return null;

  return (
    <div className="px-3 pb-2">
      <Link
        href="/pricing"
        className="block rounded-2xl border border-[#7559E8]/30 bg-gradient-to-br from-[#7559E8]/15 to-[#8B70FF]/10 p-3.5 transition hover:border-[#7559E8]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A78BFA] motion-reduce:transition-none"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-white">
          <Crown size={14} className="text-[#F5C26B]" aria-hidden="true" /> Go Premium
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-[#929CBD]">
          Unlock every course and project — see plans.
        </span>
      </Link>
    </div>
  );
}
