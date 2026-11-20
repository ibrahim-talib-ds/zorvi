"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { Loader2, Menu } from "lucide-react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?return=/account");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center"><Loader2 className="animate-spin text-[#A78BFA]" size={32} /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-[#0B0F1D]">
      <AccountSidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
        mobileOpen={mobileOpen} 
        onMobileClose={() => setMobileOpen(false)} 
      />
      
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0B0F1D]">
          <button 
            onClick={() => setMobileOpen(true)} 
            className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white transition"
          >
            <Menu size={16} /> Menu
          </button>
          <span className="text-sm font-mono text-[#7A8199] uppercase tracking-wider">Account</span>
        </div>

        <main className="p-6 lg:p-10 flex-1">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
