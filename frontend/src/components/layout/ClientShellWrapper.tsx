"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthenticatedArea =
    pathname?.startsWith("/account") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/playground");

  // Authenticated layouts provide their own AppShell.
  if (isAuthenticatedArea) {
    return <>{children}</>;
  }

  // Public pages retain the public header and footer.
  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 pt-16 md:pt-[76px]">
        {children}
      </main>
      <Footer />
    </>
  );
}
