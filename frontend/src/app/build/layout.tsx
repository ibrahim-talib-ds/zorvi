"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/navigation/AppShell";

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = Boolean(user?.roles?.some((role) => role.name === "admin" || role.name === "super_admin"));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname || "/build";
      router.replace(`/login?return=${encodeURIComponent(returnTo)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg-deep"><Loader2 className="animate-spin text-[#A78BFA]" size={32} /></div>;
  }
  if (!isAuthenticated) return null;
  return <AppShell variant={isAdmin ? "admin" : "student"}>{children}</AppShell>;
}
