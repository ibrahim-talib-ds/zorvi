"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.replace("/login?return=/admin");
      else {
        const isAdmin = user?.roles?.some((r: any) => r === "admin" || r === "super_admin" || r?.name === "admin" || r?.name === "super_admin");
        if (!isAdmin) router.replace("/account");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-deep">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );

  const isAdmin = user?.roles?.some((r: any) => r === "admin" || r === "super_admin" || r?.name === "admin" || r?.name === "super_admin");
  if (!isAuthenticated || !isAdmin) return null;

  return <DashboardShell variant="admin">{children}</DashboardShell>;
}
