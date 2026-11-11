"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, CreditCard, Landmark } from "lucide-react";
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

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?return=${window.location.pathname}`);
      return;
    }
    setModalOpen(true);
    setStep("select");
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!packages || packages.length === 0) {
    return (
      <div className="text-sm text-[#F05D70] p-4 border border-[#F05D70]/30 rounded-lg">
        This product has no packages yet.
      </div>
    );
  }

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
