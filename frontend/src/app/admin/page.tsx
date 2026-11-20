"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Users, ArrowRight, Loader2, Plus, ClipboardCheck } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Stats {
  products_count: number;
  orders_count: number;
  revenue_cents: number;
  customers_count: number;
}

interface Order {
  id: string;
  user_email: string;
  total_cents: number;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#1EA877]",
  pending: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#E09520]",
  cancelled: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
  failed: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

function StatusPill({ status }: { status: string }) {
  const cls =
    STATUS_STYLES[status] ||
    "border-bg-border bg-bg-elevated text-text-muted";
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider " +
        cls
      }
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        // Fetch stats
        const statsRes = await fetchWithAuth(`${API_BASE}/admin/marketplace/stats`, {
          headers: { },
        });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        // Fetch recent orders
        const ordersRes = await fetchWithAuth(`${API_BASE}/admin/orders?limit=5`, {
          headers: { },
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setRecentOrders(Array.isArray(ordersData) ? ordersData : []);
        }
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  const kpis = [
    { label: "dashboard.nav.products", value: stats?.products_count ?? 0, icon: Package, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10" },
    { label: "dashboard.nav.orders", value: stats?.orders_count ?? 0, icon: ShoppingBag, color: "text-[#F5A623]", bg: "bg-[#F5A623]/10" },
    { label: "dashboard.page.revenue", value: `$${((stats?.revenue_cents ?? 0) / 100).toLocaleString()}`, icon: DollarSign, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10" },
    { label: "dashboard.page.customers", value: stats?.customers_count ?? 0, icon: Users, color: "text-[#A78BFA]", bg: "bg-[#A78BFA]/10" },
  ];

  const quickActions = [
    { href: "/admin/products/new", titleKey: "dashboard.nav.newProduct", subKey: "dashboard.page.newProductSub", icon: Plus, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10" },
    { href: "/admin/orders", titleKey: "dashboard.nav.orders", subKey: "dashboard.page.manageOrdersSub", icon: ShoppingBag, color: "text-[#F5A623]", bg: "bg-[#F5A623]/10" },
    { href: "/admin/instructor-applications", titleKey: "dashboard.nav.instructorApps", subKey: "dashboard.page.instructorAppsSub", icon: ClipboardCheck, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          <Tr k="dashboard.page.adminTitle" />
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          <Tr k="dashboard.page.welcomeBack" />
          {user?.full_name ? `, ${user.full_name}.` : "."}
        </p>
        <p className="mt-0.5 text-sm text-text-muted">
          <Tr k="dashboard.page.platformActivity" />
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-4 rounded-2xl border border-bg-border bg-bg-surface p-5 transition-colors hover:border-[#A78BFA]/30"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.bg}`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-text-muted">
                <Tr k={kpi.label} />
              </p>
              <p className="truncate text-2xl font-extrabold text-text-primary">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        {/* Recent Orders */}
        <div className="overflow-hidden rounded-2xl border border-bg-border bg-bg-surface">
          <div className="flex items-center justify-between border-b border-bg-border px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-bold text-text-primary">
              <Tr k="dashboard.page.recentOrders" />
            </h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-sm text-[#A78BFA] transition hover:text-[#8B70FF]"
            >
              <Tr k="dashboard.page.viewAll" /> <ArrowRight size={14} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag size={28} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-muted">
                <Tr k="dashboard.page.noOrders" />
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bg-border">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-bg-elevated/60 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7559E8]/15 text-xs font-bold uppercase text-[#A78BFA]">
                      {(o.user_email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {o.user_email || <Tr k="dashboard.page.project" />}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-text-muted">
                        #{o.id.substring(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-text-primary">
                      ${(o.total_cents / 100).toFixed(0)}
                    </p>
                    <div className="mt-1">
                      <StatusPill status={o.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-bg-border bg-bg-surface p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">
            <Tr k="dashboard.page.quickActions" />
          </h2>
          <div className="space-y-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-xl border border-bg-border bg-bg-elevated/50 p-3 transition hover:border-[#A78BFA]/30 hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
                  <a.icon size={18} className={a.color} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary transition-colors group-hover:text-[#A78BFA]">
                    <Tr k={a.titleKey} />
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    <Tr k={a.subKey} />
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-text-primary"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
