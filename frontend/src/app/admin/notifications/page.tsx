"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Send, Trash2, Filter, Users, User } from "lucide-react";
import { UserSearchDropdown } from "@/components/admin/UserSearchDropdown";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface RealNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  href: string | null;
  type: string;
  is_broadcast: boolean;
  read_at: string | null;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");

  // Form state
  const [form, setForm] = useState({
    title: "",
    message: "",
    href: "",
    type: "info",
    sendTo: "all" as "all" | "multiple",
  });
  const [sending, setSending] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/admin/notifications`;
      if (filterUser) url += `?user_id=${filterUser}`;
      const res = await fetchWithAuth(url, {});
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token, filterUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.title.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      const body: any = {
        title: form.title.trim(),
        message: form.message.trim(),
        href: form.href.trim() || null,
        type: form.type,
        user_ids: form.sendTo === "multiple" ? selectedUserIds : null,
        is_broadcast: form.sendTo === "all",
      };

      const res = await fetchWithAuth(`${API_BASE}/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      setForm({ title: "", message: "", href: "", type: "info", sendTo: "all" });
      setSelectedUserIds([]);
      setShowForm(false);
      await loadNotifications();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterRead === "unread") return n.read_at === null;
    if (filterRead === "read") return n.read_at !== null;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white flex items-center gap-3">
            <Bell size={28} className="text-[#F5A623]" /> Notifications
          </h1>
          <p className="text-[#B7BDD0] mt-1">
            Send notifications to users and manage history.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
        >
          <Send size={16} /> Send Notification
        </button>
      </div>

      {/* Send Form */}
      {showForm && (
        <form
          onSubmit={handleSend}
          className="mb-8 rounded-2xl border border-[#7559E8]/30 bg-[#7559E8]/5 p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-white">New Notification</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g., New course available"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              rows={3}
              placeholder="Write the message here..."
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none resize-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Link (optional)</label>
              <input
                type="text"
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                placeholder="/marketplace or /courses"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Send To</label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, sendTo: "all" })}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  form.sendTo === "all"
                    ? "border-[#7559E8] bg-[#7559E8]/20 text-white"
                    : "border-white/10 bg-[#0B0F1D] text-[#B7BDD0] hover:border-white/20"
                }`}
              >
                <Users size={16} /> All Users
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, sendTo: "multiple" })}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  form.sendTo === "multiple"
                    ? "border-[#7559E8] bg-[#7559E8]/20 text-white"
                    : "border-white/10 bg-[#0B0F1D] text-[#B7BDD0] hover:border-white/20"
                }`}
              >
                <User size={16} /> Specific Users
              </button>
            </div>

            {form.sendTo === "multiple" && (
              <UserSearchDropdown
                selectedIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 rounded-lg bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#7A8199]" />
          <span className="text-sm text-[#7A8199]">Status:</span>
          {(["all", "unread", "read"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterRead(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filterRead === s
                  ? "bg-[#7559E8] text-white"
                  : "bg-white/5 text-[#B7BDD0] hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          placeholder="Filter by user ID"
          className="ml-auto rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-1.5 text-xs text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none font-mono w-64"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <Bell size={32} className="text-[#7A8199] mx-auto mb-4" />
          <p className="text-[#7A8199]">No notifications match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-5 transition ${
                n.read_at
                  ? "border-white/5 bg-white/[0.01] opacity-70"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.is_broadcast ? "bg-[#5B9EFF]/10" : "bg-[#F5A623]/10"
                }`}>
                  {n.is_broadcast ? (
                    <Users size={18} className="text-[#5B9EFF]" />
                  ) : (
                    <User size={18} className="text-[#F5A623]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">{n.title}</p>
                    {n.read_at ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C58B]/10 text-[#22C58B] font-mono">READ</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#F5A623]/10 text-[#F5A623] font-mono">UNREAD</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#7A8199] font-mono">
                      {n.is_broadcast ? "Broadcast" : "Targeted"}
                    </span>
                  </div>
                  <p className="text-sm text-[#B7BDD0]">{n.message}</p>
                  {n.href && (
                    <p className="text-xs text-[#A78BFA] mt-1 font-mono">→ {n.href}</p>
                  )}
                  <p className="text-xs text-[#7A8199] mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-2 rounded hover:bg-[#F05D70]/10 text-[#F05D70] transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
