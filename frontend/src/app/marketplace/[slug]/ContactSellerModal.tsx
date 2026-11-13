"use client";

import { useState } from "react";
import { X, Loader2, Check, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Props {
  productId: string;
  sellerId: string;
  sellerName: string;
  open: boolean;
  onClose: () => void;
}

export function ContactSellerModal({ productId, sellerId, sellerName, open, onClose }: Props) {
  const { token, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = `/login?return=${window.location.pathname}`;
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: sellerId,
          product_id: productId,
          subject: subject,
          body: body,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11152A] p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-[#7A8199] hover:text-white">
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#22C58B]/10 border border-[#22C58B]/30 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-[#22C58B]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Message Sent!</h3>
            <p className="text-sm text-[#B7BDD0] mb-6">
              {sellerName} will get back to you soon. You can check your email for a reply.
            </p>
            <button onClick={onClose} className="rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF]">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#7559E8]/20 flex items-center justify-center">
                <MessageSquare size={20} className="text-[#A78BFA]" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Ask a Question</h2>
                <p className="text-xs text-[#7A8199]">To: {sellerName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 text-sm text-[#F05D70]">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g., Question about installation"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={4}
                  placeholder="Type your question here..."
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#7559E8] py-3 font-semibold text-white hover:bg-[#8B70FF] transition disabled:opacity-50 flex justify-center"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : "Send Message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
