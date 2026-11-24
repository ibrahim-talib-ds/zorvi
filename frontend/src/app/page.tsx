"use client";

// app/page.tsx - IBRANT Home (v14)
//
// ONE-FILE modern landing page. Replaces only app/page.tsx (backed up).
// Your global header/footer (layout-level) are untouched. No new
// dependencies.
//
// Data: your real public endpoints - /marketplace/products (the same one
// your home ProjectsSection already used) and the public courses list.
// The apply script auto-detects both from your old page + components/home/.
// Stats are real counts computed from the fetched lists; sections that
// depend on missing data degrade gracefully, never fake numbers.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Code2,
  GraduationCap,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { API_BASE } from "@/lib/api/client";

// ============================================================================
// CONFIG (apply script auto-detects these from your old page/components)
// ============================================================================
const PROJECTS_ENDPOINT = "/marketplace/products";
const COURSES_ENDPOINT = "/courses";
const MARKET_BASE = "/marketplace";
const COURSES_BASE = "/courses";

// ============================================================================
// types + helpers
// ============================================================================
type Item = Record<string, unknown>;
type Sec = "loading" | "ready" | "error";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function extractList(data: unknown): Item[] {
  if (Array.isArray(data)) return data as Item[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["products", "courses", "items", "results", "data"]) {
      if (Array.isArray(obj[k])) return obj[k] as Item[];
    }
  }
  return [];
}
function firstNum(x: Item, keys: string[]): number | null {
  for (const k of keys) {
    const v = x[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}
function firstStr(x: Item, keys: string[]): string {
  for (const k of keys) {
    const v = x[k];
    if (typeof v === "string" && v) return v;
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k2 of ["full_name", "name", "title", "username"]) {
        if (typeof o[k2] === "string" && o[k2]) return o[k2] as string;
      }
    }
  }
  return "";
}
function titleOf(x: Item): string {
  return firstStr(x, ["title", "name", "course_title"]) || "Untitled";
}
function descOf(x: Item): string {
  return firstStr(x, ["short_description", "description", "summary"]);
}
function personOf(x: Item): string {
  return firstStr(x, ["creator_name", "instructor_name", "author_name", "author", "instructor", "creator", "user"]);
}
function categoryOf(x: Item): string {
  return firstStr(x, ["category", "category_name", "category_title"]) || "";
}
function ratingOf(x: Item): { rating: number; reviews: number | null } {
  const r = firstNum(x, ["rating", "average_rating", "avg_rating"]);
  const rc = firstNum(x, ["reviews_count", "review_count", "ratings_count"]);
  return { rating: r ?? 0, reviews: rc };
}
function coverOf(x: Item): string {
  return firstStr(x, ["cover_image_url", "image_url", "thumbnail_url", "cover_url", "preview_url"]);
}
function priceOf(x: Item): { cents: number | null; originalCents: number | null } {
  let cents = firstNum(x, ["price_cents", "listing_price_cents", "amount_cents"]);
  if (cents === null && typeof x.price === "number") cents = (x.price as number) >= 1000 ? (x.price as number) : (x.price as number) * 100;
  let originalCents = firstNum(x, ["original_price_cents", "compare_at_price_cents"]);
  if (originalCents !== null && cents !== null && originalCents <= cents) originalCents = null;
  return { cents, originalCents };
}
function isFeatured(x: Item): boolean {
  return x.featured === true || x.is_featured === true;
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
async function fetchList(endpoint: string): Promise<Item[]> {
  const res = await fetch(`${API_BASE}${endpoint}?limit=100`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${endpoint} failed (${res.status})`);
  return extractList(await res.json());
}

// ============================================================================
// shared bits
// ============================================================================
function SectionShell({
  icon,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/25">
              {icon}
            </span>
            {title}
          </h2>
          <p className="mt-2 text-sm text-[#929CBD] sm:text-base">{subtitle}</p>
        </div>
        {viewAllHref && viewAllLabel && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/10"
          >
            {viewAllLabel} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
function GridError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] p-8 text-center">
      <AlertCircle size={20} className="text-[#F05D70]" />
      <p className="text-sm text-[#F05D70]">Unable to load this section right now.</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
      >
        <RefreshCw size={12} /> Try again
      </button>
    </div>
  );
}
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.03] p-3" aria-busy="true">
      <div className="h-28 rounded-xl bg-white/[0.04]" />
      <div className="mt-4 h-4 w-3/4 rounded bg-white/[0.04]" />
      <div className="mt-2 h-3 w-2/3 rounded bg-white/[0.04]" />
      <div className="mt-4 h-9 rounded-lg bg-white/[0.04]" />
    </div>
  );
}
function EmptyStrip({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-[#7A8199]">
      {label}
    </div>
  );
}

// ============================================================================
// item card (works for both projects and courses)
// ============================================================================
function ItemCard({ x, href, ctaLabel }: { x: Item; href: string; ctaLabel: string }) {
  const title = titleOf(x);
  const desc = descOf(x);
  const person = personOf(x);
  const { rating, reviews } = ratingOf(x);
  const { cents, originalCents } = priceOf(x);
  const cover = coverOf(x);
  const discount = originalCents !== null && cents !== null ? Math.round((1 - cents / originalCents) * 100) : null;
  const initial = title.trim().charAt(0).toUpperCase();

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition hover:border-[#7559E8]/40 hover:bg-white/[0.05]">
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
        <span className="font-display text-3xl font-extrabold text-[#A78BFA]/50">{initial}</span>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {isFeatured(x) && (
          <span className="absolute left-3 top-3 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            ⭐ Featured
          </span>
        )}
        {discount !== null && discount > 0 && (
          <span className="absolute left-3 top-3 rounded-lg bg-[#F05D70] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-bold text-white sm:text-base">{title}</h3>
        {desc && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#929CBD]">{desc}</p>}
        <div className="mt-3 flex items-center gap-2">
          {person && (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-[10px] font-bold text-white">
                {person.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-xs text-[#B7BDD0]">{person}</span>
            </>
          )}
          {rating > 0 && (
            <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-xs text-[#B7BDD0]">
              <Star size={12} className="text-[#F5A623]" fill="#F5A623" />
              <span className="font-bold text-white">{rating.toFixed(1)}</span>
              {reviews !== null && <span className="text-[#7A8199]">({fmtCompact(reviews)})</span>}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {categoryOf(x) && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#929CBD]">
              {categoryOf(x)}
            </span>
          )}
          <span className="ml-auto text-right">
            {cents !== null ? (
              <>
                {originalCents !== null && <span className="mr-1.5 text-xs text-[#7A8199] line-through">{fmtMoney(originalCents)}</span>}
                <span className={`font-display text-lg font-extrabold ${cents === 0 ? "text-[#22C58B]" : "text-white"}`}>
                  {cents === 0 ? "Free" : fmtMoney(cents)}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-[#929CBD]">Price on request</span>
            )}
          </span>
        </div>
        <Link
          href={href}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-[#7559E8]/20 transition hover:brightness-110"
        >
          {ctaLabel} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// hero + illustration
// ============================================================================
function HomeIllustration() {
  return (
    <svg viewBox="0 0 260 180" className="h-full w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="hmLap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D35A0" />
          <stop offset="100%" stopColor="#1B1442" />
        </linearGradient>
        <radialGradient id="hmGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7559E8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7559E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="95" r="115" fill="url(#hmGlow)" />
      {/* mortarboard */}
      <path d="M130 18 L206 46 L130 74 L54 46 Z" fill="url(#hmLap)" stroke="#7559E8" strokeWidth="1.5" />
      <path d="M96 60 v22 c0 9 15 16 34 16 s34 -7 34 -16 V60 l-34 11 z" fill="#1B1442" opacity="0.92" />
      <path d="M206 46 v38" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
      <circle cx="206" cy="88" r="6" fill="#F5A623" />
      {/* laptop */}
      <rect x="52" y="84" width="104" height="66" rx="8" fill="url(#hmLap)" stroke="#7559E8" strokeWidth="2" />
      <rect x="60" y="92" width="88" height="50" rx="4" fill="#12102E" />
      <text x="104" y="126" textAnchor="middle" fill="#A78BFA" fontSize="24" fontWeight="800" style={{ fontFamily: "monospace" }}>
        &lt;/&gt;
      </text>
      <rect x="36" y="150" width="136" height="10" rx="5" fill="#2A2455" />
      {/* play bubble */}
      <circle cx="196" cy="118" r="17" fill="#22C58B" />
      <path d="M190 110 L204 118 L190 126 Z" fill="#FFFFFF" />
      {/* progress bars */}
      <rect x="146" y="146" width="54" height="10" rx="5" fill="#5B9EFF" opacity="0.85" />
      <rect x="158" y="160" width="42" height="10" rx="5" fill="#F5A623" opacity="0.8" />
    </svg>
  );
}
function Hero({ projectsReady, coursesReady }: { projectsReady: boolean; coursesReady: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#241B5E] via-[#171338] to-[#0B0F1D] px-6 py-10 lg:px-12 lg:py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(760px 300px at 82% 25%, rgba(117,89,232,0.32), transparent 65%), radial-gradient(460px 220px at 4% 115%, rgba(34,197,139,0.12), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-8">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/40 bg-[#7559E8]/15 px-4 py-1.5 text-xs font-semibold text-[#C9B8FF]">
            <Sparkles size={13} /> Learn · Build · Grow
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Learn. Build.{" "}
            <span className="bg-gradient-to-r from-[#A78BFA] via-[#8B70FF] to-[#5B9EFF] bg-clip-text text-transparent">Grow.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#B7BDD0] sm:text-base lg:text-lg">
            Production-ready projects and expert-led courses on one platform. Pick a project, ship it to your portfolio,
            and level up with every course you finish.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7559E8]/30 transition hover:brightness-110"
            >
              <Code2 size={16} /> Explore Marketplace
            </Link>
            <Link
              href={COURSES_BASE}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#7559E8]/50 hover:bg-[#7559E8]/10"
            >
              <GraduationCap size={16} /> Start Learning
            </Link>
          </div>
          {(projectsReady || coursesReady) && (
            <p className="mt-5 flex items-center gap-1.5 text-xs text-[#7A8199]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C58B] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C58B]" />
              </span>
              Live catalog — fresh projects and courses straight from the platform
            </p>
          )}
        </div>
        <div className="hidden h-44 flex-shrink-0 lg:block xl:h-52">
          <HomeIllustration />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// page
// ============================================================================
const HOME_STEPS = [
  {
    n: "01",
    title: "Learn in the Academy",
    body: "Take expert-led, hands-on courses and build real skills step by step — from your first line of code to advanced topics.",
    icon: <GraduationCap size={20} />,
  },
  {
    n: "02",
    title: "Build with real projects",
    body: "Grab production-ready projects from the marketplace — complete codebases you can study, customize and ship as your own.",
    icon: <Code2 size={20} />,
  },
  {
    n: "03",
    title: "Grow your portfolio",
    body: "Every course finished and project shipped strengthens your portfolio — track it all from your personal dashboard.",
    icon: <Rocket size={20} />,
  },
  {
    n: "04",
    title: "Create & earn",
    body: "Turn your skills into income — publish your own projects and courses on the marketplace and get paid for every sale.",
    icon: <Sparkles size={20} />,
  },
];
const WHY_CARDS = [
  {
    title: "Expert-led courses",
    body: "Structured, practical curriculum built by experienced developers and instructors.",
    icon: <BookOpen size={20} />,
  },
  {
    title: "Production-ready projects",
    body: "Complete, deployable codebases — not toy demos — you can learn from and launch.",
    icon: <Code2 size={20} />,
  },
  {
    title: "Hands-on by default",
    body: "Every course and project is built around doing the work, not just watching it.",
    icon: <Wrench size={20} />,
  },
  {
    title: "Modern stack",
    body: "Current tools and frameworks used across the platform, projects and lessons.",
    icon: <Zap size={20} />,
  },
  {
    title: "Track your progress",
    body: "Your personal dashboard shows enrolled courses, completed lessons and orders.",
    icon: <Users size={20} />,
  },
  {
    title: "Trusted platform",
    body: "Secure checkout, clear licensing and support from the IBRANT team.",
    icon: <ShieldCheck size={20} />,
  },
];

export default function HomePage() {
  const [projects, setProjects] = useState<Item[]>([]);
  const [courses, setCourses] = useState<Item[]>([]);
  const [projectsState, setProjectsState] = useState<Sec>("loading");
  const [coursesState, setCoursesState] = useState<Sec>("loading");

  const loadProjects = useCallback(async () => {
    setProjectsState("loading");
    try {
      setProjects(await fetchList(PROJECTS_ENDPOINT));
      setProjectsState("ready");
    } catch {
      setProjectsState("error");
    }
  }, []);
  const loadCourses = useCallback(async () => {
    setCoursesState("loading");
    try {
      setCourses(await fetchList(COURSES_ENDPOINT));
      setCoursesState("ready");
    } catch {
      setCoursesState("error");
    }
  }, []);
  useEffect(() => {
    void loadProjects();
    void loadCourses();
  }, [loadProjects, loadCourses]);

  // real stats computed from the fetched lists
  const creators = useMemo(() => {
    const s = new Set<string>();
    for (const p of projects) {
      const a = personOf(p);
      if (a) s.add(a);
    }
    for (const c of courses) {
      const a = personOf(c);
      if (a) s.add(a);
    }
    return s.size;
  }, [projects, courses]);
  const categoryCount = useMemo(() => {
    const s = new Set<string>();
    for (const p of projects) {
      const c = categoryOf(p);
      if (c) s.add(c);
    }
    for (const c of courses) {
      const c2 = categoryOf(c);
      if (c2) s.add(c2);
    }
    return s.size;
  }, [projects, courses]);
  const stats: Array<{ label: string; value: string | null; icon: ReactNode }> = [
    { label: "Production-ready projects", value: projectsState === "ready" ? fmtCompact(projects.length) : null, icon: <Code2 size={18} /> },
    { label: "Expert-led courses", value: coursesState === "ready" ? fmtCompact(courses.length) : null, icon: <BookOpen size={18} /> },
    { label: "Creators & instructors", value: projectsState === "ready" || coursesState === "ready" ? String(creators || null) || null : null, icon: <Users size={18} /> },
    { label: "Categories to explore", value: projectsState === "ready" || coursesState === "ready" ? String(categoryCount || null) || null : null, icon: <Sparkles size={18} /> },
  ];
  const visibleStats = stats.filter((s) => s.value !== null);

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Hero projectsReady={projectsState === "ready"} coursesReady={coursesState === "ready"} />

      {/* live stats from real data */}
      {visibleStats.length > 0 && (
        <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${visibleStats.length === 2 ? "lg:grid-cols-2" : ""} ${visibleStats.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {visibleStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-white/15">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]">{s.icon}</span>
              <div>
                <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">{s.value}</p>
                <p className="text-xs text-[#929CBD] sm:text-sm">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Featured Projects - real data */}
      <SectionShell
        icon={<Code2 size={18} />}
        title="Featured Projects"
        subtitle="Production-ready software you can buy, download and deploy today."
        viewAllHref="/marketplace"
        viewAllLabel="View all projects"
      >
        {projectsState === "loading" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : projectsState === "error" ? (
          <GridError onRetry={loadProjects} />
        ) : projects.length === 0 ? (
          <EmptyStrip label="No projects published yet — check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
            {projects.slice(0, 6).map((p) => (
              <ItemCard key={str(p.id) || titleOf(p)} x={p} href={`${MARKET_BASE}/${str(p.slug) || str(p.id) || ""}`} ctaLabel="View Details" />
            ))}
          </div>
        )}
      </SectionShell>

      {/* Featured Courses - real data */}
      <SectionShell
        icon={<GraduationCap size={18} />}
        title="Featured Courses"
        subtitle="Expert-led, hands-on courses to level up your skills."
        viewAllHref={COURSES_BASE}
        viewAllLabel="View all courses"
      >
        {coursesState === "loading" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : coursesState === "error" ? (
          <GridError onRetry={loadCourses} />
        ) : courses.length === 0 ? (
          <EmptyStrip label="No courses published yet — check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
            {courses.slice(0, 6).map((c) => (
              <ItemCard key={str(c.id) || titleOf(c)} x={c} href={`${COURSES_BASE}/${str(c.slug) || str(c.course_slug) || str(c.id) || ""}`} ctaLabel="View Course" />
            ))}
          </div>
        )}
      </SectionShell>

      {/* How it works */}
      <SectionShell
        icon={<Sparkles size={18} />}
        title="How IBRANT Works"
        subtitle="Three steps from where you are now to a portfolio you're proud of."
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
          {HOME_STEPS.map((s) => (
            <div key={s.n} className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-6 transition hover:border-[#7559E8]/40">
              <span className="pointer-events-none absolute -right-2 -top-6 font-display text-7xl font-extrabold text-white/[0.04]" aria-hidden="true">
                {s.n}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/25">
                {s.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929CBD]">{s.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Why IBRANT */}
      <SectionShell
        icon={<ShieldCheck size={18} />}
        title="Why IBRANT"
        subtitle="Everything you need to learn faster and build things that matter."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CARDS.map((w) => (
            <div key={w.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-[#7559E8]/40 hover:bg-white/[0.05]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]">{w.icon}</span>
              <h3 className="mt-3 font-display text-base font-bold text-white">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#929CBD]">{w.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* CTA band */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#241B5E] via-[#171338] to-[#0B0F1D] px-6 py-10 text-center lg:px-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(600px 240px at 50% 0%, rgba(117,89,232,0.28), transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/40 bg-[#7559E8]/15 px-4 py-1.5 text-xs font-semibold text-[#C9B8FF]">
            <Rocket size={13} /> Ready when you are
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start building today
          </h2>
          <p className="mt-3 text-sm text-[#B7BDD0] sm:text-base">
            Browse the marketplace for your next project, or jump into the academy and learn something new this week.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7559E8]/30 transition hover:brightness-110"
            >
              Explore Marketplace <ArrowRight size={15} />
            </Link>
            <Link
              href={COURSES_BASE}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#7559E8]/50 hover:bg-[#7559E8]/10"
            >
              Start Learning <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-[#7A8199]">
        Counts on this page are live from your platform APIs — sections appear only when real data exists.
      </p>
    </div>
  );
}
