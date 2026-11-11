"use client";

import { useSidebar } from "@/lib/sidebar/SidebarContext";
import { cn } from "@/lib/design-system/cn";

export function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { adminCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        "transition-all duration-300",
        adminCollapsed ? "md:ml-16" : "md:ml-60",
      )}
    >
      {children}
    </div>
  );
}
