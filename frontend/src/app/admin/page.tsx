"use client";

// app/admin/page.tsx - IBRANT Admin Dashboard (v10.1)
//
// ONE-FILE redesign: replaces only this page in your project. The admin shell
// (top bar with search/Ctrl+K, sidebar, theme, profile) comes from
// app/admin/layout.tsx and is NOT touched or duplicated here.
//
// Data: only the endpoints your app already uses -
//   GET /admin/marketplace/stats  -> orders_count, revenue_cents, customers_count
//   GET /admin/courses            -> course list (count, status donut, growth)
//   GET /admin/orders             -> recent orders (activity, order trend)
// Every section loads independently with loading / empty / error + retry.
// No fake numbers: trends render only from real timestamps.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShoppingCart,
  ShoppingBag,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

// ============================================================================
// types (mirror the real API)
// ============================================================================
interface AdminStats {
  products_count: number;
  orders_count: number;
  revenue_cents: number;
  customers_count: number;
  [key: string]: unknown;
}
interface CourseRow {
  id: string | number;
  title: string;
  slug?: string | null;
  status?: string | null;
  difficulty?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  students_count?: number;
  enrolled_count?: number;
  enrollments?: number;
  total_students?: number;
  rating?: number;
  avg_rating?: number;
  reviews_count?: number;
  [key: string]: unknown;
}
interface OrderRow {
  id: string | number;
  user_email?: string | null;
  total_cents: number;
  status: string;
  created_at: string;
  [key: string]: unknown;
}
type Sec = "loading" | "ready" | "error";

// ============================================================================
// small helpers (formatting + time bucketing, all computed)
// ============================================================================
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtNum(n: number): string {
  return n.toLocaleString();
}
function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
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
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
type RangeKey = "7d" | "30d" | "6m" | "12m" | "all";
function bucketSeries(
  items: Array<{ created_at?: string | null }>,
  range: RangeKey
): { labels: string[]; counts: number[] } {
  const now = new Date();
  const parsed = items
    .map((it) => (it.created_at ? new Date(it.created_at) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const labels: string[] = [];
    const counts: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      labels.push(`${MONTHS[d.getMonth()]} ${d.getDate()}`);
      counts.push(0);
    }
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    for (const d of parsed) {
      if (d >= start && d <= now) {
        const idx = Math.floor((d.getTime() - start.getTime()) / 86400000);
        if (idx >= 0 && idx < days) counts[idx] += 1;
      }
    }
    return { labels, counts };
  }
  let months: number;
  if (range === "all") {
    const earliest = parsed.length
      ? new Date(Math.min(...parsed.map((d) => d.getTime())))
      : new Date(now.getFullYear(), now.getMonth(), 0);
    months = Math.max(
      1,
      Math.min((now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1, 36)
    );
  } else {
    months = range === "6m" ? 6 : 12;
  }
  const labels: string[] = [];
  const counts: number[] = [];
  const buckets: Array<{ y: number; m: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ y: d.getFullYear(), m: d.getMonth() });
    labels.push(MONTHS[d.getMonth()]);
    counts.push(0);
  }
  for (const d of parsed) {
    const idx = buckets.findIndex((b) => b.y === d.getFullYear() && b.m === d.getMonth());
    if (idx >= 0) counts[idx] += 1;
  }
  return { labels, counts };
}
function niceMax(v: number): number {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const unit = v / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * pow;
}
const STATUS_COLORS: Record<string, string> = { published: "#22C58B", draft: "#F5A623", archived: "#5B9EFF" };
function statusColor(s: string): string {
  return STATUS_COLORS[s] ?? "#A78BFA";
}
function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function extractList<T>(data: unknown, wrapKeys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of wrapKeys) if (Array.isArray(obj[k])) return obj[k] as T[];
  }
  return [];
}
function courseEnrollment(c: CourseRow): number | null {
  const v = c.students_count ?? c.enrolled_count ?? c.enrollments ?? c.total_students;
  return typeof v === "number" ? v : null;
}

