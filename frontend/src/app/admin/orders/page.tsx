"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, RefreshCw, Download, User, Package,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface OrderItem {
  id: string;
  product_title: string;
  package_name: string;
  price_cents: number;
}

interface Order {
  id: string;
  user_id: string;
  status: "pending" | "awaiting_verification" | "paid" | "cancelled" | "refunded";
  total_cents: number;
  currency: string;
  buyer_note: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  items: OrderItem[];
}

interface DownloadToken {
  order_item_id: string;
  token: string;
  expires_at: string;
  file_name: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]",
  awaiting_verification: "border-[#5B9EFF]/30 bg-[#5B9EFF]/10 text-[#5B9EFF]",
  paid: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]",
  cancelled: "border-white/10 bg-white/5 text-[#7A8199]",
  refunded: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [issuedTokens, setIssuedTokens] = useState<Record<string, DownloadToken[]>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/orders");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/orders`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadOrders();
  }, [token]);

  const markPaid = async (orderId: string) => {
    if (!token) return;
    setActionLoading(orderId);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/orders/${orderId}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ admin_note: "Approved via admin UI" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "paid" as Order["status"], paid_at: data.order.paid_at } : o,
        ),
      );
      if (data.download_tokens) {
        setIssuedTokens((prev) => ({ ...prev, [orderId]: data.download_tokens }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark paid");
    } finally {
      setActionLoading(null);
    }
  };

  const markCancelled = async (orderId: string) => {
    if (!token || !confirm("Cancel this order?")) return;
    setActionLoading(orderId);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/orders/${orderId}/mark-cancelled`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ admin_note: "Cancelled via admin UI" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as Order["status"] } : o)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0B0F1D] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white mb-1">Orders</h1>
            <p className="text-sm text-[#B7BDD0]">
              {orders.length} {orders.length === 1 ? "order" : "orders"} total
            </p>
          </div>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-6 text-center">
            <p className="text-[#F05D70]">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-[#A78BFA]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">No orders yet</h3>
            <p className="text-sm text-[#B7BDD0]">
              When customers buy your products, orders will appear here for approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const tokens = issuedTokens[order.id] || [];
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.03] transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center">
                        <Package size={18} className="text-[#A78BFA]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-[#7A8199]">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[order.status]}`}
                          >
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-sm text-[#B7BDD0] flex items-center gap-1.5">
                          <User size={12} />
                          Customer: <span className="font-mono text-[#F8F8FC]">{order.user_id.slice(0, 8)}...</span>
                        </div>
                        <div className="text-xs text-[#7A8199] mt-1">
                          Created {new Date(order.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#7A8199] uppercase tracking-wider">Total</div>
                      <div className="font-display text-2xl font-extrabold text-white">
                        ${(order.total_cents / 100).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-[#7A8199] mb-2">Items:</div>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-[#B7BDD0]">
                            {item.product_title} — <span className="text-white">{item.package_name}</span>
                          </span>
                          <span className="font-mono text-[#F8F8FC]">
                            ${(item.price_cents / 100).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {(order.status === "pending" || order.status === "awaiting_verification") && (
                      <>
                        <button
                          onClick={() => markPaid(order.id)}
                          disabled={actionLoading === order.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#22C58B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3FD9A2] transition disabled:opacity-50"
                        >
                          {actionLoading === order.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => markCancelled(order.id)}
                          disabled={actionLoading === order.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#F05D70]/40 bg-[#F05D70]/10 px-4 py-2 text-sm font-medium text-[#F05D70] hover:bg-[#F05D70]/20 transition disabled:opacity-50"
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      </>
                    )}

                    {order.status === "paid" && (
                      <div className="text-sm text-[#22C58B] flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Paid on {order.paid_at ? new Date(order.paid_at).toLocaleString() : "—"}
                      </div>
                    )}
                  </div>

                  {tokens.length > 0 && (
                    <div className="mt-4 rounded-lg border border-[#22C58B]/30 bg-[#22C58B]/5 p-4">
                      <div className="text-xs text-[#22C58B] mb-2 font-medium">
                        ✅ Download links issued to buyer:
                      </div>
                      {tokens.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs font-mono py-1"
                        >
                          <span className="text-[#B7BDD0] flex items-center gap-1.5">
                            <Download size={12} />
                            {t.file_name}
                          </span>
                          <span className="text-[#7A8199]">
                            expires {new Date(t.expires_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
