"use client";

// app/account/page.tsx - IBRANT User Dashboard (v11)
//
// ONE-FILE redesign: replaces only this page. The account shell
// (AccountSidebar, mobile drawer, auth guard) comes from
// app/account/layout.tsx and is NOT touched or duplicated here.
//
// Data: only the endpoints your app already uses -
//   GET /users/me/stats  -> orders_count, courses_enrolled, lessons_completed
//   GET /my-courses      -> enrolled courses with progress
//   GET /orders?limit=3  -> recent orders
// Honest rules: no invented learning-hours or certificates - sections that
// would need data the API does not provide are omitted, not faked.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  PlayCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

// ============================================================================
// types (mirror the real API shapes your current page already uses)
// ============================================================================
interface UserStats {
  orders_count: number;
  courses_enrolled: number;
  lessons_completed: number;
  [key: string]: unknown;
}
interface EnrolledCourse {
  id: string;
  course_title: string;
  course_slug: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  next_lesson_id: string | null;
}
interface Order {
  id: string;
  total_cents: number;
  status: string;
  created_at: string;
  items?: { product_title: string }[];
  [key: string]: unknown;
}
type Sec = "loading" | "ready" | "error";

// ============================================================================
// helpers
// ============================================================================
function fmtNum(n: number): string {
  return n.toLocaleString();
}
function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
function orderStatusCls(status: string): string {
  return status === "paid"
    ? "text-[#22C58B]"
    : status === "cancelled"
      ? "text-[#F05D70]"
      : "text-[#F5A623]";
}

