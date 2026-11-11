"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Plus, Edit3, Trash2, Eye, EyeOff, Save,
  BookOpen, Video, FileText, Check, X, AlertCircle,
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

  if (authLoading || loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated || !course) return null;

  return (
    <div className="py-10 px-6 lg:px-10">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back to Courses
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-display text-3xl font-extrabold text-white">{course.title}</h1>
            <span
              className={`inline-block rounded-full border px-3 py-0.5 text-xs capitalize ${
                course.status === "published"
                  ? "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]"
                  : course.status === "draft"
                  ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
                  : "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]"
              }`}
            >
              {course.status}
            </span>
          </div>
          <p className="text-sm text-[#7A8199] font-mono">/courses/{course.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
          >
            <Eye size={14} /> Preview
          </Link>
          <button
            onClick={toggleStatus}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              course.status === "published"
                ? "bg-[#F05D70]/15 border border-[#F05D70]/40 text-[#F05D70] hover:bg-[#F05D70]/25"
                : "bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-white hover:brightness-110"
            }`}
          >
            {course.status === "published" ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
          </button>
        </div>
      </div>

      {/* Course details */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-white">Course details</h2>
          <button
            onClick={saveCourse}
            disabled={savingCourse}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50 transition"
          >
            {savingCourse ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : savedCourse ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Short description</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Long description</label>
            <textarea
              rows={4}
              value={longDesc}
              onChange={(e) => setLongDesc(e.target.value)}
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
              >
                {["beginner", "intermediate", "advanced", "expert"].map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Estimated hours</label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modules & Lessons */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Course curriculum</h2>
            <p className="text-xs text-[#7A8199] mt-1">
              {course.modules.length} {course.modules.length === 1 ? "module" : "modules"} ·{" "}
              {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons total
            </p>
          </div>
          <button
            onClick={() => setShowModuleForm(!showModuleForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
          >
            {showModuleForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Module</>}
          </button>
        </div>

        {showModuleForm && (
          <div className="mb-6 rounded-xl border border-[#7559E8]/30 bg-[#7559E8]/5 p-4 space-y-3">
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Module title (e.g. Getting Started)"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
            />
            <input
              type="text"
              value={newModuleDesc}
              onChange={(e) => setNewModuleDesc(e.target.value)}
              placeholder="Module description (optional)"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
            />
            <div className="flex gap-2">
              <button
                onClick={addModule}
                disabled={addingModule || !newModuleTitle.trim()}
                className="rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50 transition"
              >
                {addingModule ? "Adding..." : "Add Module"}
              </button>
            </div>
          </div>
        )}

        {course.modules.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={32} className="text-[#7A8199] mx-auto mb-3" />
            <p className="text-sm text-[#B7BDD0]">No modules yet. Click "Add Module" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.modules.map((module, mIdx) => (
              <div key={module.id} className="rounded-xl border border-white/10 bg-[#0B0F1D] overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#7559E8]/15 flex items-center justify-center text-sm font-bold text-[#A78BFA] flex-shrink-0">
                      {mIdx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{module.title}</p>
                      {module.description && (
                        <p className="text-xs text-[#7A8199] truncate">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[#7A8199]">
                      {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                    <button
                      onClick={() => setShowLessonForm(showLessonForm === module.id ? null : module.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#7559E8]/15 border border-[#7559E8]/30 px-3 py-1.5 text-xs font-medium text-[#A78BFA] hover:bg-[#7559E8]/25 transition"
                    >
                      <Plus size={12} /> Add Lesson
                    </button>
                    <button
                      onClick={() => deleteModule(module.id, module.title)}
                      className="p-1.5 rounded-lg text-[#F05D70] hover:bg-[#F05D70]/10 transition"
                      title="Delete module"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Add lesson inline form */}
                {showLessonForm === module.id && (
                  <div className="p-4 border-b border-white/10 bg-[#7559E8]/5 space-y-3">
                    <input
                      type="text"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder="Lesson title (e.g. Install Python)"
                      className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] text-sm"
                    />
                    <input
                      type="text"
                      value={newLessonDesc}
                      onChange={(e) => setNewLessonDesc(e.target.value)}
                      placeholder="Short description (optional)"
                      className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] text-sm"
                    />
                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[#7A8199]">Duration:</label>
                        <input
                          type="number"
                          value={newLessonDuration}
                          onChange={(e) => setNewLessonDuration(e.target.value)}
                          className="w-20 bg-[#0B0F1D] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#7559E8]"
                        />
                        <span className="text-xs text-[#7A8199]">min</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newLessonIsFree}
                          onChange={(e) => setNewLessonIsFree(e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-[#0B0F1D] checked:bg-[#22C58B]"
                        />
                        <span className="text-xs text-[#B7BDD0]">Free preview</span>
                      </label>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => setShowLessonForm(null)}
                          className="px-3 py-1.5 text-xs text-[#7A8199] hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => addLesson(module.id)}
                          disabled={addingLesson || !newLessonTitle.trim()}
                          className="rounded-lg bg-[#7559E8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50 transition"
                        >
                          {addingLesson ? "Adding..." : "Add Lesson"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lessons list */}
                {module.lessons.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#7A8199]">
                    No lessons yet
                  </div>
                ) : (
                  <div>
                    {module.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition"
                      >
                        <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs text-[#7A8199] flex-shrink-0">
                          {lIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white truncate">{lesson.title}</p>
                            {lesson.is_free_preview && (
                              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#22C58B]/15 text-[#22C58B] flex-shrink-0">
                                Free
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7A8199]">
                            {lesson.duration_minutes} min · {lesson.video_provider === "none" ? "Text only" : `Video (${lesson.video_provider})`}
                          </p>
                        </div>
                        <Link
                          href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                          className="p-1.5 rounded-lg text-[#B7BDD0] hover:bg-white/5 hover:text-white transition"
                          title="Edit lesson content"
                        >
                          <Edit3 size={14} />
                        </Link>
                        <button
                          onClick={() => deleteLesson(lesson.id, lesson.title)}
                          className="p-1.5 rounded-lg text-[#F05D70] hover:bg-[#F05D70]/10 transition"
                          title="Delete lesson"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
