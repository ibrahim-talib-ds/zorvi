"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Users, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
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
    { label: "Products", value: stats?.products_count ?? 0, icon: Package, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10" },
    { label: "Orders", value: stats?.orders_count ?? 0, icon: ShoppingBag, color: "text-[#F5A623]", bg: "bg-[#F5A623]/10" },
    { label: "Revenue", value: `$${((stats?.revenue_cents ?? 0) / 100).toLocaleString()}`, icon: DollarSign, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10" },
    { label: "Customers", value: stats?.customers_count ?? 0, icon: Users, color: "text-[#A78BFA]", bg: "bg-[#A78BFA]/10" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white">Admin Dashboard</h1>
        <p className="text-sm text-[#B7BDD0] mt-1">Welcome back, {user?.full_name}.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-1">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-white">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="font-display text-lg font-bold text-white">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-[#A78BFA] hover:text-white transition flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#7A8199]">No orders yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentOrders.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
                  <div>
                    <p className="text-sm text-white font-medium">{o.user_email || "Guest"}</p>
                    <p className="text-xs text-[#7A8199] font-mono mt-0.5">#{o.id.substring(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${(o.total_cents / 100).toFixed(0)}</p>
                    <p className="text-[10px] uppercase tracking-wider font-mono text-[#7A8199] mt-0.5">{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h2 className="font-display text-lg font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/admin/products/new" className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">New Product</p>
                  <p className="text-xs text-[#7A8199]">Upload a project</p>
                </div>
                <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
              </Link>
              <Link href="/admin/orders" className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">Manage Orders</p>
                  <p className="text-xs text-[#7A8199]">Approve payments</p>
                </div>
                <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
              </Link>
              <Link href="/admin/instructor-applications" className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">Instructor Apps</p>
                  <p className="text-xs text-[#7A8199]">Review requests</p>
                </div>
                <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
