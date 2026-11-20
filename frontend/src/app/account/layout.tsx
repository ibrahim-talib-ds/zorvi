"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Loader2 } from "lucide-react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?return=/account");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-deep">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  if (!isAuthenticated) return null;

  return <DashboardShell variant="user">{children}</DashboardShell>;
}
