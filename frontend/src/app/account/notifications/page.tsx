"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, CheckCircle2, ArrowRight, Trash2, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Notification {
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

export default function NotificationsHistoryPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadNotifications();
  }, [token, authLoading]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.warn("Mark all read failed:", res.status);
      }
      // Optimistically update the UI without waiting for a re-fetch
      setNotifications(notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch (err) {
      console.warn("Mark all read network error:", err);
      // Still update the UI so the user sees the change
      setNotifications(notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.warn("Mark read failed:", res.status);
      }
      setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n));
    } catch (err) {
      console.warn("Mark read network error:", err);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n));
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete this notification?")) return;
    // Optimistically remove from UI
    setNotifications(notifications.filter((n) => n.id !== id));
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn("Delete failed:", err);
      // Reload to restore if failed
      loadNotifications();
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return n.read_at === null;
    if (filter === "read") return n.read_at !== null;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white flex items-center gap-3">
            <Bell size={28} className="text-[#F5A623]" /> Notifications
          </h1>
          <p className="text-[#B7BDD0] mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
          >
            <CheckCircle2 size={16} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Filter size={14} className="text-[#7A8199]" />
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-[#7559E8] text-white"
                : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 hover:text-white"
            }`}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#F05D70] text-white text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <Bell size={32} className="text-[#7A8199] mx-auto mb-4" />
          <p className="text-[#7A8199]">
            {filter === "all" ? "No notifications yet." : `No ${filter} notifications.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`group rounded-xl border p-5 transition ${
                n.read_at
                  ? "border-white/5 bg-white/[0.01]"
                  : "border-[#7559E8]/30 bg-[#7559E8]/5"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === "success" ? "bg-[#22C58B]/10" :
                  n.type === "warning" ? "bg-[#F5A623]/10" :
                  "bg-[#5B9EFF]/10"
                }`}>
                  <Bell size={18} className={
                    n.type === "success" ? "text-[#22C58B]" :
                    n.type === "warning" ? "text-[#F5A623]" :
                    "text-[#5B9EFF]"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">{n.title}</p>
                    {!n.read_at && (
                      <span className="w-2 h-2 rounded-full bg-[#7559E8]" />
                    )}
                    {n.is_broadcast && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#5B9EFF]/10 text-[#5B9EFF] font-mono uppercase">
                        Broadcast
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#B7BDD0] whitespace-pre-line">{n.message}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <p className="text-xs text-[#7A8199] font-mono">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                    {n.href && (
                      <Link
                        href={n.href}
                        className="text-xs text-[#A78BFA] hover:text-white transition inline-flex items-center gap-1"
                      >
                        Go to page <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {!n.read_at && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-2 rounded hover:bg-[#22C58B]/10 text-[#22C58B] transition"
                      title="Mark as read"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-2 rounded hover:bg-[#F05D70]/10 text-[#F05D70] transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
