"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Package, ShoppingBag, CheckCircle2, Clock, XCircle,
  RefreshCw, Search, Filter, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface OrderItem {
  id: string;
  product_title: string;
  package_name: string;
  price_cents: number;
}

interface Order {
  id: string;
  status: "pending" | "awaiting_verification" | "paid" | "cancelled" | "refunded";
  total_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: {
    color: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]",
    icon: Clock,
    label: "Pending payment",
  },
  awaiting_verification: {
    color: "border-[#5B9EFF]/30 bg-[#5B9EFF]/10 text-[#5B9EFF]",
    icon: Clock,
    label: "Awaiting verification",
  },
  paid: {
    color: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]",
    icon: CheckCircle2,
    label: "Paid",
  },
  cancelled: {
    color: "border-white/10 bg-white/5 text-[#7A8199]",
    icon: XCircle,
    label: "Cancelled",
  },
  refunded: {
    color: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
    icon: XCircle,
    label: "Refunded",
  },
};

type Filter = "all" | "pending" | "awaiting_verification" | "paid" | "cancelled" | "refunded";

export default function MyOrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/account/orders");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadOrders = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) loadOrders();
  }, [token]);

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesItems = o.items.some((i) =>
        i.product_title.toLowerCase().includes(q),
      );
      return matchesId || matchesItems;
    }
    return true;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    awaiting_verification: orders.filter((o) => o.status === "awaiting_verification").length,
    paid: orders.filter((o) => o.status === "paid").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    refunded: orders.filter((o) => o.status === "refunded").length,
  };

  if (authLoading || loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="py-10 px-6 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#5B9EFF] mb-2">
            Purchases
          </p>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-1">
            My Orders
          </h1>
          <p className="text-sm text-[#B7BDD0]">
            {orders.length === 0
              ? "No purchases yet"
              : `${orders.length} total · ${counts.paid} paid · ${counts.pending + counts.awaiting_verification} awaiting`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            <ShoppingBag size={16} /> Browse Marketplace
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-4 mb-6">
          <p className="text-sm text-[#F05D70]">{error}</p>
        </div>
      )}

      {/* Filters + Search */}
      {orders.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8199] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or product..."
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "awaiting_verification", "paid", "cancelled", "refunded"] as Filter[]).map((f) => {
              const label = f === "all" ? "All" : f === "awaiting_verification" ? "Awaiting" : f.charAt(0).toUpperCase() + f.slice(1);
              const count = counts[f];
              if (f !== "all" && count === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    filter === f
                      ? "bg-[#7559E8] text-white"
                      : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={28} className="text-[#A78BFA]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">
            {orders.length === 0 ? "No purchases yet" : "No orders match your filters"}
          </h3>
          <p className="text-sm text-[#B7BDD0] mb-6">
            {orders.length === 0
              ? "When you buy a project, it will appear here."
              : "Try a different filter or search term."}
          </p>
          {orders.length === 0 && (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
            >
              Explore Projects <ArrowRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const StatusIcon = cfg.icon;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-[#7559E8]/30 transition group"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-[#A78BFA]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-[#7A8199]">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cfg.color}`}
                        >
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#7A8199]">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {order.paid_at && (
                          <> · Paid {new Date(order.paid_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#7A8199] uppercase tracking-wider">Total</div>
                    <div className="font-display text-xl font-bold text-white">
                      ${(order.total_cents / 100).toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <div className="text-sm text-[#B7BDD0] mb-1">
                    {order.items.map((item, i) => (
                      <div key={item.id} className={i > 0 ? "mt-1" : ""}>
                        {item.product_title} — <span className="text-white">{item.package_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {order.status === "paid" && (
                    <div className="text-xs text-[#22C58B] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Ready to download
                    </div>
                  )}
                  {order.status === "pending" && (
                    <div className="text-xs text-[#F5A623]">
                      Complete payment to unlock downloads
                    </div>
                  )}
                  {order.status === "awaiting_verification" && (
                    <div className="text-xs text-[#5B9EFF]">
                      Admin is verifying your payment
                    </div>
                  )}
                  {(order.status === "cancelled" || order.status === "refunded") && (
                    <div className="text-xs text-[#7A8199]">
                      This order is {order.status}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[#A78BFA] group-hover:text-[#8B70FF] inline-flex items-center gap-1 transition">
                    View details <ArrowRight size={14} className="group-hover:translate-x-0.5 transition" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
