"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, BookOpen, ArrowRight, Loader2, PlayCircle, User, Settings } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
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

const STATUS_STYLES: Record<string, string> = {
  paid: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#1EA877]",
  pending: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#E09520]",
  cancelled: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
  failed: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

function StatusPill({ status }: { status: string }) {
  const cls =
    STATUS_STYLES[status] ||
    "border-bg-border bg-bg-elevated text-text-muted";
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider " +
        cls
      }
    >
      {status.replace("_", " ")}
    </span>
  );
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
    { label: "dashboard.page.myOrders", value: stats?.orders_count ?? 0, icon: ShoppingBag, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10", href: "/account/orders" },
    { label: "dashboard.nav.myCourses", value: stats?.courses_enrolled ?? 0, icon: BookOpen, color: "text-[#F5A623]", bg: "bg-[#F5A623]/10", href: "/account/courses" },
    { label: "dashboard.page.lessonsCompleted", value: stats?.lessons_completed ?? 0, icon: PlayCircle, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10", href: "/account/courses" },
  ];

  const quickActions = [
    { href: "/account/profile", titleKey: "dashboard.page.editProfile", subKey: "dashboard.page.editProfileSub", icon: User, color: "text-[#5B9EFF]", bg: "bg-[#5B9EFF]/10" },
    { href: "/account/settings", titleKey: "dashboard.nav.settings", subKey: "dashboard.page.settingsSub", icon: Settings, color: "text-[#A78BFA]", bg: "bg-[#A78BFA]/10" },
    { href: "/courses", titleKey: "dashboard.page.browseCourses", subKey: "dashboard.page.browseCoursesSub", icon: BookOpen, color: "text-[#22C58B]", bg: "bg-[#22C58B]/10" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          <Tr k="dashboard.page.welcomeBack" />
          {user?.full_name ? `, ${user.full_name.split(" ")[0]}!` : "!"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          <Tr k="dashboard.page.learningProgress" />
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi, i) => (
          <Link
            key={kpi.label || i}
            href={kpi.href}
            className="group flex items-center gap-4 rounded-2xl border border-bg-border bg-bg-surface p-5 transition-colors hover:border-[#A78BFA]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.bg}`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-mono uppercase tracking-wider text-text-muted">
                <Tr k={kpi.label} />
              </p>
              <p className="truncate text-2xl font-extrabold text-text-primary">{kpi.value}</p>
            </div>
            <ArrowRight
              size={16}
              className="shrink-0 text-[#A78BFA] opacity-0 transition group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Recent Orders */}
        <div className="overflow-hidden rounded-2xl border border-bg-border bg-bg-surface">
          <div className="flex items-center justify-between border-b border-bg-border px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-bold text-text-primary">
              <Tr k="dashboard.page.recentOrders" />
            </h2>
            <Link
              href="/account/orders"
              className="flex items-center gap-1 text-sm text-[#A78BFA] transition hover:text-[#8B70FF]"
            >
              <Tr k="dashboard.page.viewAll" /> <ArrowRight size={14} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag size={28} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-muted">
                <Tr k="dashboard.page.noOrders" />
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bg-border">
              {recentOrders.map((o, i) => (
                <Link
                  key={o.id || i}
                  href={`/account/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-bg-elevated/60 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {o.items?.[0]?.product_title || <Tr k="dashboard.page.project" />}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-text-muted">
                      #{o.id.substring(0, 8)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-text-primary">
                      ${(o.total_cents / 100).toFixed(0)}
                    </p>
                    <div className="mt-1">
                      <StatusPill status={o.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Courses */}
        <div className="overflow-hidden rounded-2xl border border-bg-border bg-bg-surface">
          <div className="flex items-center justify-between border-b border-bg-border px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-bold text-text-primary">
              <Tr k="dashboard.nav.myCourses" />
            </h2>
            <Link
              href="/account/courses"
              className="flex items-center gap-1 text-sm text-[#A78BFA] transition hover:text-[#8B70FF]"
            >
              <Tr k="dashboard.page.viewAll" /> <ArrowRight size={14} />
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen size={28} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-muted">
                <Tr k="dashboard.page.notEnrolled" />
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bg-border">
              {courses.map((c, i) => (
                <Link
                  key={c.id || i}
                  href={`/courses/${c.course_slug}`}
                  className="block p-4 transition-colors hover:bg-bg-elevated/60 sm:px-6"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate pr-2 text-sm font-medium text-text-primary">
                      {c.course_title}
                    </p>
                    <p className="shrink-0 text-xs font-bold text-text-primary">
                      {Math.round(c.progress_percent || 0)}%
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF]"
                        style={{ width: `${Math.min(100, Math.max(0, c.progress_percent || 0))}%` }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[10px] text-text-muted">
                      {c.completed_lessons}/{c.total_lessons} <Tr k="dashboard.page.lessons" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl border border-bg-border bg-bg-surface p-4 transition hover:border-[#A78BFA]/30 hover:bg-bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
              <a.icon size={18} className={a.color} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary transition-colors group-hover:text-[#A78BFA]">
                <Tr k={a.titleKey} />
              </span>
              <span className="block truncate text-xs text-text-muted">
                <Tr k={a.subKey} />
              </span>
            </span>
            <ArrowRight
              size={16}
              className="shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-text-primary"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
