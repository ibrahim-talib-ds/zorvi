"use client";

import { useSidebar } from "@/lib/sidebar/SidebarContext";
import { cn } from "@/lib/design-system/cn";

export function AccountLayoutContent({ children }: { children: React.ReactNode }) {
  const { accountCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        "transition-all duration-300",
        accountCollapsed ? "md:ml-16" : "md:ml-60",
      )}
    >
      {children}
    </div>
  );
}
