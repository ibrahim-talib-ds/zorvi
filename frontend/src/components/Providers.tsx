"use client";

import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { SidebarProvider } from "@/lib/sidebar/SidebarContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
