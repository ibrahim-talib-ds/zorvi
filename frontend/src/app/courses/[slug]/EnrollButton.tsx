"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Props {
  courseSlug: string;
  firstLessonId: string | null;
  isEnrolled?: boolean;
}

export function EnrollButton({ courseSlug, firstLessonId, isEnrolled = false }: Props) {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(isEnrolled);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setError(null);

    if (!isAuthenticated) {
      router.push(`/login?return=/courses/${courseSlug}`);
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseSlug}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?return=/courses/${courseSlug}`);
          return;
        }
        throw new Error(await res.text());
      }

      setEnrolled(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinue = () => {
    if (firstLessonId) {
      router.push(`/courses/${courseSlug}/lessons/${firstLessonId}`);
    } else {
      router.refresh();
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="w-full rounded-lg bg-white/5 border border-white/10 px-6 py-3.5 text-sm font-semibold text-[#7A8199] flex items-center justify-center gap-2"
      >
        <Loader2 size={16} className="animate-spin" /> Loading...
      </button>
    );
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[#22C58B] font-medium">
          <CheckCircle2 size={16} /> You&apos;re enrolled
        </div>
        <button
          onClick={handleContinue}
          className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-[#7559E8]/20"
        >
          Continue Learning <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleEnroll}
        disabled={enrolling}
        className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 hover:shadow-lg hover:shadow-[#7559E8]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {enrolling ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Enrolling...
          </>
        ) : (
          <>
            Enroll Now <ArrowRight size={16} />
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-[#F05D70]">{error}</p>
      )}
      {!isAuthenticated && (
        <p className="mt-3 text-xs text-[#7A8199] text-center">
          Sign in to enroll — takes 10 seconds
        </p>
      )}
    </div>
  );
}
