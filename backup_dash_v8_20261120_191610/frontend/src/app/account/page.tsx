"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, BookOpen, Award, ArrowRight, Loader2, PlayCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Stats {
  orders_count: number;
  courses_enrolled: number;
  lessons_completed: number;
}

interface Order {
  id: string;
  total_cents: number;
  status: string;
  created_at: string;
  items: { product_title: string }[];
}

interface EnrolledCourse {
  id: string;
  course_title: string;
  course_slug: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
}

export default function AccountDashboardPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !token) return;
    (async () => {
      try {
        // Fetch User Stats
        const statsRes = await fetchWithAuth(`${API_BASE}/users/me/stats`, {});
        if (statsRes.ok) setStats(await statsRes.json());

        // Fetch Recent Orders
        const ordersRes = await fetchWithAuth(`${API_BASE}/orders?limit=3`, {});
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setRecentOrders(Array.isArray(ordersData) ? ordersData : []);
        }

        // Fetch Enrolled Courses
        const coursesRes = await fetchWithAuth(`${API_BASE}/my-courses`, {});
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          const mapped = (Array.isArray(coursesData) ? coursesData : []).map((c: any) => ({
            id: c.id || c.course_id,
            course_title: c.course_title || c.title || "Untitled Course",
            course_slug: c.course_slug || c.slug || "",
            total_lessons: c.total_lessons || 0,
            completed_lessons: c.completed_lessons || 0,
            progress_percent: c.progress_percent ?? c.percent_complete ?? 0,
          }));
          setCourses(mapped.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  const kpis = [
    { label: "My Orders", value: stats?.orders_count ?? 0, icon: ShoppingBag, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10", href: "/account/orders" },
    { label: "Courses", value: stats?.courses_enrolled ?? 0, icon: BookOpen, color: "text-[#F5A623]", bg: "bg-[#F5A623]/10", href: "/account/courses" },
    { label: "Lessons Completed", value: stats?.lessons_completed ?? 0, icon: PlayCircle, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10", href: "/account/courses" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white">Welcome back, {user?.full_name?.split(' ')[0] || "Learner"}!</h1>
        <p className="text-sm text-[#B7BDD0] mt-1">Here is your learning progress and recent activity.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <Link key={kpi.label || i} href={kpi.href} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex items-center gap-4 hover:border-white/10 hover:bg-white/[0.04] transition group">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-1">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-white">{kpi.value}</p>
            </div>
            <ArrowRight size={16} className="text-[#7A8199] ml-auto opacity-0 group-hover:opacity-100 transition" />
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="font-display text-lg font-bold text-white">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm text-[#A78BFA] hover:text-white transition flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#7A8199]">No orders yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentOrders.map((o, i) => (
                <Link key={o.id || i} href={`/account/orders/${o.id}`} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition block">
                  <div>
                    <p className="text-sm text-white font-medium">{o.items?.[0]?.product_title || "Project"}</p>
                    <p className="text-xs text-[#7A8199] font-mono mt-0.5">#{o.id.substring(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${(o.total_cents / 100).toFixed(0)}</p>
                    <p className={`text-[10px] uppercase tracking-wider font-mono mt-0.5 ${o.status === 'paid' ? 'text-[#22C58B]' : o.status === 'cancelled' ? 'text-[#F05D70]' : 'text-[#F5A623]'}`}>
                      {o.status.replace("_", " ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Courses */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="font-display text-lg font-bold text-white">My Courses</h2>
            <Link href="/account/courses" className="text-sm text-[#A78BFA] hover:text-white transition flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          
          {courses.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#7A8199]">Not enrolled in any courses yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {courses.map((c, i) => (
                <Link key={c.id || i} href={`/courses/${c.course_slug}`} className="p-4 block hover:bg-white/[0.02] transition">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white font-medium truncate pr-4">{c.course_title}</p>
                    <p className="text-xs font-bold text-white">{Math.round(c.progress_percent || 0)}%</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF]" style={{ width: `${Math.min(100, Math.max(0, c.progress_percent || 0))}%` }} />
                    </div>
                    <p className="text-[10px] text-[#7A8199] whitespace-nowrap">{c.completed_lessons}/{c.total_lessons} lessons</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Link href="/account/profile" className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
          <div>
            <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">Edit Profile</p>
            <p className="text-xs text-[#7A8199]">Name, avatar</p>
          </div>
          <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
        </Link>
        <Link href="/account/settings" className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
          <div>
            <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">Settings</p>
            <p className="text-xs text-[#7A8199]">Password, security</p>
          </div>
          <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
        </Link>
        <Link href="/courses" className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
          <div>
            <p className="text-sm font-medium text-white group-hover:text-[#A78BFA] transition-colors">Browse Courses</p>
            <p className="text-xs text-[#7A8199]">Find new skills</p>
          </div>
          <ArrowRight size={16} className="text-[#7A8199] group-hover:text-white transition" />
        </Link>
      </div>
    </div>
  );
}
