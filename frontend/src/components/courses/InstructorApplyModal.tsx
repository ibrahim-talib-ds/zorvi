"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Check, GraduationCap, DollarSign } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";

export function InstructorApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push("/login?return=/courses");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/instructor-applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, description, is_paid: isPaid }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11152A] p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-[#7A8199] hover:text-white">
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#22C58B]/10 border border-[#22C58B]/30 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-[#22C58B]" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-2">Application Submitted!</h3>
            <p className="text-sm text-[#B7BDD0] mb-6">
              We&apos;ve received your request. Our team will review it and get back to you within 24 hours.
              {isPaid && " Since you want to charge for this course, we will manually review your content plan and contact you."}
            </p>
            <button
              onClick={() => {
                onClose();
                setSuccess(false);
                setTopic("");
                setDescription("");
                setIsPaid(false);
              }}
              className="rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-[#7559E8]/20 flex items-center justify-center">
                <GraduationCap size={20} className="text-[#A78BFA]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Apply to Teach</h2>
            </div>
            <p className="text-sm text-[#7A8199] mb-6">Share your expertise. Start building your course on ZORVI.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 text-sm text-[#F05D70]">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Course Topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  minLength={3}
                  placeholder="e.g., Advanced React Patterns"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Short Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={3}
                  placeholder="What will students learn by the end of this course?"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none resize-none"
                />
              </div>

              {/* Paid/Free Toggle */}
              <div className={cn(
                "flex items-center gap-3 rounded-xl border p-4 transition cursor-pointer",
                isPaid ? "border-[#F5A623]/50 bg-[#F5A623]/5" : "border-white/10 bg-[#0B0F1D]"
              )} onClick={() => setIsPaid(!isPaid)}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isPaid ? "bg-[#F5A623]/20 text-[#F5A623]" : "bg-white/5 text-[#7A8199]"
                )}>
                  <DollarSign size={20} />
                </div>
                <div className="flex-1">
                  <p className={cn("font-semibold", isPaid ? "text-white" : "text-[#B7BDD0]")}>
                    I want to charge for this course
                  </p>
                  <p className="text-xs text-[#7A8199] mt-0.5">You can set the price later.</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition",
                  isPaid ? "bg-[#F5A623] border-[#F5A623]" : "border-white/20 bg-transparent"
                )}>
                  {isPaid && <Check size={12} className="text-black" strokeWidth={3} />}
                </div>
              </div>

              {isPaid && (
                <p className="text-xs text-[#F5A623] bg-[#F5A623]/10 p-3 rounded-lg border border-[#F5A623]/20">
                  Note: Paid courses require manual approval by the ZORVI team. We will verify your expertise and content plan before you can publish.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-50 mt-2"
              >
                {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Submit Application"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
