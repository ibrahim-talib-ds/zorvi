"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle, BookOpen, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { TechnologyStrip } from "@/components/courses/TechnologyStrip";
import { CoursesFilterProvider, useCoursesFilter } from "@/lib/context/CoursesFilterContext";
import { cn } from "@/lib/design-system/cn";

function AccountCoursesContent() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { activeTech, setActiveTech } = useCoursesFilter();

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "in-progress" | "completed">("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/account/courses");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/my-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load courses");
        const data = await res.json();
        
        // Safety mapping to ensure we always have the data we need
        const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: c.id || c.course_id,
          course_title: c.course_title || c.title || "Untitled Course",
          course_slug: c.course_slug || c.slug || "",
          course_thumbnail: c.course_thumbnail || c.thumbnail_url || null,
          course_technologies: c.course_technologies || c.technologies || [],
          total_lessons: c.total_lessons || 0,
          completed_lessons: c.completed_lessons || 0,
          progress_percent: c.progress_percent ?? c.percent_complete ?? 0,
          enrolled_at: c.enrolled_at || new Date().toISOString(),
        }));
        
        setCourses(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredByTab = courses.filter((c) => {
    if (tab === "in-progress") return c.progress_percent < 100;
    if (tab === "completed") return c.progress_percent === 100;
    return true;
  });

  const filteredCourses = activeTech
    ? filteredByTab.filter((c) =>
        (c.course_technologies || []).some(
          (t: string) => t.toLowerCase() === activeTech.toLowerCase()
        )
      )
    : filteredByTab;

  const inProgressCount = courses.filter((c) => c.progress_percent < 100).length;
  const completedCount = courses.filter((c) => c.progress_percent === 100).length;

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-2">My Learning</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">My Courses</h1>
          <p className="text-sm text-[#B7BDD0] mt-2">
            {inProgressCount} in progress · {completedCount} completed
          </p>
        </div>
        <Link href="/courses" className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition shrink-0">
          <BookOpen size={16} /> Browse Courses
        </Link>
      </div>

      <div className="sticky top-16 md:top-[72px] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#0B0F1D]/95 backdrop-blur-md border-y border-white/5">
        <TechnologyStrip />
      </div>

      <div className="flex items-center gap-2">
        {[
          { key: "all", label: `All (${courses.length})` },
          { key: "in-progress", label: `In Progress (${inProgressCount})` },
          { key: "completed", label: `Completed (${completedCount})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition",
              tab === t.key
                ? "bg-[#7559E8] text-white"
                : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-6 text-center">
          <p className="text-sm text-[#F05D70]">{error}</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-[#A78BFA]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">
            {activeTech ? `No ${activeTech} courses yet` : "No courses here yet"}
          </h3>
          <p className="text-sm text-[#B7BDD0] mb-6">
            {activeTech ? "Try a different technology or browse all courses." : "Browse the Academy to find your first course."}
          </p>
          {activeTech && (
            <button onClick={() => setActiveTech(null)} className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <div key={c.id} className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition">
              <div className="aspect-[16/9] bg-gradient-to-br from-[#171B33] to-[#0B0F1D] relative flex items-center justify-center">
                {c.course_thumbnail ? (
                  <img src={c.course_thumbnail} alt={c.course_title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-7xl font-extrabold text-[#7559E8]/20 group-hover:text-[#7559E8]/30 transition-colors duration-500">
                    {c.course_title.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-white mb-2 group-hover:text-[#A78BFA] transition">
                  {c.course_title}
                </h3>
                <p className="text-xs text-[#7A8199] mb-4">
                  Enrolled {new Date(c.enrolled_at).toLocaleDateString()}
                </p>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#B7BDD0]">{c.completed_lessons} of {c.total_lessons} lessons</span>
                  <span className="text-white font-medium">{Math.round(c.progress_percent)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF] transition-all" style={{ width: `${c.progress_percent}%` }} />
                </div>

                {c.course_slug ? (
                  <Link
                    href={`/courses/${c.course_slug}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
                  >
                    {c.progress_percent === 100 ? (
                      <><CheckCircle size={16} /> Review Course</>
                    ) : (
                      <><PlayCircle size={16} /> {c.progress_percent > 0 ? "Continue Learning" : "Start Learning"}</>
                    )}
                  </Link>
                ) : (
                  <button disabled className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-[#7A8199] cursor-not-allowed">
                    Course Unavailable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountCoursesPage() {
  return (
    <CoursesFilterProvider>
      <AccountCoursesContent />
    </CoursesFilterProvider>
  );
}
