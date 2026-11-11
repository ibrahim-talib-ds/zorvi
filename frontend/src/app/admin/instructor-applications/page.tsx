"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X, Clock, User, Mail, DollarSign, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";

interface Application {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  topic: string;
  description: string;
  is_paid: boolean;
  status: string;
  created_at: string;
}

export default function InstructorApplicationsPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/instructor-applications`, {
          headers: { },
        });
        if (res.ok) {
          const data = await res.json();
          setApps(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleUpdate = async (id: string, status: "approved" | "rejected") => {
    if (!token) return;
    setProcessingId(id);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/instructor-applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApps(apps.map((a) => (a.id === id ? { ...a, status } : a)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white mb-2">Instructor Applications</h1>
        <p className="text-[#B7BDD0]">Review requests from users who want to teach on ZORVI.</p>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-[#A78BFA]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">No applications yet</h3>
          <p className="text-sm text-[#B7BDD0]">When users apply to teach, their requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <div key={app.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col md:flex-row gap-6">
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#7559E8]/20 flex items-center justify-center shrink-0">
                    <User size={18} className="text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{app.user_name}</p>
                    <p className="text-xs text-[#7A8199] flex items-center gap-1"><Mail size={10} /> {app.user_email}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-1">Topic</p>
                  <p className="text-white font-medium">{app.topic}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-1">Description</p>
                  <p className="text-sm text-[#B7BDD0] bg-white/5 p-3 rounded-lg">{app.description}</p>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5",
                    app.is_paid 
                      ? "bg-[#F5A623]/10 border-[#F5A623]/30 text-[#F5A623]" 
                      : "bg-[#22C58B]/10 border-[#22C58B]/30 text-[#22C58B]"
                  )}>
                    {app.is_paid ? <DollarSign size={12} /> : <Check size={12} />}
                    {app.is_paid ? "Paid Course" : "Free Course"}
                  </span>
                  <span className="text-xs text-[#7A8199] flex items-center gap-1">
                    <Clock size={12} /> {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="md:w-48 flex flex-col gap-3 shrink-0 md:border-l md:border-white/5 md:pl-6 justify-center">
                {app.status === "pending" ? (
                  <>
                    <button
                      onClick={() => handleUpdate(app.id, "approved")}
                      disabled={processingId === app.id}
                      className="w-full rounded-lg bg-[#22C58B] py-2.5 text-sm font-semibold text-black hover:bg-[#1ea877] transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {processingId === app.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
                    </button>
                    <button
                      onClick={() => handleUpdate(app.id, "rejected")}
                      disabled={processingId === app.id}
                      className="w-full rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 py-2.5 text-sm font-semibold text-[#F05D70] hover:bg-[#F05D70]/20 transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      <X size={16} /> Reject
                    </button>
                  </>
                ) : (
                  <div className={cn(
                    "text-center py-3 rounded-lg border font-semibold text-sm",
                    app.status === "approved" 
                      ? "bg-[#22C58B]/10 border-[#22C58B]/30 text-[#22C58B]" 
                      : "bg-[#F05D70]/10 border-[#F05D70]/30 text-[#F05D70]"
                  )}>
                    {app.status.toUpperCase()}
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
