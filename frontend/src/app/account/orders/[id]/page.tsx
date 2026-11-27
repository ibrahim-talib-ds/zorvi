"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Package, Download, CheckCircle2, Clock, AlertCircle, XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface OrderItem {
  id: string;
  product_title: string;
  product_slug: string;
  package_name: string;
  price_cents: number;
  currency: string;
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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<IssuedDownload[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
    setDownloadError(null);
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
      if (!Array.isArray(data) || data.length === 0) {
        setDownloadError("No downloadable files are attached to this package yet. Contact the seller or ibrant support.");
      }
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Failed to issue downloads");
    } finally {
      setRequesting(false);
    }
  };

  const downloadFile = (tokenValue: string) => {
    window.open(`${API_BASE}/downloads/${tokenValue}`, "_blank", "noopener,noreferrer");
  };

  const cancelOrder = async () => {
    if (!token || !order || !confirm("Cancel this order? This action cannot be undone.")) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(API_BASE + "/orders/" + orderId + "/cancel", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Unable to cancel this order.");
      }
      setOrder(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  const money = (cents: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(cents / 100);
    } catch {
      return (currency || "USD") + " " + (cents / 100).toFixed(2);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
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
                  <div className="text-xs text-[#7A8199] uppercase tracking-wider">Order total</div>
                  <div className="font-display text-3xl font-extrabold text-white">
                    {money(order.total_cents, order.currency)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-[#7A8199] uppercase tracking-wider mb-3">Items</div>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div>
                        <Link href={"/marketplace/" + item.product_slug} className="font-medium text-white transition hover:text-[#A78BFA]">{item.product_title}</Link>
                        <div className="text-xs text-[#7A8199]">{item.package_name} package</div>
                      </div>
                      <span className="font-mono text-[#B7BDD0]">{money(item.price_cents, item.currency || order.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(order.status === "pending" || order.status === "awaiting_verification") && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-xs text-[#9299AE]">You can cancel this order before payment approval.</p>
                <button onClick={cancelOrder} disabled={cancelling} className="inline-flex items-center gap-2 rounded-lg border border-[#F05D70]/25 px-3 py-2 text-xs font-semibold text-[#F58B98] transition hover:bg-[#F05D70]/10 disabled:opacity-50">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  {cancelling ? "Cancelling..." : "Cancel order"}
                </button>
              </div>
            )}

            {error && <div role="alert" className="mb-5 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] px-4 py-3 text-sm text-[#F58B98]">{error}</div>}

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
              <>
              <div className="rounded-2xl border border-[#22C58B]/30 bg-[#22C58B]/5 p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[#22C58B] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-white mb-2">Your project package is ready</h3>
                    <p className="text-sm text-[#B7BDD0]">
                      Generate a secure ZIP download for each purchased package. Each download link is valid for 15 minutes and can be used once.
                    </p>
                  </div>
                </div>

                {downloadError && <div role="alert" className="mb-4 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/10 px-4 py-3 text-sm text-[#FF9AA6]">{downloadError}</div>}
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
                        Generate ZIP download
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
                          <Download size={14} /> Download ZIP
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
              <div className="mt-4 rounded-2xl border border-[#7559E8]/25 bg-[#7559E8]/[0.06] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-white">Next step: open your project</h3>
                    <p className="mt-1 text-sm leading-6 text-[#B7BDD0]">Download the ZIP, extract it on your computer, then open the Playground and choose Open Folder to load the extracted project files.</p>
                  </div>
                  <Link href="/playground" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#8B70FF]">Open Playground <ArrowLeft size={14} className="rotate-180" /></Link>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#929CBD]">The browser preview runs HTML, CSS and JavaScript; the Python runner supports Python scripts. Projects that require Node.js, databases, backend services, or other runtimes should be opened in a local development environment such as VS Code.</p>
                <Link href="/build" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4B5FD] hover:text-white">Open Build Studio <ArrowLeft size={12} className="rotate-180" /></Link>
              </div>
              </>
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
