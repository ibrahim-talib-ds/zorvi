"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Plus, Edit3, Eye, EyeOff, BookOpen, Search, Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  status: "draft" | "published" | "archived";
  difficulty: string;
  technologies: string[];
  estimated_hours: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string }>;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]",
  published: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]",
  archived: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

type StatusFilter = "all" | "draft" | "published" | "archived";

export default function AdminCoursesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/courses");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadCourses = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadCourses();
  }, [token]);

  const togglePublish = async (course: Course) => {
    if (!token) return;
    const newStatus = course.status === "published" ? "draft" : "published";
    setTogglingId(course.id);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, ...updated } : c)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = courses.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch =
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalLessons = (c: Course) =>
    c.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  if (authLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="py-10 px-6 lg:px-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back to Admin
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white mb-1">Courses</h1>
          <p className="text-sm text-[#B7BDD0]">
            {courses.length} {courses.length === 1 ? "course" : "courses"} total
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
        >
          <Plus size={16} /> New Course
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8199] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by title or slug..."
            className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg pl-11 pr-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] transition text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "draft", "published", "archived"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                statusFilter === s
                  ? "bg-[#7559E8] text-white"
                  : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 border border-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 p-3">
          <p className="text-sm text-[#F05D70]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-[#A78BFA]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">
            {courses.length === 0 ? "No courses yet" : "No courses match your filters"}
          </h3>
          <p className="text-sm text-[#B7BDD0] mb-6">
            {courses.length === 0
              ? "Create your first course to start teaching."
              : "Try a different search term or clear the filters."}
          </p>
          {courses.length === 0 && (
            <Link
              href="/admin/courses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
            >
              <Plus size={16} /> Create your first course
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/[0.03] border-b border-white/5">
              <tr className="text-left text-xs uppercase tracking-wider text-[#7A8199]">
                <th className="px-6 py-4 font-medium">Course</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Lessons</th>
                <th className="px-6 py-4 font-medium">Hours</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#7559E8]/15 border border-[#7559E8]/20 flex items-center justify-center text-[#A78BFA] font-bold flex-shrink-0">
                        {course.title.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-white truncate">{course.title}</p>
                          {course.is_featured && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5A623]/15 text-[#F5A623]">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7A8199] font-mono truncate">
                          {course.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_COLORS[course.status]}`}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#B7BDD0]">
                      {totalLessons(course)} in {course.modules.length} modules
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#B7BDD0]">
                      {course.estimated_hours}h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => togglePublish(course)}
                        disabled={togglingId === course.id}
                        className="p-2 rounded-lg bg-white/5 text-[#B7BDD0] hover:bg-white/10 transition disabled:opacity-50"
                        title={course.status === "published" ? "Unpublish" : "Publish"}
                      >
                        {togglingId === course.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : course.status === "published" ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="p-2 rounded-lg bg-white/5 text-[#B7BDD0] hover:bg-white/10 transition"
                        title="Edit course"
                      >
                        <Edit3 size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-[#7A8199]">
        Showing <span className="text-white">{filtered.length}</span> of{" "}
        {courses.length} courses.
      </p>
    </div>
  );
}
