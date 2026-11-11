"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { CourseCard, type CourseListItem } from "./CourseCard";
import { API_BASE } from "@/lib/api/client";
import { useCoursesFilter } from "@/lib/context/CoursesFilterContext";
import { InstructorApplyModal } from "@/components/courses/InstructorApplyModal";

export default function CoursesPage() {
  const { activeTech, setActiveTech } = useCoursesFilter();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // THIS is the missing state that caused the error
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/courses`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredCourses = activeTech
    ? courses.filter((c) =>
        (c.technologies || []).some(
          (t) => t.toLowerCase() === activeTech.toLowerCase()
        )
      )
    : courses;

  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      {/* Hero header */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-8 lg:pt-12">
        <Link
          href="/"
          className="text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors inline-flex items-center gap-1.5 mb-6"
        >
          ← Back to Home
        </Link>

        <div className="mb-10 text-center max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            ZORVI Academy
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
            Learn by building real software.
          </h1>
          <p className="text-lg text-[#B7BDD0]">
            Complete project-based courses. Master any technology by building
            production applications from scratch.
          </p>
        </div>
      </div>

      {/* Course grid */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {error && (
          <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-4 mb-6">
            <p className="text-sm text-[#F05D70]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-[#A78BFA]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              {activeTech ? `No courses for "${activeTech}" yet` : "Courses coming soon"}
            </h3>
            <p className="text-sm text-[#B7BDD0] mb-6">
              {activeTech ? "Try a different technology filter, or check back soon." : "We're building the first courses. Check back soon."}
            </p>
            {activeTech && (
              <button
                onClick={() => setActiveTech(null)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-[#7A8199]">
                <span className="text-white font-medium">
                  {filteredCourses.length}
                </span>{" "}
                {filteredCourses.length === 1 ? "course" : "courses"}
                {activeTech && (
                  <>
                    {" "}in{" "}
                    <span className="text-[#A78BFA] font-medium">
                      {activeTech}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        )}

        {/* Want to teach CTA */}
        <div className="mt-16 rounded-2xl border border-[#7559E8]/20 bg-[#7559E8]/5 p-8 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Want to teach on ZORVI?
          </h2>
          <p className="text-sm text-[#B7BDD0] mb-6">
            Share your expertise. Publish a course and reach developers
            worldwide.
          </p>
          <button
            onClick={() => setApplyOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-8 py-3 text-sm font-bold text-white hover:brightness-110 transition shadow-lg shadow-[#7559E8]/20"
          >
            Apply to Teach
          </button>
        </div>
      </div>

      {/* The Apply Modal */}
      <InstructorApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