// ============================================================================
// data fetching (same endpoints the app already calls)
// ============================================================================
async function fetchStats(): Promise<AdminStats> {
  const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/stats`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Stats request failed (${res.status})`);
  return (await res.json()) as AdminStats;
}
async function fetchCourses(): Promise<CourseRow[]> {
  const res = await fetchWithAuth(`${API_BASE}/admin/courses`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Courses request failed (${res.status})`);
  return extractList<CourseRow>(await res.json(), ["courses", "items", "results"]);
}
async function fetchOrders(limit = 60): Promise<OrderRow[]> {
  const res = await fetchWithAuth(`${API_BASE}/admin/orders?limit=${limit}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Orders request failed (${res.status})`);
  return extractList<OrderRow>(await res.json(), ["orders", "items", "results"]);
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
function GradIllustration() {
  return (
    <svg viewBox="0 0 220 160" className="h-full w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="heroCap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B70FF" />
          <stop offset="100%" stopColor="#4330C8" />
        </linearGradient>
        <radialGradient id="heroGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7559E8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7559E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="165" cy="80" r="95" fill="url(#heroGlow)" />
      <rect x="52" y="112" width="120" height="20" rx="6" fill="#2A3663" />
      <rect x="62" y="92" width="104" height="20" rx="6" fill="#33417A" />
      <rect x="56" y="102" width="14" height="4" rx="2" fill="#5B9EFF" opacity="0.8" />
      <rect x="130" y="122" width="16" height="4" rx="2" fill="#22C58B" opacity="0.7" />
      <path d="M110 34 L172 58 L110 82 L48 58 Z" fill="url(#heroCap)" />
      <path d="M84 66 v20 c0 8 12 14 26 14 s26 -6 26 -14 V66 l-26 10 z" fill="#1B1442" opacity="0.9" />
      <path d="M172 58 v34" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
      <circle cx="172" cy="96" r="5" fill="#F5A623" />
    </svg>
  );
}
function Hero({ name }: { name: string }) {
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
            Admin Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#B7BDD0] sm:text-base">
            Manage your platform, monitor growth, and take action — all in one place.
          </p>
        </div>
        <div className="hidden h-32 flex-shrink-0 md:block lg:h-40">
          <GradIllustration />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// KPI cards + sparkline (trend only from real timestamps)
// ============================================================================
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 96;
  const h = 34;
  if (!data || data.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24 flex-shrink-0" aria-label="No historical data yet">
        <line x1="4" y1="17" x2="92" y2="17" stroke="#4A5380" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = 4 + (i * (w - 8)) / (data.length - 1);
    const y = 30 - ((v - min) / span) * (h - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `4,30 ${line} 92,30`;
  const gid = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24 flex-shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}
function GrowthChip({ trend }: { trend?: number[] }) {
  if (!trend || trend.length < 2) return null;
  const first = trend[0];
  const last = trend[trend.length - 1];
  if (first === last) return <span className="text-[11px] font-semibold text-[#7A8199]">· stable</span>;
  const pct = Math.round(((last - first) / Math.max(first, 1)) * 100);
  const up = last > first;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-[#22C58B]" : "text-[#F05D70]"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}
interface KpiData {
  label: string;
  value: string;
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  sparkColor: string;
  href?: string;
  trend?: number[];
  trendTitle?: string;
}
function KpiCard({ k }: { k: KpiData }) {
  const inner = (
    <div className="flex h-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.05] sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${k.iconBg} ${k.iconColor}`}>
          {k.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#929CBD]">{k.label}</p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold text-white">{k.value}</span>
            <GrowthChip trend={k.trend} />
          </p>
        </div>
      </div>
      <div title={k.trend && k.trend.length >= 2 ? k.trendTitle || undefined : "No historical data yet"}>
        <Sparkline data={k.trend ?? []} color={k.sparkColor} />
      </div>
    </div>
  );
  return k.href ? (
    <Link href={k.href} className="block">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

// ============================================================================
// course status donut (real statuses, unknown -> Other)
// ============================================================================
function StatusDonut({ courses, state, onRetry }: { courses: CourseRow[] | null; state: Sec; onRetry: () => void }) {
  if (state === "loading") return <div className="animate-pulse rounded-lg bg-white/[0.04] w-full" style={{ height: 210 }} aria-busy="true" />;
  if (state === "error") return <ErrorBox onRetry={onRetry} />;
  const total = courses?.length ?? 0;
  if (total === 0) {
    return (
      <EmptyBox
        title="No courses have been created yet."
        hint="Course statistics will appear here as soon as you create your first course."
        actionLabel="Create Your First Course"
        actionHref="/admin/courses/new"
      />
    );
  }
  const order = ["published", "draft", "archived"];
  const counts = new Map<string, number>();
  for (const c of courses!) {
    const k = (c.status || "other").toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const slices = order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ key: k, label: statusLabel(k), count: counts.get(k) ?? 0, color: statusColor(k) }));
  const others = [...counts.keys()].filter((k) => !order.includes(k));
  const otherCount = others.reduce((s, k) => s + (counts.get(k) ?? 0), 0);
  if (otherCount > 0) {
    slices.push({ key: "other", label: others.length === 1 ? statusLabel(others[0]) : "Other", count: otherCount, color: "#A78BFA" });
  }
  const R = 62;
  const CIRC = 2 * Math.PI * R;
  const size = 168;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <svg viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0" style={{ height: 168, width: 168 }} role="img" aria-label={`Course status distribution, ${total} courses total`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#1A2142" strokeWidth="20" />
        {slices.map((s) => {
          const len = (s.count / total) * CIRC;
          const dash = `${Math.max(len - 2, 0.5)} ${CIRC - Math.max(len - 2, 0.5)}`;
          const el = (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="800" style={{ fontFamily: "inherit" }}>
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" fill="#929CBD" fontSize="10" style={{ fontFamily: "inherit" }}>
          Total Courses
        </text>
      </svg>
      <div className="w-full max-w-xs space-y-3">
        {slices.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-sm text-[#B7BDD0]">{s.label}</span>
            <span className="text-sm font-bold text-white">{s.count}</span>
            <span className="w-10 text-right text-xs text-[#7A8199]">{Math.round((s.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// course growth area chart (pure SVG, hover tooltips, range selector)
// ============================================================================
function GrowthChart({ courses, state, onRetry }: { courses: CourseRow[] | null; state: Sec; onRetry: () => void }) {
  const [range, setRange] = useState<RangeKey>("6m");
  const [hover, setHover] = useState<number | null>(null);
  const hasDates = (courses ?? []).some((c) => c.created_at);
  const series = useMemo(() => {
    if (!hasDates || state !== "ready") return null;
    return bucketSeries(courses ?? [], range);
  }, [courses, range, hasDates, state]);

  if (state === "loading") return <div className="animate-pulse rounded-lg bg-white/[0.04] w-full" style={{ height: 230 }} aria-busy="true" />;
  if (state === "error") return <ErrorBox onRetry={onRetry} />;
  if (!series) {
    return (
      <EmptyBox
        title="Course growth chart needs creation dates"
        hint={
          <>
            The courses API does not return <code className="text-[#A78BFA]">created_at</code> yet, so there is no honest
            time series to draw. Everything else on this page uses real data. Once the field is included, this chart fills
            in automatically.
          </>
        }
      />
    );
  }
  const W = 560;
  const H = 230;
  const PAD_L = 34;
  const PAD_R = 14;
  const PAD_T = 14;
  const PAD_B = 28;
  const { labels, counts } = series;
  const n = counts.length;
  const yMax = niceMax(Math.max(...counts, 1));
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(n - 1, 1);
  const y = (v: number) => PAD_T + (1 - v / yMax) * (H - PAD_T - PAD_B);
  const linePts = counts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `M ${x(0)},${y(counts[0])} ${counts.map((v, i) => `L ${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} L ${x(n - 1)},${H - PAD_B} L ${x(0)},${H - PAD_B} Z`;
  const labelIdx = n === 1 ? [0] : Array.from({ length: Math.min(n, 6) }, (_, k) => Math.round((k * (n - 1)) / Math.min(n - 1, 5)));
  const RANGES: Array<{ key: RangeKey; label: string }> = [
    { key: "7d", label: "Last 7 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "6m", label: "Last 6 months" },
    { key: "12m", label: "Last 12 months" },
    { key: "all", label: "All time" },
  ];
  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-1.5 text-xs text-[#B7BDD0] focus:border-[#7559E8] focus:outline-none"
          aria-label="Time range"
        >
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1));
            setHover(Math.max(0, Math.min(n - 1, i)));
          }}
          role="img"
          aria-label={`Courses created over time (${range})`}
        >
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B70FF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B70FF" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, yMax / 2, yMax].map((t) => (
            <g key={t}>
              <line x1={PAD_L} y1={y(t)} x2={W - PAD_R} y2={y(t)} stroke="#1C2447" strokeWidth="1" />
              <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fill="#7A8199" fontSize="9" style={{ fontFamily: "inherit" }}>
                {t}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#growthFill)" />
          <polyline points={linePts} fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {counts.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4 : 2.5} fill={hover === i ? "#FFFFFF" : "#A78BFA"} />
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fill="#7A8199" fontSize="10" style={{ fontFamily: "inherit" }}>
              {labels[i]}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-[#141A35] px-3 py-1.5 text-xs text-white shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}
          >
            <span className="font-semibold">{labels[hover]}</span>
            <span className="ml-2 text-[#B7BDD0]">
              {counts[hover]} new course{counts[hover] === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// quick actions (all real routes from your sidebar)
// ============================================================================
const ACTIONS = [
  { title: "Create New Course", desc: "Create and publish a new educational course.", icon: <Plus size={18} />, iconColor: "text-[#A78BFA]", iconBg: "bg-[#7559E8]/15", href: "/admin/courses/new" },
  { title: "Manage Categories", desc: "Organize course and product categories.", icon: <LayoutGrid size={18} />, iconColor: "text-[#5B9EFF]", iconBg: "bg-[#5B9EFF]/15", href: "/admin/categories" },
  { title: "View Orders", desc: "Review and manage incoming orders.", icon: <ShoppingCart size={18} />, iconColor: "text-[#22C58B]", iconBg: "bg-[#22C58B]/15", href: "/admin/orders" },
  { title: "Manage Instructors", desc: "Handle instructor applications and access.", icon: <Users size={18} />, iconColor: "text-[#F5A623]", iconBg: "bg-[#F5A623]/15", href: "/admin/instructor-applications" },
  { title: "Send Notifications", desc: "Notify students about updates and news.", icon: <Send size={18} />, iconColor: "text-[#F05D70]", iconBg: "bg-[#F05D70]/15", href: "/admin/notifications" },
  { title: "Update Settings", desc: "Configure platform-wide preferences.", icon: <Settings size={18} />, iconColor: "text-[#A78BFA]", iconBg: "bg-[#8B70FF]/15", href: "/admin/settings" },
];
function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {ACTIONS.map((a) => (
        <Link
          key={a.title}
          href={a.href}
          className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7559E8]"
        >
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${a.iconBg} ${a.iconColor} transition group-hover:scale-105`}>{a.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">{a.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-[#7A8199]">{a.desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// recent activity (real events from orders + courses only)
// ============================================================================
interface ActivityEvent {
  ts: string;
  kind: "course" | "order";
  color: string;
  badge: string;
  badgeCls: string;
  text: string;
  href: string;
  key: string;
}
function RecentActivity({
  courses,
  orders,
  coursesState,
  ordersState,
  onRetry,
}: {
  courses: CourseRow[] | null;
  orders: OrderRow[] | null;
  coursesState: Sec;
  ordersState: Sec;
  onRetry: () => void;
}) {
  if (coursesState === "loading" || ordersState === "loading") return <Skeleton lines={4} />;
  if (coursesState === "error" && ordersState === "error") return <ErrorBox onRetry={onRetry} />;
  const events: ActivityEvent[] = [];
  if (ordersState === "ready") {
    for (const o of orders ?? []) {
      if (!o.created_at) continue;
      const short = String(o.id).slice(-8).toUpperCase();
      events.push({
        ts: o.created_at,
        kind: "order",
        color: "bg-[#5B9EFF]/15 text-[#5B9EFF]",
        badge: "Order",
        badgeCls: "bg-[#5B9EFF]/15 text-[#5B9EFF] border-[#5B9EFF]/30",
        text: `New order received: #${short} · $${(o.total_cents / 100).toFixed(0)}`,
        href: "/admin/orders",
        key: `ord-${String(o.id)}`,
      });
    }
  }
  if (coursesState === "ready") {
    for (const c of courses ?? []) {
      const ts = c.created_at || c.updated_at;
      if (!ts) continue;
      const status = (c.status || "draft").toLowerCase();
      const published = status === "published";
      events.push({
        ts,
        kind: "course",
        color: published ? "bg-[#22C58B]/15 text-[#22C58B]" : "bg-[#F5A623]/15 text-[#F5A623]",
        badge: published ? "Published" : status === "archived" ? "Archived" : "Draft",
        badgeCls: published
          ? "bg-[#22C58B]/15 text-[#22C58B] border-[#22C58B]/30"
          : status === "archived"
            ? "bg-[#5B9EFF]/15 text-[#5B9EFF] border-[#5B9EFF]/30"
            : "bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30",
        text: `${published ? "New course published" : status === "archived" ? "Course archived" : "Course created"}: ${c.title}`,
        href: `/admin/courses/${c.id}`,
        key: `crs-${String(c.id)}-${ts}`,
      });
    }
  }
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  const top = events.slice(0, 6);
  if (top.length === 0) {
    return (
      <EmptyBox
        title="No activity yet."
        hint="Events appear here as you create or publish courses and as orders come in."
        actionLabel="Create Your First Course"
        actionHref="/admin/courses/new"
      />
    );
  }
  return (
    <ol className="relative space-y-4 pl-1">
      {top.map((e, i) => (
        <li key={e.key} className="relative flex items-start gap-3">
          {i < top.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-white/10" aria-hidden="true" />}
          <span className={`z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${e.color}`}>
            {e.kind === "course" ? <BookOpen size={15} /> : <ShoppingCart size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link href={e.href} className="min-w-0 flex-1 truncate text-sm text-white hover:text-[#A78BFA] transition">
                {e.text}
              </Link>
              <span className={`flex-shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${e.badgeCls}`}>{e.badge}</span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#7A8199]">
              <Clock size={10} /> {relTime(e.ts)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ============================================================================
// top courses (ranked by real enrollment field; honest fallback)
// ============================================================================
const RANK_STYLES = ["bg-[#F5A623] text-[#0B0F1D]", "bg-[#5B9EFF] text-white", "bg-[#A78BFA] text-white"];
function TopCourses({ courses, state, onRetry }: { courses: CourseRow[] | null; state: Sec; onRetry: () => void }) {
  if (state === "loading") return <Skeleton lines={3} />;
  if (state === "error") return <ErrorBox onRetry={onRetry} />;
  const all = courses ?? [];
  if (all.length === 0) {
    return (
      <EmptyBox
        title="No courses yet."
        actionLabel="Create Your First Course"
        actionHref="/admin/courses/new"
      />
    );
  }
  const withMetric = all.filter((c) => courseEnrollment(c) !== null);
  const hasMetric = withMetric.length > 0;
  const shown = hasMetric
    ? [...withMetric].sort((a, b) => (courseEnrollment(b) ?? 0) - (courseEnrollment(a) ?? 0)).slice(0, 3)
    : [...all].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 3);
  return (
    <div>
      {!hasMetric && (
        <div className="mb-3 rounded-lg border border-[#F5A623]/25 bg-[#F5A623]/[0.07] px-3 py-2 text-[11px] leading-snug text-[#F5A623]">
          Enrollment counts are not returned by the API yet, so courses cannot be ranked by students. Showing the latest
          courses instead — this card switches to real Top Courses automatically once the backend includes an enrollment
          field (e.g. <code>students_count</code>).
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {shown.map((c, i) => {
          const rating = c.avg_rating ?? c.rating;
          const reviews = c.reviews_count;
          const enrolled = hasMetric ? courseEnrollment(c) : null;
          const initial = (c.title || "?").trim().charAt(0).toUpperCase();
          return (
            <Link
              key={String(c.id)}
              href={`/admin/courses/${c.id}`}
              className="group rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7559E8]"
            >
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.cover_image_url || undefined}
                  alt=""
                  className="h-full w-full object-contain p-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {!c.cover_image_url && <span className="font-display text-4xl font-extrabold text-[#A78BFA]/60">{initial}</span>}
                <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${RANK_STYLES[i] ?? "bg-white/10 text-white"}`}>
                  {i + 1}
                </span>
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-white">{c.title}</p>
              {typeof rating === "number" && (
                <p className="mt-1 flex items-center gap-1 text-xs text-[#B7BDD0]">
                  <Star size={11} className="text-[#F5A623]" fill="#F5A623" />
                  <span className="font-semibold text-white">{rating.toFixed(1)}</span>
                  {typeof reviews === "number" && <span className="text-[#7A8199]">({fmtCompact(reviews)} reviews)</span>}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                {enrolled !== null ? (
                  <span className="text-xs font-medium text-[#B7BDD0]">
                    <Award size={11} className="mr-1 inline text-[#A78BFA]" />
                    {fmtCompact(enrolled)} students
                  </span>
                ) : (
                  <span className="text-xs text-[#7A8199]">{c.difficulty || ""}</span>
                )}
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#A78BFA] transition group-hover:bg-[#7559E8] group-hover:text-white">
                  <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// page
// ============================================================================
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [statsState, setStatsState] = useState<Sec>("loading");
  const [coursesState, setCoursesState] = useState<Sec>("loading");
  const [ordersState, setOrdersState] = useState<Sec>("loading");
  const [statsErr, setStatsErr] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setStatsState("loading");
    setStatsErr(null);
    try {
      setStats(await fetchStats());
      setStatsState("ready");
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : "Failed to load stats");
      setStatsState("error");
    }
  }, []);
  const loadCourses = useCallback(async () => {
    setCoursesState("loading");
    try {
      setCourses(await fetchCourses());
      setCoursesState("ready");
    } catch {
      setCoursesState("error");
    }
  }, []);
  const loadOrders = useCallback(async () => {
    setOrdersState("loading");
    try {
      setOrders(await fetchOrders());
      setOrdersState("ready");
    } catch {
      setOrdersState("error");
    }
  }, []);
  useEffect(() => {
    void loadStats();
    void loadCourses();
    void loadOrders();
  }, [loadStats, loadCourses, loadOrders]);

  // administrator name from the real auth context (defensive - never crashes,
  // falls back to "Admin" if the shape differs)
  const auth = useAuth() as unknown;
  const authObj = (auth && typeof auth === "object" ? auth : {}) as Record<string, unknown>;
  const authUser = (authObj.user && typeof authObj.user === "object" ? authObj.user : authObj) as Record<string, unknown> | null;
  const displayName =
    (typeof authUser?.full_name === "string" && authUser.full_name) ||
    (typeof authUser?.name === "string" && authUser.name) ||
    (typeof authUser?.username === "string" && authUser.username) ||
    (typeof authUser?.email === "string" && authUser.email ? String(authUser.email).split("@")[0] : "") ||
    "Admin";

  const courseTrend =
    coursesState === "ready" && (courses ?? []).some((c) => c.created_at) && (courses?.length ?? 0) > 0
      ? bucketSeries(courses ?? [], "6m").counts
      : undefined;
  const orderTrend =
    ordersState === "ready" && (orders ?? []).some((o) => o.created_at)
      ? bucketSeries(orders ?? [], "6m").counts
      : undefined;

  const kpis: KpiData[] = [
    {
      label: "Total Courses",
      value: coursesState === "ready" ? fmtNum(courses?.length ?? 0) : "—",
      icon: <BookOpen size={20} />,
      iconColor: "text-[#A78BFA]",
      iconBg: "bg-[#7559E8]/15",
      sparkColor: "#A78BFA",
      href: "/admin/courses",
      trend: courseTrend,
      trendTitle: "Courses created per month (last 6 months, real data)",
    },
    {
      label: "Total Students",
      value: statsState === "ready" ? fmtNum(stats?.customers_count ?? 0) : "—",
      icon: <GraduationCap size={20} />,
      iconColor: "text-[#5B9EFF]",
      iconBg: "bg-[#5B9EFF]/15",
      sparkColor: "#5B9EFF",
    },
    {
      label: "Total Orders",
      value: statsState === "ready" ? fmtNum(stats?.orders_count ?? 0) : "—",
      icon: <ShoppingBag size={20} />,
      iconColor: "text-[#22C58B]",
      iconBg: "bg-[#22C58B]/15",
      sparkColor: "#22C58B",
      href: "/admin/orders",
      trend: orderTrend,
      trendTitle: "Orders per month (last 6 months, from recent orders)",
    },
    {
      label: "Total Revenue",
      value: statsState === "ready" ? fmtMoney(stats?.revenue_cents ?? 0) : "—",
      icon: <Star size={20} />,
      iconColor: "text-[#F5A623]",
      iconBg: "bg-[#F5A623]/15",
      sparkColor: "#F5A623",
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-6">
      <Hero name={displayName} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} k={k} />
        ))}
      </div>

      {statsState === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] px-4 py-3">
          <p className="text-xs text-[#F05D70]">Platform statistics failed to load{statsErr ? `: ${statsErr}` : "."}</p>
          <button
            onClick={() => void loadStats()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 xl:col-span-2 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7559E8]/15 text-[#A78BFA]">
                <GraduationCap size={16} />
              </span>
              Courses Overview
            </h2>
            <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A78BFA] transition hover:text-white">
              View All Courses <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="lg:border-r lg:border-white/5 lg:pr-8">
              <StatusDonut courses={courses} state={coursesState} onRetry={loadCourses} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#B7BDD0]">Course Growth</h3>
              <GrowthChart courses={courses} state={coursesState} onRetry={loadCourses} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5A623]/15 text-[#F5A623]">
              <Zap size={16} />
            </span>
            Quick Actions
          </h2>
          <QuickActions />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B9EFF]/15 text-[#5B9EFF]">
              <BookOpen size={16} />
            </span>
            Recent Activity
          </h2>
          <RecentActivity
            courses={courses}
            orders={orders}
            coursesState={coursesState}
            ordersState={ordersState}
            onRetry={() => {
              void loadCourses();
              void loadOrders();
            }}
          />
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5A623]/15 text-[#F5A623]">
              <Star size={16} />
            </span>
            Top Courses
          </h2>
          <TopCourses courses={courses} state={coursesState} onRetry={loadCourses} />
        </section>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-[#7A8199]">
        <Lightbulb size={11} />
        Trend sparklines appear only where the API provides real timestamps. Growth percentages are computed from that
        data — never estimated.
      </p>
    </div>
  );
}
