"use client";

import { AuthProvider } from "@/lib/auth/AuthContext";
import { SidebarProvider } from "@/lib/sidebar/SidebarContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthProvider>{children}</AuthProvider>
    </SidebarProvider>
  );
}
