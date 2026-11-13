"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, CheckCircle2, XCircle, Trash2, Mail, Bell, User } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";

interface OrderItem {
  id: string;
  product_title: string;
  package_name: string;
  price_cents: number;
}

interface Order {
  id: string;
  user_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadOrders();
  }, [token, authLoading]);

  const handleMarkPaid = async (id: string) => {
    if (!token) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${id}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ admin_note: "Approved by admin" }),
      });
      if (res.ok) await loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete this order? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(orders.filter((o) => o.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!token || !confirm("Delete ALL orders? This will wipe the entire order history.")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders([]);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">Orders</h1>
          <p className="text-[#B7BDD0] mt-1">{orders.length} orders total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            <Loader2 size={16} className={processingId ? "animate-spin" : ""} /> Refresh
          </button>
          {orders.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 px-4 py-2 text-sm font-semibold text-[#F05D70] hover:bg-[#F05D70]/20 transition"
            >
              <Trash2 size={16} /> Clear History
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <Package size={32} className="text-[#7A8199] mx-auto mb-4" />
          <p className="text-[#7A8199]">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#7559E8]/10 flex items-center justify-center">
                    <Package size={20} className="text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-[#7A8199]">#{o.id.substring(0, 8)}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        o.status === "paid" ? "bg-[#22C58B]/10 text-[#22C58B]" :
                        o.status === "awaiting_verification" ? "bg-[#F5A623]/10 text-[#F5A623]" :
                        o.status === "pending" ? "bg-[#5B9EFF]/10 text-[#5B9EFF]" :
                        "bg-[#F05D70]/10 text-[#F05D70]"
                      )}>
                        {o.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#7A8199]">
                        {new Date(o.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-white">${(o.total_cents / 100).toFixed(0)}</p>
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="p-2 rounded-lg bg-white/5 text-[#7A8199] hover:bg-[#F05D70]/10 hover:text-[#F05D70] transition"
                    title="Delete Order"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-[#7A8199]" />
                  <span className="text-sm font-medium text-white">{o.buyer_name || "Unknown"}</span>
                  <span className="text-xs text-[#7A8199] font-mono">({o.buyer_email || "No email"})</span>
                </div>
                <div className="flex items-center gap-2">
                  {o.buyer_email && (
                    <a
                      href={`mailto:${o.buyer_email}?subject=Your ZORVI Order %23${o.id.substring(0, 8)}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-[#B7BDD0] hover:bg-white/10 hover:text-white transition"
                    >
                      <Mail size={12} /> Send Email
                    </a>
                  )}
                  <button className="inline-flex items-center gap-1.5 rounded-md bg-[#5B9EFF]/10 px-3 py-1.5 text-xs font-medium text-[#5B9EFF] hover:bg-[#5B9EFF]/20 transition">
                    <Bell size={12} /> Send Notification
                  </button>
                </div>
              </div>

              {/* Items & Actions */}
              <div className="px-6 py-4 space-y-3">
                {o.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white font-medium">{item.product_title}</span>
                      <span className="text-[#7A8199] ml-2">— {item.package_name}</span>
                    </div>
                    <span className="text-[#B7BDD0]">${(item.price_cents / 100).toFixed(0)}</span>
                  </div>
                ))}

                {(o.status === "awaiting_verification" || o.status === "pending") && (
                  <div className="pt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleMarkPaid(o.id)}
                      disabled={processingId === o.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#22C58B] px-5 py-2 text-sm font-bold text-black hover:bg-[#1ea877] transition disabled:opacity-50"
                    >
                      {processingId === o.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Mark as Paid
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/5 px-5 py-2 text-sm font-bold text-[#F05D70] hover:bg-[#F05D70]/10 transition">
                      <XCircle size={16} /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
