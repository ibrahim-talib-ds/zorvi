"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/navigation/AppShell";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embedded = searchParams.get("embedded") === "1";

  const isAdmin = Boolean(
    user?.roles?.some(
      (role) => role.name === "admin" || role.name === "super_admin"
    )
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/playground";
      router.replace(`/login?return=${encodeURIComponent(returnTo)}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-deep">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (embedded) return <>{children}</>;

  return (
    <AppShell variant={isAdmin ? "admin" : "student"}>
      {children}
    </AppShell>
  );
}