// ============================================================================
// shared section states
// ============================================================================
function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rounded-lg bg-white/[0.04] h-9" style={{ width: `${100 - ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}
function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] p-6 text-center">
      <AlertCircle size={20} className="text-[#F05D70]" />
      <p className="text-sm text-[#F05D70]">Unable to load this section. Please try again.</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
      >
        <RefreshCw size={12} /> Try again
      </button>
    </div>
  );
}
function EmptyBox({ title, hint, actionLabel, actionHref }: { title: string; hint?: ReactNode; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <p className="text-sm font-medium text-white">{title}</p>
      {hint && <p className="max-w-sm text-xs text-[#7A8199]">{hint}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// hero
// ============================================================================
function LearnerIllustration() {
  return (
    <svg viewBox="0 0 220 160" className="h-full w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="uCap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B70FF" />
          <stop offset="100%" stopColor="#4330C8" />
        </linearGradient>
        <radialGradient id="uGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7559E8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7559E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="165" cy="80" r="95" fill="url(#uGlow)" />
      {/* laptop */}
      <rect x="58" y="96" width="64" height="40" rx="6" fill="#1B2347" />
      <rect x="63" y="101" width="54" height="30" rx="3" fill="#2A3663" />
      <rect x="52" y="136" width="76" height="7" rx="3.5" fill="#33417A" />
      {/* play bubble */}
      <circle cx="150" cy="62" r="16" fill="url(#uCap)" />
      <path d="M145 54 L160 62 L145 70 Z" fill="#FFFFFF" />
      {/* book stack */}
      <rect x="158" y="112" width="52" height="12" rx="4" fill="#F5A623" opacity="0.85" />
      <rect x="162" y="100" width="46" height="12" rx="4" fill="#22C58B" opacity="0.8" />
      <rect x="156" y="124" width="54" height="12" rx="4" fill="#5B9EFF" opacity="0.85" />
      {/* cap */}
      <path d="M188 28 L216 40 L188 52 L160 40 Z" fill="url(#uCap)" />
      <path d="M176 44 v10 c0 5 6 8 12 8 s12 -3 12 -8 V44 l-12 5 z" fill="#1B1442" opacity="0.9" />
    </svg>
  );
}
function Hero({
  name,
  resumeHref,
  resumeLabel,
  enrolled,
}: {
  name: string;
  resumeHref: string;
  resumeLabel: string;
  enrolled: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#201A52] via-[#141A35] to-[#0B0F1D] px-6 py-7 lg:px-10 lg:py-9">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 220px at 85% 20%, rgba(91,83,236,0.22), transparent 65%), radial-gradient(420px 180px at 10% 110%, rgba(91,155,255,0.10), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/40 bg-[#7559E8]/15 px-4 py-1.5 text-xs font-semibold text-[#C9B8FF]">
            Welcome back, {name}! <span aria-hidden="true">👋</span>
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Continue Your Learning Journey
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#B7BDD0] sm:text-base">
            {enrolled > 0
              ? "Keep going! You're making great progress."
              : "Browse the catalog and enroll in your first course to get started."}
          </p>
          <Link
            href={resumeHref}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7559E8]/25 hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"
          >
            {resumeLabel} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="hidden h-32 flex-shrink-0 md:block lg:h-40">
          <LearnerIllustration />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// progress ring (real average across enrolled courses)
// ============================================================================
function ProgressRing({ pct, size = 150 }: { pct: number; size?: number }) {
  const R = 58;
  const CIRC = 2 * Math.PI * R;
  const len = (Math.min(Math.max(pct, 0), 100) / 100) * CIRC;
  return (
    <svg viewBox="0 0 150 150" style={{ height: size, width: size }} role="img" aria-label={`Overall progress ${pct}%`}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22C58B" />
          <stop offset="100%" stopColor="#5B9EFF" />
        </linearGradient>
      </defs>
      <circle cx="75" cy="75" r={R} fill="none" stroke="#1A2142" strokeWidth="14" />
      <circle
        cx="75"
        cy="75"
        r={R}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(len - 2, 0.5)} ${CIRC - Math.max(len - 2, 0.5)}`}
        transform="rotate(-90 75 75)"
      />
      <text x="75" y="71" textAnchor="middle" fill="#FFFFFF" fontSize="26" fontWeight="800" style={{ fontFamily: "inherit" }}>
        {Math.round(pct)}%
      </text>
      <text x="75" y="92" textAnchor="middle" fill="#929CBD" fontSize="9" style={{ fontFamily: "inherit" }}>
        Overall Progress
      </text>
    </svg>
  );
}

// ============================================================================
// page
// ============================================================================
export default function AccountDashboardPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statsState, setStatsState] = useState<Sec>("loading");
  const [coursesState, setCoursesState] = useState<Sec>("loading");
  const [ordersState, setOrdersState] = useState<Sec>("loading");

  const loadStats = useCallback(async () => {
    setStatsState("loading");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me/stats`, {});
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setStatsState("ready");
    } catch {
      setStatsState("error");
    }
  }, []);
  const loadCourses = useCallback(async () => {
    setCoursesState("loading");
    try {
      const res = await fetchWithAuth(`${API_BASE}/my-courses`, {});
      if (!res.ok) throw new Error();
      const data: unknown = await res.json();
      const raw = Array.isArray(data) ? data : [];
      const mapped: EnrolledCourse[] = raw.map((c: Record<string, unknown>) => ({
        id: String(c.id || c.course_id || ""),
        course_title: String(c.course_title || c.title || "Untitled Course"),
        course_slug: String(c.course_slug || c.slug || ""),
        total_lessons: Number(c.total_lessons || 0),
        completed_lessons: Number(c.completed_lessons || 0),
        progress_percent: Number(c.progress_percent ?? c.percent_complete ?? 0),
        next_lesson_id: typeof c.next_lesson_id === "string" ? c.next_lesson_id : null,
      }));
      setCourses(mapped);
      setCoursesState("ready");
    } catch {
      setCoursesState("error");
    }
  }, []);
  const loadOrders = useCallback(async () => {
    setOrdersState("loading");
    try {
      const res = await fetchWithAuth(`${API_BASE}/orders?limit=3`, {});
      if (!res.ok) throw new Error();
      const data: unknown = await res.json();
      setOrders(Array.isArray(data) ? (data as Order[]) : []);
      setOrdersState("ready");
    } catch {
      setOrdersState("error");
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadStats();
    void loadCourses();
    void loadOrders();
  }, [token, authLoading, loadStats, loadCourses, loadOrders]);

  const firstName: string =
    user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Learner";

  // real values
  const enrolled = statsState === "ready" ? stats?.courses_enrolled ?? 0 : courses.length;
  const lessonsDone = statsState === "ready"
    ? stats?.lessons_completed ?? courses.reduce((sum, course) => sum + course.completed_lessons, 0)
    : courses.reduce((sum, course) => sum + course.completed_lessons, 0);
  const ordersCount = statsState === "ready" ? stats?.orders_count ?? 0 : null;
  const avgProgress = useMemo(() => {
    if (coursesState !== "ready" || courses.length === 0) return 0;
    return courses.reduce((s, c) => s + Math.min(Math.max(c.progress_percent, 0), 100), 0) / courses.length;
  }, [courses, coursesState]);

  // resume target: the course currently in progress (0<p<100), else first, else catalog
  const resumeCourse =
    courses.find((c) => c.progress_percent > 0 && c.progress_percent < 100) ??
    courses.find((c) => c.progress_percent === 0) ??
    courses[0];
  const resumeHref = resumeCourse?.course_slug
    ? resumeCourse.progress_percent < 100 && resumeCourse.next_lesson_id
      ? `/courses/${resumeCourse.course_slug}/lessons/${resumeCourse.next_lesson_id}`
      : `/courses/${resumeCourse.course_slug}`
    : "/courses";
  const resumeLabel = resumeCourse
    ? resumeCourse.progress_percent >= 100
      ? "Review Course"
      : resumeCourse.progress_percent > 0
        ? "Resume Learning"
        : "Start Learning"
    : "Browse Courses";

  // honest goals computed from real numbers
  const goals: string[] = [];
  if (coursesState === "ready") {
    if (enrolled === 0) {
      goals.push("Enroll in your first course");
    } else {
      const nextLesson = courses.find((c) => c.progress_percent < 100);
      if (nextLesson) {
        goals.push(
          `Complete ${Math.max(nextLesson.total_lessons - nextLesson.completed_lessons, 1)} more lesson${
            Math.max(nextLesson.total_lessons - nextLesson.completed_lessons, 1) === 1 ? "" : "s"
          } in "${nextLesson.course_title}"`
        );
      }
      if (lessonsDone < 10) goals.push(`Reach 10 completed lessons (${lessonsDone}/10)`);
      const nearDone = courses.find((c) => c.progress_percent >= 50 && c.progress_percent < 100);
      if (nearDone) goals.push(`Finish "${nearDone.course_title}" — you're ${Math.round(nearDone.progress_percent)}% there`);
    }
  }

  const kpis: Array<{ label: string; value: string; icon: ReactNode; color: string; bg: string; href: string }> = [
    {
      label: "My Enrolled Courses",
      value: fmtNum(enrolled),
      icon: <BookOpen size={20} />,
      color: "text-[#A78BFA]",
      bg: "bg-[#7559E8]/15",
      href: "/account/courses",
    },
    {
      label: "Lessons Completed",
      value: fmtNum(lessonsDone),
      icon: <PlayCircle size={20} />,
      color: "text-[#22C58B]",
      bg: "bg-[#22C58B]/15",
      href: "/account/courses",
    },
    {
      label: "Average Progress",
      value: `${Math.round(avgProgress)}%`,
      icon: <GraduationCap size={20} />,
      color: "text-[#5B9EFF]",
      bg: "bg-[#5B9EFF]/15",
      href: "/account/courses",
    },
    {
      label: "My Orders",
      value: ordersCount === null ? "—" : fmtNum(ordersCount),
      icon: <ShoppingBag size={20} />,
      color: "text-[#F5A623]",
      bg: "bg-[#F5A623]/15",
      href: "/account/orders",
    },
  ];

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A78BFA] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Hero name={firstName} resumeHref={resumeHref} resumeLabel={resumeLabel} enrolled={enrolled} />

      {/* KPI cards - all real */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.05] sm:p-5"
          >
            <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${k.bg} ${k.color}`}>
              {k.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#929CBD]">{k.label}</p>
              <p className="font-display text-2xl font-extrabold text-white">{k.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {statsState === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] px-4 py-3">
          <p className="text-xs text-[#F05D70]">Your stats failed to load.</p>
          <button
            onClick={() => void loadStats()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* My Courses */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 xl:col-span-2 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7559E8]/15 text-[#A78BFA]">
                <BookOpen size={16} />
              </span>
              My Courses
            </h2>
            <Link href="/account/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A78BFA] transition hover:text-white">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {coursesState === "loading" ? (
            <Skeleton lines={3} />
          ) : coursesState === "error" ? (
            <ErrorBox onRetry={loadCourses} />
          ) : courses.length === 0 ? (
            <EmptyBox
              title="Not enrolled in any courses yet."
              hint="Your enrolled courses and progress will show up here."
              actionLabel="Browse Courses"
              actionHref="/courses"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((c) => {
                const pct = Math.min(Math.max(Math.round(c.progress_percent), 0), 100);
                const initial = (c.course_title || "?").trim().charAt(0).toUpperCase();
                return (
                  <Link
                    key={c.id || c.course_slug}
                    href={c.course_slug
                      ? c.progress_percent < 100 && c.next_lesson_id
                        ? `/courses/${c.course_slug}/lessons/${c.next_lesson_id}`
                        : `/courses/${c.course_slug}`
                      : "/account/courses"}
                    className="group rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7559E8]"
                  >
                    <div className="flex h-24 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                      <span className="font-display text-3xl font-extrabold text-[#A78BFA]/60">{initial}</span>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-white">{c.course_title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#22C58B] to-[#5B9EFF]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-[#B7BDD0]">{pct}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#7A8199]">
                      {c.completed_lessons}/{c.total_lessons} lessons
                    </p>
                    <span className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white transition group-hover:brightness-110">
                      {pct > 0 ? "Continue" : "Start Now"} <ArrowRight size={12} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Your Learning Progress */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C58B]/15 text-[#22C58B]">
              <GraduationCap size={16} />
            </span>
            Your Learning Progress
          </h2>
          {coursesState === "loading" ? (
            <Skeleton lines={3} />
          ) : coursesState === "error" ? (
            <ErrorBox onRetry={loadCourses} />
          ) : courses.length === 0 ? (
            <EmptyBox title="No progress yet." hint="Enroll in a course to start tracking your progress." actionLabel="Browse Courses" actionHref="/courses" />
          ) : (
            <div className="flex flex-col items-center gap-5">
              <ProgressRing pct={avgProgress} />
              {goals.length > 0 && (
                <ul className="w-full space-y-2.5">
                  {goals.slice(0, 3).map((g) => (
                    <li key={g} className="flex items-start gap-2 text-xs text-[#B7BDD0]">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#22C58B]/15 text-[#22C58B]">✓</span>
                      <span className="min-w-0">{g}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Orders (real activity with timestamps) */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B9EFF]/15 text-[#5B9EFF]">
                <ShoppingBag size={16} />
              </span>
              Recent Orders
            </h2>
            <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A78BFA] transition hover:text-white">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {ordersState === "loading" ? (
            <Skeleton lines={3} />
          ) : ordersState === "error" ? (
            <ErrorBox onRetry={loadOrders} />
          ) : orders.length === 0 ? (
            <EmptyBox title="No orders yet." hint="Your purchases will appear here." />
          ) : (
            <ol className="relative space-y-4 pl-1">
              {orders.map((o, i) => (
                <li key={o.id || i} className="relative flex items-start gap-3">
                  {i < orders.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-white/10" aria-hidden="true" />}
                  <span className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#5B9EFF]/15 text-[#5B9EFF]">
                    <ShoppingBag size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/account/orders/${o.id}`} className="min-w-0 flex-1 truncate text-sm text-white hover:text-[#A78BFA] transition">
                        {o.items?.[0]?.product_title || "Order"}
                      </Link>
                      <span className="text-sm font-bold text-white">${(o.total_cents / 100).toFixed(0)}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-[#7A8199]">
                      <Clock size={10} /> {relTime(o.created_at)}
                      <span className={`font-mono uppercase tracking-wider ${orderStatusCls(o.status)}`}>
                        · {o.status.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Keep Learning banner (honest: no fake certificate counts) */}
        <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#201A52] via-[#141A35] to-[#0B0F1D] p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(420px 180px at 90% 10%, rgba(91,83,236,0.25), transparent 60%)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col items-start justify-center gap-3 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5A623]/15 text-[#F5A623]">
              <Award size={22} />
            </span>
            <h2 className="font-display text-xl font-bold text-white">Level Up Your Skills</h2>
            <p className="max-w-sm text-sm text-[#B7BDD0]">
              Keep the momentum going — explore new courses and grow your streak. Certificates will appear here once
              your platform adds them.
            </p>
            <Link
              href="/courses"
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              <Sparkles size={14} /> Browse New Courses
            </Link>
          </div>
        </section>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-[#7A8199]">
        <Sparkles size={11} />
        Every number here comes from your real account data — enrolled courses, completed lessons, progress, orders.
      </p>
    </div>
  );
}
