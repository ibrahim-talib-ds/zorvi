"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Download, Clock, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";

interface PackageDetail {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
}

interface Props {
  productId: string;
  packages: PackageDetail[];
}

export function BuyButton({ productId, packages }: Props) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const [selectedPkg, setSelectedPkg] = useState<PackageDetail | null>(packages[0] || null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // State to track if the user already owns/purchased this project
  const [existingOrder, setExistingOrder] = useState<any>(null);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  useEffect(() => {
    if (!token) {
      setCheckingOwnership(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const orders = await res.json();
          // Find the most recent valid order for this product
          const validOrder = orders.find(
            (o: any) =>
              o.items?.some((i: any) => i.product_id === productId) &&
              ["pending", "awaiting_verification", "paid"].includes(o.status)
          );
          if (validOrder) {
            setExistingOrder(validOrder);
            setOrderId(validOrder.id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingOwnership(false);
      }
    })();
  }, [token, productId]);

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?return=${window.location.pathname}`);
      return;
    }
    setModalOpen(true);
    if (existingOrder && existingOrder.status === "pending") {
      setStep("payment");
    } else {
      setStep("select");
    }
    setError(null);
  };

  const handleCreateOrder = async () => {
    if (!token || !selectedPkg) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: productId, package_id: selectedPkg.id, quantity: 1 }],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();
      setOrderId(order.id);
      setExistingOrder(order);
      setStep("payment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!token || !orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/submit-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method: "manual_bank_transfer",
          payment_reference: orderId.substring(0, 8).toUpperCase(),
          buyer_note: "I have sent the payment.",
        }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // If the order is already paid (409), refresh the page to show the download button
        if (res.status === 409) {
          window.location.reload();
          return;
        }
        let msg = "Failed to submit payment";
        if (data && typeof data.detail === "string") msg = data.detail;
        else if (data && Array.isArray(data.detail)) msg = data.detail.map((d: any) => d.msg).join(", ");
        throw new Error(msg);
      }
      setStep("success");
      // Refresh ownership state
      setExistingOrder({ ...existingOrder, status: "awaiting_verification" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!packages || packages.length === 0) {
    return (
      <button disabled className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-4 text-base font-bold text-[#7A8199] cursor-not-allowed border border-white/10">
        No packages available
      </button>
    );
  }

  if (checkingOwnership) {
    return (
      <button disabled className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 text-base font-bold text-[#7A8199]">
        <Loader2 className="animate-spin" size={18} /> Checking...
      </button>
    );
  }

  // --- SMART UI RENDERING BASED ON OWNERSHIP ---

  if (existingOrder) {
    if (existingOrder.status === "paid") {
      return (
        <Link
          href={`/account/orders/${existingOrder.id}`}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#1ea877] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#22C58B]/20 hover:brightness-110 transition"
        >
          <Download size={18} /> Download Project
        </Link>
      );
    }
    if (existingOrder.status === "awaiting_verification") {
      return (
        <Link
          href={`/account/orders/${existingOrder.id}`}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 px-6 py-4 text-base font-bold text-[#F5A623] hover:bg-[#F5A623]/20 transition"
        >
          <Clock size={18} /> Awaiting Admin Approval
        </Link>
      );
    }
    if (existingOrder.status === "pending") {
      return (
        <button
          onClick={handleBuyClick}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#7559E8]/20 hover:brightness-110 transition"
        >
          <CreditCard size={18} /> Resume Payment
        </button>
      );
    }
  }

  // --- DEFAULT BUY BUTTON ---
  return (
    <>
      <button
        onClick={handleBuyClick}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#7559E8]/20 hover:brightness-110 transition"
      >
        Buy for {selectedPkg ? `$${(selectedPkg.price_cents / 100).toFixed(0)}` : "—"}
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11152A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-white">
                {step === "select" && "Select a package"}
                {step === "payment" && "Complete Payment"}
                {step === "success" && "Order Confirmed"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#7A8199] hover:text-white">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 text-sm text-[#F05D70]">
                {error}
              </div>
            )}

            {step === "select" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={cn(
                        "w-full text-left rounded-lg border p-4 transition",
                        selectedPkg?.id === pkg.id
                          ? "border-[#7559E8] bg-[#7559E8]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{pkg.name}</span>
                        <span className="font-bold text-white">${(pkg.price_cents / 100).toFixed(0)}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateOrder}
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#7559E8] py-3 font-semibold text-white hover:bg-[#8B70FF] transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Continue to Payment"}
                </button>
              </div>
            )}

            {step === "payment" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">Pay via Bank Transfer or Mobile Money</p>
                  <div className="text-sm text-[#B7BDD0] space-y-1 font-mono">
                    <p><span className="text-[#7A8199]">Bank:</span> CRDB Bank</p>
                    <p><span className="text-[#7A8199]">Account:</span> 0150 1234 5678 90</p>
                    <p><span className="text-[#7A8199]">Name:</span> ZORVI Academy</p>
                    <p><span className="text-[#7A8199]">Amount:</span> ${selectedPkg ? (selectedPkg.price_cents / 100).toFixed(0) : ""} USD</p>
                    <p><span className="text-[#7A8199]">Reference:</span> {orderId?.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <p className="text-xs text-[#7A8199]">
                  After sending the payment, click the button below. Our team will verify and approve your order within 24 hours.
                </p>
                <button
                  onClick={handleSubmitPayment}
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#22C58B] py-3 font-semibold text-white hover:bg-[#1ea877] transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "I've sent the payment"}
                </button>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#22C58B]/10 border border-[#22C58B]/30 flex items-center justify-center mx-auto">
                  <Check size={32} className="text-[#22C58B]" />
                </div>
                <p className="text-white font-semibold">Your order is awaiting verification.</p>
                <p className="text-sm text-[#B7BDD0]">
                  We&apos;ll approve it within 24 hours. You&apos;ll be able to download the files from your account.
                </p>
                <button
                  onClick={() => router.push("/account/orders")}
                  className="w-full rounded-lg bg-[#7559E8] py-3 font-semibold text-white hover:bg-[#8B70FF] transition"
                >
                  View My Orders
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
