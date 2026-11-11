"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Circle, Award } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import Link from "next/link";

interface Props {
  courseSlug: string;
  lessonId: string;
  initialCompleted: boolean;
}

export function MarkCompleteButton({ courseSlug, lessonId, initialCompleted }: Props) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  
  const [completed, setCompleted] = useState(initialCompleted);
  const [courseComplete, setCourseComplete] = useState(false);
  const [certCode, setCertCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!isAuthenticated || !token) {
      router.push(`/login?return=/courses/${courseSlug}/lessons/${lessonId}`);
      return;
    }
    if (completed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/courses/${courseSlug}/lessons/${lessonId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?return=/courses/${courseSlug}/lessons/${lessonId}`);
          return;
        }
        throw new Error(await res.text());
      }

      const data = await res.json();
      setCompleted(true);

      // Check if this completion finished the whole course
      if (data.course_complete && data.certificate_code) {
        setCourseComplete(true);
        setCertCode(data.certificate_code);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark complete");
    } finally {
      setLoading(false);
    }
  };

  // If the whole course is finished right now, show the epic success banner
  if (courseComplete && certCode) {
    return (
      <div className="rounded-xl border border-[#22C58B]/30 bg-[#22C58B]/10 p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 rounded-full bg-[#22C58B]/20 flex items-center justify-center mx-auto mb-4">
          <Award size={32} className="text-[#22C58B]" />
        </div>
        <h3 className="font-display text-2xl font-bold text-white mb-2">Course Completed!</h3>
        <p className="text-sm text-[#B7BDD0] mb-6">
          Congratulations! You have finished all lessons and earned your certificate.
        </p>
        <Link
          href={`/account/certificates/${certCode}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#22C58B] px-6 py-3 text-sm font-bold text-black hover:bg-[#1ea877] transition"
        >
          <Award size={18} /> View Your Certificate
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#22C58B]/10 border border-[#22C58B]/30 text-[#22C58B] text-sm font-medium">
        <CheckCircle2 size={18} />
        Lesson completed
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Circle size={16} /> Mark as Complete
          </>
        )}
      </button>
      {error && <p className="text-sm text-[#F05D70] mt-2">{error}</p>}
    </div>
  );
}

// Added back safely to fix the import in page.tsx
export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-[#7A8199] mb-1.5">
        <span>{completed} of {total} lessons completed</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF] transition-all duration-500" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
