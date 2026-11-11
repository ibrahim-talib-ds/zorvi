"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Package, Download, CheckCircle2, Clock, AlertCircle,
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
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  items: OrderItem[];
}

interface IssuedDownload {
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<IssuedDownload[]>([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?return=/account/orders/${orderId}`);
    }
  }, [authLoading, isAuthenticated, router, orderId]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        setOrder(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, orderId]);

  const requestDownloads = async () => {
    if (!token) return;
    setRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/downloads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ttl_minutes: 15 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDownloads(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to issue downloads");
    } finally {
      setRequesting(false);
    }
  };

  const downloadFile = (tokenValue: string) => {
    window.open(`${API_BASE}/downloads/${tokenValue}`, "_blank");
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
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to My Orders
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
          </div>
        ) : error || !order ? (
          <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-6 text-center">
            <p className="text-[#F05D70]">{error || "Order not found"}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-[#7A8199]">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-[#7A8199] mt-1">
                    Ordered {new Date(order.created_at).toLocaleString()}
                  </div>
                  {order.paid_at && (
                    <div className="text-xs text-[#22C58B] mt-1">
                      Paid {new Date(order.paid_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#7A8199] uppercase tracking-wider">Total paid</div>
                  <div className="font-display text-3xl font-extrabold text-white">
                    ${(order.total_cents / 100).toFixed(0)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-[#7A8199] uppercase tracking-wider mb-3">Items</div>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div>
                        <div className="text-white font-medium">{item.product_title}</div>
                        <div className="text-xs text-[#7A8199]">{item.package_name} package</div>
                      </div>
                      <span className="font-mono text-[#B7BDD0]">${(item.price_cents / 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {order.status === "pending" && (
              <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/5 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-[#F5A623] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-white mb-2">Awaiting payment</h3>
                    <p className="text-sm text-[#B7BDD0] mb-3">
                      This order has not been paid yet. Pay via bank transfer to the account provided during checkout, then the admin will approve your order.
                    </p>
                    <p className="text-xs text-[#7A8199]">
                      Once approved, download links will appear here.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.status === "awaiting_verification" && (
              <div className="rounded-2xl border border-[#5B9EFF]/30 bg-[#5B9EFF]/5 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-[#5B9EFF] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-white mb-2">Payment being verified</h3>
                    <p className="text-sm text-[#B7BDD0]">
                      Your payment has been submitted and is under review by the admin. Downloads will unlock once approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.status === "paid" && (
              <div className="rounded-2xl border border-[#22C58B]/30 bg-[#22C58B]/5 p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[#22C58B] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-white mb-2">Ready to download</h3>
                    <p className="text-sm text-[#B7BDD0]">
                      Click the button below to generate download links. Each link is valid for 15 minutes and can be used once.
                    </p>
                  </div>
                </div>

                {downloads.length === 0 ? (
                  <button
                    onClick={requestDownloads}
                    disabled={requesting}
                    className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {requesting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating links...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Generate Download Links
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {downloads.map((d) => (
                      <div
                        key={d.token}
                        className="flex items-center justify-between rounded-lg bg-[#0B0F1D] border border-[#22C58B]/20 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#22C58B]/10 border border-[#22C58B]/30 flex items-center justify-center">
                            <Package size={18} className="text-[#22C58B]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{d.file_name}</div>
                            <div className="text-xs text-[#7A8199]">
                              Expires {new Date(d.expires_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(d.token)}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#22C58B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3FD9A2] transition"
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={requestDownloads}
                      className="text-xs text-[#7A8199] hover:text-[#A78BFA] mt-2 underline"
                    >
                      Links expired? Generate new ones
                    </button>
                  </div>
                )}
              </div>
            )}

            {(order.status === "cancelled" || order.status === "refunded") && (
              <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/5 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-[#F05D70] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-white mb-2">
                      Order {order.status}
                    </h3>
                    <p className="text-sm text-[#B7BDD0]">
                      This order is no longer active. Downloads are not available.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
