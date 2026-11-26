"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/navigation/AppShell";
import { Loader2 } from "lucide-react";
import { useScrollKeeper } from "@/components/admin/ScrollKeeper";

function isAdminRole(role: unknown): boolean {
  if (role === "admin" || role === "super_admin") return true;
  if (typeof role !== "object" || role === null || !("name" in role)) return false;
  const name = (role as { name?: unknown }).name;
  return name === "admin" || name === "super_admin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useScrollKeeper();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.replace("/login?return=/admin");
      else {
        const isAdmin = user?.roles?.some(isAdminRole);
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

  const isAdmin = user?.roles?.some(isAdminRole);
  if (!isAuthenticated || !isAdmin) return null;

  return <AppShell variant="admin">{children}</AppShell>;
}
