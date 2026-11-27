"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MessageSquare, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

type Message = {
  id: string; sender_id: string; receiver_id: string; subject: string; body: string;
  is_read: boolean; created_at: string; sender_name: string | null;
  sender_email: string | null; receiver_name: string | null; product_title: string | null;
};

export default function AccountMessagesPage() {
  const { token, user, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Unable to load messages (${response.status}).`);
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
      const unread = (Array.isArray(data) ? data : []).filter((item: Message) => item.receiver_id === user?.id && !item.is_read);
      await Promise.all(unread.map((item: Message) => fetch(`${API_BASE}/messages/${item.id}/read`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load messages.");
    } finally { setLoading(false); }
  }, [token, user?.id]);

  useEffect(() => { if (!authLoading) { if (token) void load(); else setLoading(false); } }, [authLoading, token, load]);

  const conversations = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const key = [message.sender_id, message.receiver_id].sort().join(":");
      map.set(key, [...(map.get(key) ?? []), message]);
    }
    return [...map.entries()].map(([key, items]) => ({ key, items: items.sort((a,b) => +new Date(a.created_at)-+new Date(b.created_at)) }));
  }, [messages]);

  const sendReply = async (message: Message, event: FormEvent) => {
    event.preventDefault();
    const body = (drafts[message.id] ?? "").trim();
    if (body.length < 10 || !token) return;
    const recipient = message.sender_id === user?.id ? message.receiver_id : message.sender_id;
    if (!recipient || recipient === user?.id) return;
    setSending(message.id);
    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: recipient, subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`, body }),
      });
      if (!response.ok) throw new Error(await response.text());
      setDrafts((prev) => ({ ...prev, [message.id]: "" }));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send reply."); }
    finally { setSending(null); }
  };

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#A78BFA]" size={30} /></div>;

  return <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-7 flex items-center justify-between gap-3">
      <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]"><MessageSquare size={14}/> Marketplace communication</p><h1 className="font-display text-3xl font-extrabold text-white">My Messages</h1><p className="mt-1 text-sm text-[#9299AE]">Messages with sellers and the ibrant team.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#B7BDD0] hover:bg-white/5"><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/10 p-3 text-sm text-[#F58B98]">{error}</div>}
    {conversations.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"><Mail size={28} className="mx-auto mb-3 text-[#7A8199]"/><h2 className="font-semibold text-white">No messages yet</h2><p className="mt-2 text-sm text-[#7A8199]">When you contact a seller or receive a reply, your conversation will appear here.</p></div> :
      <div className="space-y-5">{conversations.map(({key,items}) => <section key={key} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
        <div className="border-b border-white/[0.07] px-5 py-4"><h2 className="font-semibold text-white">{items[0].subject}</h2>{items[0].product_title && <p className="mt-1 text-xs text-[#8BBEFF]">Product: {items[0].product_title}</p>}</div>
        <div className="space-y-4 p-5">{items.map((message) => <article key={message.id} className={`max-w-[90%] rounded-xl border p-4 ${message.sender_id === user?.id ? "ml-auto border-[#7559E8]/25 bg-[#7559E8]/10" : "border-white/[0.07] bg-[#0B0F1D]/70"}`}>
          <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#C8BDFE]">{message.sender_id === user?.id ? "You" : (message.sender_name || "Marketplace user")}</span><time className="text-[11px] text-[#7A8199]">{new Date(message.created_at).toLocaleString()}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#D7DDF3]">{message.body}</p>
          {message.id === items[items.length - 1].id && <form onSubmit={(event) => void sendReply(message,event)} className="mt-3 flex gap-2"><textarea value={drafts[message.id] ?? ""} onChange={(event) => setDrafts((prev) => ({...prev,[message.id]:event.target.value}))} rows={2} minLength={10} placeholder="Write a reply (at least 10 characters)…" className="min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-2 text-sm text-white outline-none focus:border-[#7559E8]"/><button disabled={sending === message.id || (drafts[message.id] ?? "").trim().length < 10} className="self-end rounded-lg bg-[#7559E8] p-3 text-white disabled:opacity-40" aria-label="Send reply">{sending === message.id ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}</button></form>}
        </article>)}</div>
      </section>)}</div>}
  </div>;
}
