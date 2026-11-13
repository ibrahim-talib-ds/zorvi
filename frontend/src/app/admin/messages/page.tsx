"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Message {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  body: string;
  product_title: string | null;
  created_at: string;
}

export default function AdminMessagesPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white flex items-center gap-3">
          <MessageSquare size={28} className="text-[#A78BFA]" /> Inbox
        </h1>
        <p className="text-[#B7BDD0] mt-1">{messages.length} messages from buyers</p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <Mail size={32} className="text-[#7A8199] mx-auto mb-4" />
          <p className="text-[#7A8199]">No messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-bold text-white">{m.sender_name || "Unknown User"}</p>
                  <p className="text-xs text-[#7A8199] font-mono">{m.sender_email}</p>
                  {m.product_title && (
                    <p className="text-xs text-[#A78BFA] mt-1">Regarding: {m.product_title}</p>
                  )}
                </div>
                <span className="text-xs text-[#7A8199]">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              
              <div className="rounded-lg bg-[#0B0F1D] border border-white/5 p-4 mb-4">
                <p className="text-sm font-semibold text-[#B7BDD0] mb-1">{m.subject}</p>
                <p className="text-sm text-white whitespace-pre-line">{m.body}</p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${m.sender_email}?subject=Re: ${m.subject}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
                >
                  <Mail size={16} /> Reply via Email
                </a>
                <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">
                  <CheckCircle2 size={16} /> Mark as Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
