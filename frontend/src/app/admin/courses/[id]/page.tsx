"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Plus, Edit3, Trash2, Eye, EyeOff, Save,
  BookOpen, Video, FileText, Check, X, AlertCircle, Clock, Layers, GraduationCap, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
  video_provider: string;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  status: "draft" | "published" | "archived";
  difficulty: string;
  technologies: string[];
  estimated_hours: number;
  is_featured: boolean;
  modules: Module[];
}

export default function AdminCourseEditPage() {
  const [coverImage, setCoverImage] = useState("");
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable course fields
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [estimatedHours, setEstimatedHours] = useState("0");
  const [savingCourse, setSavingCourse] = useState(false);
  const [savedCourse, setSavedCourse] = useState(false);

  // Add module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  // Per-module "add lesson" form state
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDesc, setNewLessonDesc] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("10");
  const [newLessonIsFree, setNewLessonIsFree] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const loadCourse = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      const data: Course = await res.json();
      setCourse(data);
      setTitle(data.title);
      setShortDesc(data.short_description);
      setLongDesc(data.long_description);
      setCoverImage((data as any).cover_image_url || "");
      setCoverImage((data as any).cover_image_url || "");
      setDifficulty(data.difficulty);
      setEstimatedHours(String(data.estimated_hours));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?return=/admin/courses/${courseId}`);
    }
  }, [authLoading, isAuthenticated, router, courseId]);

  useEffect(() => {
    if (token && courseId) loadCourse();
  }, [token, courseId]);

  const saveCourse = async () => {
    if (!token || !course) return;
    setSavingCourse(true);
    setSavedCourse(false);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
        cover_image_url: coverImage.trim() || null,
          title: title.trim(),
          short_description: shortDesc.trim(),
          long_description: longDesc.trim(),
          difficulty,
          estimated_hours: parseInt(estimatedHours) || 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedCourse(true);
      setTimeout(() => setSavedCourse(false), 2000);
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingCourse(false);
    }
  };

  const toggleStatus = async () => {
    if (!token || !course) return;
    const newStatus = course.status === "published" ? "draft" : "published";
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to change status");
    }
  };

  const addModule = async () => {
    if (!token || !newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}/modules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          description: newModuleDesc.trim(),
          sort_order: (course?.modules.length ?? 0) + 1,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewModuleTitle("");
      setNewModuleDesc("");
      setShowModuleForm(false);
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add module");
    } finally {
      setAddingModule(false);
    }
  };

  const deleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!token || !confirm(`Delete module "${moduleTitle}"? All its lessons will be deleted.`)) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/modules/${moduleId}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete module");
    }
  };

  const addLesson = async (moduleId: string) => {
    if (!token || !newLessonTitle.trim()) return;
    setAddingLesson(true);
    try {
      const module = course?.modules.find((m) => m.id === moduleId);
      const res = await fetchWithAuth(`${API_BASE}/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          description: newLessonDesc.trim(),
          video_provider: "none",
          content_markdown: "",
          duration_minutes: parseInt(newLessonDuration) || 0,
          sort_order: (module?.lessons.length ?? 0) + 1,
          is_free_preview: newLessonIsFree,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewLessonTitle("");
      setNewLessonDesc("");
      setNewLessonDuration("10");
      setNewLessonIsFree(false);
      setShowLessonForm(null);
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add lesson");
    } finally {
      setAddingLesson(false);
    }
  };

  const deleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!token || !confirm(`Delete lesson "${lessonTitle}"?`)) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCourse();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete lesson");
    }
  };

  const totalLessons = course?.modules.reduce(
    (sum, module) => sum + module.lessons.length, 0
  ) ?? 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#A78BFA]" size={36} />
        <p className="text-sm text-[#9299AE]">Loading course workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated || !course) return null;

  const inputClass =
    "w-full rounded-xl border border-white/[0.09] bg-[#101525] px-4 py-3 text-sm text-white placeholder:text-[#687087] outline-none transition focus:border-[#8B70FF] focus:ring-2 focus:ring-[#7559E8]/15";

  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9299AE]";

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1440px]">

        <Link
          href="/admin/courses"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#9299AE] transition hover:text-white"
        >
          <ArrowLeft size={16} />
          All courses
        </Link>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.07] p-4">
            <AlertCircle className="mt-0.5 shrink-0 text-[#F05D70]" size={18} />
            <div>
              <p className="text-sm font-semibold text-white">Unable to load course</p>
              <p className="mt-1 break-words text-xs text-[#F3A0AA]">{error}</p>
              <button onClick={loadCourse} className="mt-3 text-xs font-semibold text-white underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Course hero */}
        <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#11182A]">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#7559E8]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-[#3D70B8]/10 blur-3xl" />

          <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_260px] lg:items-center lg:p-9">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                  course.status === "published"
                    ? "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]"
                    : course.status === "draft"
                    ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
                    : "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]"
                }`}>
                  {course.status}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs capitalize text-[#B7BDD0]">
                  {difficulty}
                </span>
                <span className="text-xs text-[#7A8199]">Course workspace</span>
              </div>

              <h1 className="max-w-3xl break-words text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {course.title}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A3ABC0]">
                {shortDesc || "Add a short description to introduce this course to students."}
              </p>

              <p className="mt-4 break-all font-mono text-xs text-[#7A8199]">
                /courses/{course.slug}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Eye size={16} /> Preview course
                </Link>

                <button
                  onClick={toggleStatus}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    course.status === "published"
                      ? "border border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70] hover:bg-[#F05D70]/20"
                      : "bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/20 hover:brightness-110"
                  }`}
                >
                  {course.status === "published"
                    ? <><EyeOff size={16} /> Unpublish course</>
                    : <><Eye size={16} /> Publish course</>}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.09] bg-[#0B1020]/70 p-3">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Course cover"
                  className="h-40 w-full rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.025]">
                  <BookOpen size={32} className="text-[#A78BFA]" />
                  <span className="mt-3 text-xs text-[#7A8199]">Course cover preview</span>
                </div>
              )}
              <p className="mt-3 text-center text-xs text-[#7A8199]">
                Course appearance
              </p>
            </div>
          </div>
        </section>

        {/* Course statistics */}
        <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Modules", value: course.modules.length, icon: Layers },
            { label: "Total lessons", value: totalLessons, icon: BookOpen },
            { label: "Estimated duration", value: `${estimatedHours || 0}h`, icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#111827] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]">
                <stat.icon size={21} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-[#9299AE]">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Main workspace */}
        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">

          {/* Course settings */}
          <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#111827]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]">
                    <GraduationCap size={19} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Course settings</h2>
                </div>
                <p className="mt-2 text-xs text-[#7A8199]">Manage your course information and appearance.</p>
              </div>

              <button
                onClick={saveCourse}
                disabled={savingCourse}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B70FF] disabled:opacity-50"
              >
                {savingCourse
                  ? <><Loader2 size={15} className="animate-spin" /> Saving</>
                  : savedCourse
                  ? <><Check size={15} /> Saved</>
                  : <><Save size={15} /> Save changes</>}
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label className={labelClass}>Course title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Enter course title" />
              </div>

              <div>
                <label className={labelClass}>Short description</label>
                <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className={inputClass} placeholder="A short introduction" />
              </div>

              <div>
                <label className={labelClass}>Cover image URL</label>
                <input type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className={inputClass} placeholder="https://example.com/image.jpg" />
              </div>

              <div>
                <label className={labelClass}>Full course description</label>
                <textarea rows={6} value={longDesc} onChange={(e) => setLongDesc(e.target.value)} className={`${inputClass} resize-y leading-6`} placeholder="Describe what students will learn..." />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Difficulty</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                    {["beginner", "intermediate", "advanced", "expert"].map((d) => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Estimated hours</label>
                  <input type="number" min="0" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="rounded-xl border border-[#7559E8]/20 bg-[#7559E8]/[0.06] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#C4B5FD]">
                  <Sparkles size={16} /> Publishing tip
                </div>
                <p className="mt-2 text-xs leading-5 text-[#9299AE]">
                  Review the course title, description and curriculum before publishing. Students will see the public course page.
                </p>
              </div>
            </div>
          </section>

          {/* Curriculum builder */}
          <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#111827]">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]">
                    <BookOpen size={19} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Curriculum builder</h2>
                </div>
                <p className="mt-2 text-xs text-[#7A8199]">
                  Organize modules, lessons and learning content.
                </p>
              </div>

              <button
                onClick={() => setShowModuleForm(!showModuleForm)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {showModuleForm ? <X size={16} /> : <Plus size={16} />}
                {showModuleForm ? "Cancel" : "Add module"}
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {showModuleForm && (
                <div className="rounded-2xl border border-[#7559E8]/30 bg-[#7559E8]/[0.06] p-4">
                  <h3 className="mb-4 text-sm font-bold text-white">Create a new module</h3>
                  <div className="space-y-3">
                    <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="Module title" className={inputClass} />
                    <input value={newModuleDesc} onChange={(e) => setNewModuleDesc(e.target.value)} placeholder="Module description (optional)" className={inputClass} />
                    <button onClick={addModule} disabled={addingModule || !newModuleTitle.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50">
                      {addingModule ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      {addingModule ? "Creating..." : "Create module"}
                    </button>
                  </div>
                </div>
              )}

              {course.modules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7559E8]/10 text-[#A78BFA]">
                    <BookOpen size={26} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">Your curriculum starts here</h3>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#7A8199]">
                    Create your first module, then add lessons and learning materials.
                  </p>
                  <button onClick={() => setShowModuleForm(true)} className="mt-5 rounded-xl bg-[#7559E8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#8B70FF]">
                    <Plus size={14} className="mr-1 inline" /> Create first module
                  </button>
                </div>
              ) : (
                course.modules.map((module, mIdx) => (
                  <article key={module.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1423]">
                    <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7559E8]/20 bg-[#7559E8]/15 text-sm font-bold text-[#C4B5FD]">
                          {String(mIdx + 1).padStart(2, "0")}
                        </div>
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-bold text-white">{module.title}</h3>
                          <p className="mt-1 text-xs text-[#7A8199]">
                            {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
                            {module.description ? ` · ${module.description}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setShowLessonForm(showLessonForm === module.id ? null : module.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#7559E8]/30 bg-[#7559E8]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-[#7559E8]/20"
                        >
                          <Plus size={14} /> Add lesson
                        </button>
                        <button onClick={() => deleteModule(module.id, module.title)} title="Delete module" className="rounded-lg border border-white/[0.07] p-2 text-[#F05D70] transition hover:bg-[#F05D70]/10">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {showLessonForm === module.id && (
                      <div className="space-y-3 border-b border-white/[0.07] bg-[#7559E8]/[0.045] p-4">
                        <h4 className="text-sm font-semibold text-white">Add a lesson</h4>
                        <input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Lesson title" className={inputClass} />
                        <input value={newLessonDesc} onChange={(e) => setNewLessonDesc(e.target.value)} placeholder="Short lesson description (optional)" className={inputClass} />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <label className="flex items-center gap-2 text-xs text-[#B7BDD0]">
                            Duration
                            <input type="number" min="0" value={newLessonDuration} onChange={(e) => setNewLessonDuration(e.target.value)} className="w-20 rounded-lg border border-white/10 bg-[#101525] px-3 py-2 text-white outline-none focus:border-[#8B70FF]" />
                            minutes
                          </label>
                          <label className="flex items-center gap-2 text-xs text-[#B7BDD0]">
                            <input type="checkbox" checked={newLessonIsFree} onChange={(e) => setNewLessonIsFree(e.target.checked)} className="h-4 w-4 accent-[#7559E8]" />
                            Free preview
                          </label>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => setShowLessonForm(null)} className="rounded-lg px-4 py-2 text-xs text-[#9299AE] hover:text-white">Cancel</button>
                          <button onClick={() => addLesson(module.id)} disabled={addingLesson || !newLessonTitle.trim()} className="rounded-lg bg-[#7559E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50">
                            {addingLesson ? "Adding..." : "Create lesson"}
                          </button>
                        </div>
                      </div>
                    )}

                    {module.lessons.length === 0 ? (
                      <div className="px-4 py-7 text-center">
                        <FileText size={20} className="mx-auto text-[#687087]" />
                        <p className="mt-2 text-xs text-[#7A8199]">No lessons in this module yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.055]">
                        {module.lessons.map((lesson, lIdx) => (
                          <div key={lesson.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-semibold text-[#9299AE]">
                                {lIdx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="break-words text-sm font-medium text-white">{lesson.title}</p>
                                  {lesson.is_free_preview && (
                                    <span className="rounded-md bg-[#22C58B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#22C58B]">Free</span>
                                  )}
                                </div>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7A8199]">
                                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {lesson.duration_minutes} min</span>
                                  <span>·</span>
                                  <span>{lesson.video_provider === "none" ? "Text lesson" : `Video · ${lesson.video_provider}`}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:justify-end">
                              <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#C4B5FD] transition hover:bg-[#7559E8]/15 sm:flex-none">
                                <Edit3 size={14} /> Edit lesson
                              </Link>
                              <button onClick={() => deleteLesson(lesson.id, lesson.title)} title="Delete lesson" className="rounded-lg border border-white/10 p-2 text-[#F05D70] transition hover:bg-[#F05D70]/10">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
