"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Calendar, Shield, Package, GraduationCap, CheckCircle2, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { ProfileForm } from "./ProfileForm";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  roles: Role[];
}

interface Stats {
  orders_count: number;
  courses_enrolled: number;
  lessons_completed: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/account/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [userRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/users/me/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (userRes.ok) setUser(await userRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const isAdmin = user.roles.some((r) => r.name === "admin" || r.name === "super_admin");
  const roleBadge = isAdmin ? "Administrator" : "Member";
  const roleBg = isAdmin ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]" : "border-[#5B9EFF]/30 bg-[#5B9EFF]/10 text-[#5B9EFF]";

  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayName = user.full_name || user.email.split("@")[0];
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0B0F1D] py-16">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        {/* Hero card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33]/80 to-[#0B0F1D] p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7559E8]/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative flex items-start gap-6">
            <div className="w-24 h-24 rounded-full border-2 border-[#7559E8]/30 overflow-hidden bg-[#7559E8]/20 flex-shrink-0">
              {user.avatar_url ? (
                <img
                  src={`http://127.0.0.1:8010${user.avatar_url}`}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex items-center justify-center w-full h-full font-display text-3xl font-bold text-[#A78BFA]">
                  {initials}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white truncate">
                  {displayName}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium flex-shrink-0 ${roleBg}`}>
                  {roleBadge}
                </span>
                <Link
                  href="/account/settings"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#B7BDD0] hover:bg-white/10 hover:text-white transition"
                >
                  <Settings size={12} /> Settings
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#B7BDD0] mt-3">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-[#7A8199]" /> {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#7A8199]" /> Member since {joinedDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-[#5B9EFF]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#7A8199]">Orders</span>
            </div>
            <div className="font-display text-3xl font-bold text-white">{stats?.orders_count ?? 0}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={16} className="text-[#A78BFA]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#7A8199]">Courses</span>
            </div>
            <div className="font-display text-3xl font-bold text-white">{stats?.courses_enrolled ?? 0}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-[#22C58B]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#7A8199]">Lessons</span>
            </div>
            <div className="font-display text-3xl font-bold text-white">{stats?.lessons_completed ?? 0}</div>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 mb-6">
          <h2 className="font-display text-lg font-bold text-white mb-6">Edit profile</h2>
          <ProfileForm
            initialName={user.full_name || ""}
            initialAvatarUrl={user.avatar_url}
          />
        </div>

        {/* Admin panel link */}
        {isAdmin && (
          <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/5 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-[#F5A623]" />
              <div>
                <p className="text-sm font-medium text-white">You have admin access</p>
                <p className="text-xs text-[#B7BDD0]">Manage products, orders, categories, courses</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-[#0B0F1D] hover:bg-[#F5B84D] transition"
            >
              Open Admin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
