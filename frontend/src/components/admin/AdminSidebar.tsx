"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Layers, GraduationCap,
  Settings, ArrowLeft, User as UserIcon, LogOut, Users, Menu, X, ChevronLeft, Bell, MessageSquare
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/design-system/cn";

export function AdminSidebar({ 
  collapsed, 
  onToggle, 
  mobileOpen, 
  onMobileClose 
}: { 
  collapsed: boolean; 
  onToggle: () => void; 
  mobileOpen: boolean; 
  onMobileClose: () => void; 
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const links = [
    { group: "Overview", items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ]},
    { group: "Manage", items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/categories", label: "Categories", icon: Layers },
      { href: "/admin/courses", label: "Courses", icon: GraduationCap },
      { href: "/admin/instructor-applications", label: "Instructor Apps", icon: Users },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/messages", label: "Inbox", icon: MessageSquare },
    ]},
    { group: "System", items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ]},
  ];

  const handleLogout = () => { logout(); router.push("/"); };

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
          {collapsed ? (
            <span className="font-display text-xl font-extrabold tracking-tight text-[#7559E8]">Z</span>
          ) : (
            <span className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
              ZORVI <span className="text-[#7559E8]">Admin</span>
            </span>
          )}
        </Link>
        <button onClick={onToggle} className="hidden md:flex text-[#7A8199] hover:text-white transition">
          <ChevronLeft className={cn("transition-transform", collapsed && "rotate-180")} size={18} />
        </button>
        <button onClick={onMobileClose} className="md:hidden text-[#7A8199] hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {links.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <h4 className="px-3 text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-2 whitespace-nowrap">
                {group.group}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                      isActive ? "bg-[#7559E8]/10 text-[#A78BFA]" : "text-[#B7BDD0] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={18} className={cn("shrink-0", isActive ? "text-[#A78BFA]" : "text-[#7A8199]")} />
                    {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 space-y-2 shrink-0">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-[#7559E8]/20 flex items-center justify-center shrink-0 overflow-hidden">
             {user?.avatar_url ? <img src={`http://127.0.0.1:8010${user.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-[#A78BFA]" />}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || "Admin"}</p>
              <p className="text-xs text-[#7A8199] truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <Link href="/" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#B7BDD0] hover:bg-white/5 hover:text-white transition", collapsed && "justify-center")}>
          <ArrowLeft size={18} className="shrink-0" /> {!collapsed && "Back to Site"}
        </Link>
        <button onClick={handleLogout} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#F05D70] hover:bg-[#F05D70]/10 transition", collapsed && "justify-center")}>
          <LogOut size={18} className="shrink-0" /> {!collapsed && "Log Out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:flex flex-col h-screen sticky top-0 border-r border-white/5 bg-[#0B0F1D] transition-all duration-300 shrink-0 z-40", collapsed ? "w-[72px]" : "w-64")}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex md:hidden flex-col w-64 border-r border-white/5 bg-[#0B0F1D] transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />}
    </>
  );
}
