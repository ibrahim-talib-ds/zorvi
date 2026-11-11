import { API_BASE } from "@/lib/api/client";

export interface RealNotification {
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

export async function fetchMyNotifications(token: string): Promise<RealNotification[]> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function markNotificationRead(token: string, id: string) {
  await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markAllRead(token: string) {
  await fetch(`${API_BASE}/notifications/mark-all-read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteNotification(token: string, id: string) {
  await fetch(`${API_BASE}/notifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
