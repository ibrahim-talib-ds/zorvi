"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, Mail, MessageSquare, Search, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string;
  body: string;
  product_title: string | null;
  created_at: string;
}

export default function AdminMessagesPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      if (!authLoading) setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        setError(null);
        const res = await fetch(API_BASE + "/admin/messages", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw new Error("Unable to load messages (" + res.status + ").");
        const data = await res.json();
        if (active) setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load messages.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token, authLoading]);

  const sendReply = async (message: Message) => {
    const body = (replyDrafts[message.id] ?? "").trim();
    if (body.length < 10 || !token) return;
    setSendingReply(message.id);
    setReplyError(null);
    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: message.sender_id, subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`, body }),
      });
      if (!response.ok) throw new Error(await response.text());
      setReplyDrafts((prev) => ({ ...prev, [message.id]: "" }));
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Unable to send reply.");
    } finally { setSendingReply(null); }
  };

  const filteredMessages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const incoming = messages.filter((message) => message.sender_id !== user?.id);
    if (!needle) return incoming;
    return incoming.filter((message) => [
      message.sender_name, message.sender_email, message.subject,
      message.body, message.product_title,
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [messages, query, user?.id]);

  if (authLoading || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#A78BFA]" size={32} /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7559E8]/25 bg-[#7559E8]/10 px-3 py-1 text-xs font-semibold text-[#B7A7FF]">
            <MessageSquare size={13} /> Buyer communication
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Inbox</h1>
          <p className="mt-1 text-sm text-[#9299AE]">Messages sent by buyers about marketplace projects.</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#7A8199]">Total messages</p>
          <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-white">{messages.length}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8199]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender, subject, project or message..." aria-label="Search inbox messages" className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-[#687087] focus:border-[#8B70FF] focus:ring-2 focus:ring-[#7559E8]/15" />
        </div>
        <p className="text-xs text-[#7A8199]">Showing {filteredMessages.length} of {messages.length}</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F58B98]"><AlertCircle size={17} /> Inbox could not be loaded</div>
          <p className="mt-2 text-sm text-[#B7BDD0]">{error}</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#9299AE]"><Mail size={24} /></div>
          <h2 className="font-display text-lg font-bold text-white">{query ? "No matching messages" : "Your inbox is clear"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#7A8199]">{query ? "Try a different search term." : "Buyer enquiries about your marketplace projects will appear here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((message) => {
            const replyUrl = message.sender_email
              ? "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(message.sender_email) + "&su=" + encodeURIComponent("Re: " + message.subject)
              : null;
            const createdAt = new Date(message.created_at);
            return (
              <article key={message.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:border-white/[0.13] hover:bg-white/[0.035]">
                <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7559E8]/20 bg-[#7559E8]/10 text-sm font-bold text-[#B7A7FF]">{(message.sender_name || message.sender_email || "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{message.sender_name || "Unknown sender"}</p>
                      <p className="mt-0.5 break-all text-xs text-[#7A8199]">{message.sender_email || "No email address provided"}</p>
                      {message.product_title && <p className="mt-2 inline-flex max-w-full truncate rounded-md border border-[#5B9EFF]/15 bg-[#5B9EFF]/[0.07] px-2 py-1 text-[11px] text-[#8BBEFF]">Project: {message.product_title}</p>}
                    </div>
                  </div>
                  <time dateTime={message.created_at} className="shrink-0 text-xs text-[#7A8199]">{Number.isNaN(createdAt.getTime()) ? "Date unavailable" : createdAt.toLocaleString()}</time>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <h2 className="text-sm font-semibold text-[#E7E9F2]">{message.subject || "No subject"}</h2>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#B7BDD0]">{message.body}</p>
                  <div className="mt-5 space-y-2">
                    {replyError && <p role="alert" className="text-xs text-[#F58B98]">{replyError}</p>}
                    <textarea value={replyDrafts[message.id] ?? ""} onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [message.id]: event.target.value }))} rows={3} minLength={10} placeholder="Reply to this marketplace message…" className="w-full resize-y rounded-xl border border-white/10 bg-[#0B0F1D] px-3 py-2.5 text-sm text-white outline-none focus:border-[#7559E8]" />
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => void sendReply(message)} disabled={sendingReply === message.id || (replyDrafts[message.id] ?? "").trim().length < 10} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{sendingReply === message.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply</button>
                      {replyUrl && <a href={replyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-[#B7BDD0] hover:bg-white/5"><Mail size={14} /> Email instead <ExternalLink size={12} /></a>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
