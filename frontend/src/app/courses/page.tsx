"use client";

// app/academy|courses/page.tsx - ibrant Academy (v13)
//
// ONE-FILE redesign: replaces only the academy/courses listing page. Site
// header, layout, everything else untouched. No new npm dependencies.
//
// Data: your real public courses endpoint (apply script auto-detects which
// one your old page used - default /courses). Fields mapped defensively;
// anything the API does not provide (difficulty, ratings, students, price)
// is omitted, never faked. Level chips, sort and Popular rail are computed
// from the real list. Search / sort / pagination run client-side.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  GraduationCap,
  Home,
  LayoutGrid,
  PlayCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Sprout,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { getCourseLevelLabel } from "@/lib/courses/course-level";

// ============================================================================
// CONFIG (apply script auto-detects these from your old page)
// ============================================================================
const ENDPOINT = "/courses";
const COURSE_BASE = "/courses";

// ============================================================================
// types + helpers
// ============================================================================
type Course = Record<string, unknown>;
type Sec = "loading" | "ready" | "error";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function extractList(data: unknown): Course[] {
  if (Array.isArray(data)) return data as Course[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["courses", "items", "results", "data"]) {
      if (Array.isArray(obj[k])) return obj[k] as Course[];
    }
  }
  return [];
}
function firstNum(c: Course, keys: string[]): number | null {
  for (const k of keys) {
    const v = c[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}
function firstStr(c: Course, keys: string[]): string {
  for (const k of keys) {
    const v = c[k];
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
function titleOf(c: Course): string {
  return firstStr(c, ["title", "name", "course_title"]) || "Untitled Course";
}
function descOf(c: Course): string {
  return firstStr(c, ["short_description", "description", "summary"]);
}
function instructorOf(c: Course): string {
  return firstStr(c, ["instructor_name", "instructor", "author_name", "author", "teacher_name", "teacher", "user"]);
}
function difficultyOf(c: Course): string {
  return getCourseLevelLabel(firstStr(c, ["difficulty", "level", "difficulty_level"]));
}
function categoryOf(c: Course): string {
  return firstStr(c, ["category", "category_name", "category_title"]) || "";
}
function ratingOf(c: Course): { rating: number; reviews: number | null } {
  const r = firstNum(c, ["rating", "average_rating", "avg_rating"]);
  const rc = firstNum(c, ["reviews_count", "review_count", "ratings_count"]);
  return { rating: r ?? 0, reviews: rc };
}
function studentsOf(c: Course): number | null {
  return firstNum(c, ["students_count", "enrolled_count", "enrollments", "total_students", "students"]);
}
function lessonsOf(c: Course): number | null {
  return firstNum(c, ["lessons_count", "total_lessons", "lessons", "modules_count"]);
}
function durationOf(c: Course): string {
  const weeks = firstNum(c, ["duration_weeks", "weeks"]);
  if (weeks !== null && weeks > 0) return `${weeks} weeks`;
  return firstStr(c, ["duration", "duration_label"]);
}
function createdAtOf(c: Course): string {
  return firstStr(c, ["created_at", "published_at"]) || "";
}
function isFeatured(c: Course): boolean {
  return c.featured === true || c.is_featured === true;
}
function coverOf(c: Course): string {
  return firstStr(c, ["cover_image_url", "image_url", "thumbnail_url", "cover_url", "preview_url"]);
}
function priceOf(c: Course): { cents: number | null; originalCents: number | null } {
  let cents = firstNum(c, ["price_cents", "listing_price_cents", "amount_cents"]);
  if (cents === null && typeof c.price === "number") cents = (c.price as number) >= 1000 ? (c.price as number) : (c.price as number) * 100;
  let originalCents = firstNum(c, ["original_price_cents", "compare_at_price_cents"]);
  if (originalCents !== null && cents !== null && originalCents <= cents) originalCents = null;
  return { cents, originalCents };
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
function courseHref(c: Course): string {
  return `${COURSE_BASE}/${str(c.slug) || str(c.course_slug) || str(c.id) || ""}`;
}
function difficultyStyle(d: string): string {
  const l = d.toLowerCase();
  if (l.includes("begin") || l === "easy") return "bg-[#22C58B]/15 text-[#22C58B] border-[#22C58B]/30";
  if (l.includes("inter") || l === "medium") return "bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30";
  if (l.includes("adv") || l === "hard") return "bg-[#F05D70]/15 text-[#F05D70] border-[#F05D70]/30";
  return "bg-white/5 text-[#929CBD] border-white/10";
}
function difficultyIcon(d: string): ReactNode {
  const l = d.toLowerCase();
  if (l.includes("begin") || l === "easy") return <Sprout size={11} />;
  if (l.includes("inter") || l === "medium") return <BarChart3 size={11} />;
  if (l.includes("adv") || l === "hard") return <Zap size={11} />;
  return null;
}

// ============================================================================
// data fetch
// ============================================================================
async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}${ENDPOINT}?limit=100`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Courses request failed (${res.status})`);
  return extractList(await res.json());
}

// ============================================================================
// shared states
// ============================================================================
function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] p-8 text-center">
      <AlertCircle size={20} className="text-[#F05D70]" />
      <p className="text-sm text-[#F05D70]">Unable to load courses. Please try again.</p>
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
      <div className="h-28 rounded-xl bg-white/[0.04] sm:h-32 xl:h-36" />
      <div className="mt-4 h-4 w-3/4 rounded bg-white/[0.04]" />
      <div className="mt-2 h-3 w-full rounded bg-white/[0.04]" />
      <div className="mt-1 h-3 w-2/3 rounded bg-white/[0.04]" />
      <div className="mt-4 h-9 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

// ============================================================================
// sidebar (page-level; hidden below xl - your site header covers mobile nav)
// ============================================================================
const SIDE_LINKS = [
  { label: "Back to Home", href: "/", icon: <Home size={16} /> },
  { label: "My Dashboard", href: "/account", icon: <LayoutGrid size={16} /> },
  { label: "My Courses", href: "/account/courses", icon: <GraduationCap size={16} /> },
  { label: "My Purchases", href: "/account/orders", icon: <ShoppingBag size={16} /> },
];
function PageSidebar({ name, email }: { name: string; email: string }) {
  return (
    <aside className="hidden w-56 flex-shrink-0 xl:block">
      <nav className="sticky top-8 space-y-1">
        {SIDE_LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-[#B7BDD0] transition hover:bg-white/5 hover:text-white"
          >
            {l.icon}
            {l.label}
          </Link>
        ))}
        <span className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7559E8]/25">
          <BookOpen size={16} /> Academy
        </span>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#201A52] to-[#10142B] p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/20 text-lg" aria-hidden="true">🎓</div>
          <p className="text-sm font-bold text-white">Learn & Grow</p>
          <p className="mt-1 text-[11px] leading-snug text-[#929CBD]">Expert-led courses, hands-on projects</p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
          >
            See Plans <ArrowRight size={12} />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-sm font-bold text-white">
            {(name || "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{name}</span>
            <span className="block truncate text-[11px] text-[#7A8199]">{email}</span>
          </span>
        </div>
      </nav>
    </aside>
  );
}

// ============================================================================
// hero
// ============================================================================
function AcademyIllustration() {
  return (
    <svg viewBox="0 0 240 170" className="h-full w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="acCap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B70FF" />
          <stop offset="100%" stopColor="#4330C8" />
        </linearGradient>
        <radialGradient id="acGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7559E8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7559E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="90" r="110" fill="url(#acGlow)" />
      {/* mortarboard */}
      <path d="M120 22 L196 50 L120 78 L44 50 Z" fill="url(#acCap)" />
      <path d="M84 64 v26 c0 10 16 18 36 18 s36 -8 36 -18 V64 l-36 12 z" fill="#1B1442" opacity="0.92" />
      <path d="M196 50 v40" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="94" r="6" fill="#F5A623" />
      {/* play bubble */}
      <circle cx="58" cy="104" r="17" fill="#22C58B" />
      <path d="M52 96 L66 104 L52 112 Z" fill="#FFFFFF" />
      {/* floating bars - progress vibe */}
      <rect x="150" y="118" width="56" height="10" rx="5" fill="#5B9EFF" opacity="0.85" />
      <rect x="162" y="132" width="44" height="10" rx="5" fill="#22C58B" opacity="0.8" />
      <rect x="140" y="146" width="66" height="10" rx="5" fill="#F5A623" opacity="0.8" />
    </svg>
  );
}
function Hero({ query, onQuery, onSubmit }: { query: string; onQuery: (v: string) => void; onSubmit: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#241B5E] via-[#171338] to-[#0B0F1D] px-6 py-8 lg:px-10 lg:py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 260px at 80% 30%, rgba(117,89,232,0.30), transparent 65%), radial-gradient(420px 200px at 5% 110%, rgba(34,197,139,0.10), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#7559E8]/30">
            <GraduationCap size={12} /> Academy
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Explore <span className="bg-gradient-to-r from-[#A78BFA] to-[#8B70FF] bg-clip-text text-transparent">Courses</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#B7BDD0] sm:text-base">
            Learn from expert-led, hands-on courses and level up your skills.
          </p>
          <form
            className="mt-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-[#0B0F1D]/80 p-2 backdrop-blur focus-within:border-[#7559E8]/60"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            role="search"
          >
            <Search size={18} className="ml-2 flex-shrink-0 text-[#7A8199]" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search courses by name, instructor, or topic..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder-[#7A8199] focus:outline-none"
              aria-label="Search courses"
            />
            <button
              type="submit"
              className="flex-shrink-0 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              Search
            </button>
          </form>
        </div>
        <div className="hidden h-36 flex-shrink-0 lg:block xl:h-44">
          <AcademyIllustration />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// course card
// ============================================================================
function CourseCard({ c }: { c: Course }) {
  const title = titleOf(c);
  const desc = descOf(c);
  const instructor = instructorOf(c);
  const difficulty = difficultyOf(c);
  const { rating, reviews } = ratingOf(c);
  const students = studentsOf(c);
  const lessons = lessonsOf(c);
  const duration = durationOf(c);
  const { cents, originalCents } = priceOf(c);
  const cover = coverOf(c);
  const discount = originalCents !== null && cents !== null ? Math.round((1 - cents / originalCents) * 100) : null;
  const initial = title.trim().charAt(0).toUpperCase();

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition hover:border-[#7559E8]/40 hover:bg-white/[0.05]">
      <div className="relative flex h-28 sm:h-32 xl:h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
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
        {isFeatured(c) && (
          <span className="absolute left-3 top-3 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            ⭐ Featured
          </span>
        )}
        {discount !== null && discount > 0 && (
          <span className="absolute left-3 top-3 rounded-lg bg-[#F05D70] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            {discount}% OFF
          </span>
        )}
        {difficulty && (
          <span className={`absolute right-3 top-3 flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${difficultyStyle(difficulty)}`}>
            {difficultyIcon(difficulty)}
            {difficulty}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-bold text-white sm:text-base">{title}</h3>
        {desc && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#929CBD]">{desc}</p>}

        <div className="mt-3 flex items-center gap-2">
          {instructor && (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-[10px] font-bold text-white">
                {instructor.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-xs text-[#B7BDD0]">{instructor}</span>
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

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7A8199]">
          {students !== null && (
            <span className="flex items-center gap-1">
              <Users size={12} /> {fmtCompact(students)} students
            </span>
          )}
          {lessons !== null && (
            <span className="flex items-center gap-1">
              <PlayCircle size={12} /> {fmtCompact(lessons)} lessons
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {duration}
            </span>
          )}
          {students === null && lessons === null && !duration && categoryOf(c) && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#929CBD]">
              {categoryOf(c)}
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
              <span className="text-sm font-semibold text-[#22C58B]">Free access</span>
            )}
          </span>
        </div>

        <Link
          href={courseHref(c)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-[#7559E8]/20 transition hover:brightness-110"
        >
          View Course <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// page
// ============================================================================
const SORTS = ["Popular", "Newest", "Price: Low to High", "Price: High to Low", "Top Rated"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 12;

export default function AcademyPage() {
  const auth = useAuth() as unknown;
  const authObj = (auth && typeof auth === "object" ? auth : {}) as Record<string, unknown>;
  const authUser = (authObj.user && typeof authObj.user === "object" ? authObj.user : authObj) as Record<string, unknown> | null;
  const displayName =
    (typeof authUser?.full_name === "string" && authUser.full_name) ||
    (typeof authUser?.username === "string" && authUser.username) ||
    (typeof authUser?.email === "string" && authUser.email ? String(authUser.email).split("@")[0] : "") ||
    "Guest";
  const email = typeof authUser?.email === "string" ? authUser.email : "Sign in to enroll";

  const [state, setState] = useState<Sec>("loading");
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [level, setLevel] = useState("All Levels");
  const [sort, setSort] = useState<Sort>("Newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setCourses(await fetchCourses());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const availableSorts = useMemo<Sort[]>(() => {
    const options: Sort[] = [];
    if (courses.some((course) => studentsOf(course) !== null)) options.push("Popular");
    options.push("Newest");
    if (courses.some((course) => priceOf(course).cents !== null)) {
      options.push("Price: Low to High", "Price: High to Low");
    }
    if (courses.some((course) => ratingOf(course).rating > 0)) options.push("Top Rated");
    return options;
  }, [courses]);

  useEffect(() => {
    if (!availableSorts.includes(sort)) setSort(availableSorts[0] ?? "Newest");
  }, [availableSorts, sort]);

  // difficulty chips derived from the real course list
  const levels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses) {
      const d = difficultyOf(c);
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return ["All Levels", ...[...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))];
  }, [courses]);

  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    let list = courses.filter((c) => {
      const inLevel = level === "All Levels" || difficultyOf(c) === level;
      if (!inLevel) return false;
      if (!q) return true;
      return (
        titleOf(c).toLowerCase().includes(q) ||
        descOf(c).toLowerCase().includes(q) ||
        instructorOf(c).toLowerCase().includes(q) ||
        categoryOf(c).toLowerCase().includes(q)
      );
    });
    const price = (c: Course) => priceOf(c).cents ?? Number.MAX_SAFE_INTEGER;
    const stu = (c: Course) => studentsOf(c) ?? -1;
    const rate = (c: Course) => ratingOf(c).rating;
    list = [...list];
    if (sort === "Popular") list.sort((a, b) => stu(b) - stu(a) || rate(b) - rate(a));
    else if (sort === "Newest") list.sort((a, b) => new Date(createdAtOf(b) || 0).getTime() - new Date(createdAtOf(a) || 0).getTime());
    else if (sort === "Price: Low to High") list.sort((a, b) => price(a) - price(b));
    else if (sort === "Price: High to Low") list.sort((a, b) => price(b) - price(a));
    else if (sort === "Top Rated") list.sort((a, b) => rate(b) - rate(a));
    return list;
  }, [courses, appliedQuery, level, sort]);

  useEffect(() => setVisible(PAGE_SIZE), [appliedQuery, level, sort]);
  const shown = filtered.slice(0, visible);

  // popular rail: real metric only (students, else rating)
  const popular = useMemo(() => {
    const hasStudents = courses.some((c) => studentsOf(c) !== null);
    const hasRatings = courses.some((c) => ratingOf(c).rating > 0);
    if (!hasStudents && !hasRatings) return { items: [], metric: "rating" as const };
    const list = [...courses];
    if (hasStudents) list.sort((a, b) => (studentsOf(b) ?? 0) - (studentsOf(a) ?? 0));
    else list.sort((a, b) => ratingOf(b).rating - ratingOf(a).rating);
    return { items: list.slice(0, 5), metric: hasStudents ? ("students" as const) : ("rating" as const) };
  }, [courses]);

  return (
    <div className="flex gap-8">
      <PageSidebar name={displayName} email={email} />

      <div className="min-w-0 flex-1 space-y-6">
        <Hero
          query={query}
          onQuery={setQuery}
          onSubmit={() => {
            setAppliedQuery(query);
            setVisible(PAGE_SIZE);
          }}
        />

        {/* level chips + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  level === l
                    ? "border-transparent bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/25"
                    : "border-white/10 bg-white/[0.03] text-[#B7BDD0] hover:border-white/20 hover:text-white"
                }`}
              >
                {l === "All Levels" ? <LayoutGrid size={13} /> : difficultyIcon(l)}
                {l}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-2 text-xs text-[#B7BDD0] focus:border-[#7559E8] focus:outline-none"
            aria-label="Sort courses"
          >
            {availableSorts.map((s) => (
              <option key={s} value={s}>
                Sort by: {s}
              </option>
            ))}
          </select>
        </div>

        {/* results meta */}
        <p className="text-sm text-[#929CBD]">
          {state === "ready" && filtered.length > 0 ? (
            <>
              Showing <span className="font-semibold text-white">1–{shown.length}</span> of{" "}
              <span className="font-semibold text-white">{filtered.length}</span> courses
              {appliedQuery && (
                <>
                  {" "}for <span className="font-semibold text-[#A78BFA]">“{appliedQuery}”</span>
                </>
              )}
            </>
          ) : (
            <>
              &nbsp;
            </>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {state === "loading" &&
            Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          {state === "error" && (
            <div className="col-span-2 md:col-span-3 xl:col-span-4">
              <ErrorBox onRetry={load} />
            </div>
          )}
          {state === "ready" && shown.map((c) => (
            <CourseCard key={str(c.id) || titleOf(c)} c={c} />
          ))}
        </div>

        {state === "ready" && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <Search size={24} className="text-[#7A8199]" />
            <p className="text-sm font-medium text-white">No courses match your search.</p>
            <p className="text-xs text-[#7A8199]">Try a different keyword or browse all levels.</p>
            <button
              onClick={() => {
                setQuery("");
                setAppliedQuery("");
                setLevel("All Levels");
              }}
              className="mt-1 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {state === "ready" && filtered.length > visible && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/10"
            >
              Load More Courses
            </button>
          </div>
        )}

        {/* Popular Courses rail */}
        {state === "ready" && popular.items.length > 0 && (
          <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
              <span aria-hidden="true">🔥</span> Popular Courses
              {popular.metric === "rating" && (
                <span className="text-[10px] font-medium text-[#7A8199]">(by rating — student counts not provided yet)</span>
              )}
            </h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {popular.items.map((c, i) => {
                const stu = studentsOf(c);
                const r = ratingOf(c).rating;
                const cover = coverOf(c);
                const title = titleOf(c);
                return (
                  <li key={str(c.id) || title}>
                    <Link
                      href={courseHref(c)}
                      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/[0.06]"
                    >
                      <span className="font-display text-lg font-extrabold text-[#7A8199]">{i + 1}</span>
                      <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                        <span className="text-sm font-extrabold text-[#A78BFA]/60">{title.charAt(0).toUpperCase()}</span>
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{title}</span>
                        <span className="block text-[11px] text-[#7A8199]">
                          {popular.metric === "students" && stu !== null
                            ? `${fmtCompact(stu)} students`
                            : r > 0
                              ? `${r.toFixed(1)} rating`
                              : difficultyOf(c) || categoryOf(c) || "View course"}
                        </span>
                      </span>
                      <ArrowRight size={14} className="flex-shrink-0 text-[#7A8199] transition group-hover:text-[#A78BFA]" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <p className="pb-2 text-center text-[11px] text-[#7A8199]">
          Live course data — ratings, enrollment counts and pricing appear only when provided by the API.
        </p>
      </div>
    </div>
  );
}
