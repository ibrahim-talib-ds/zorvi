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
  const res = await fetch(API_BASE + "/notifications", {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to load notifications.");
  return await res.json();
}

export async function markNotificationRead(token: string, id: string): Promise<boolean> {
  const res = await fetch(API_BASE + "/notifications/" + id + "/read", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  return res.ok;
}

export async function markAllRead(token: string): Promise<boolean> {
  const res = await fetch(API_BASE + "/notifications/mark-all-read", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  return res.ok;
}

export async function deleteNotification(token: string, id: string): Promise<boolean> {
  const res = await fetch(API_BASE + "/notifications/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });
  return res.ok;
}
