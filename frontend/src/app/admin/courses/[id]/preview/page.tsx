"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Pencil, PlayCircle } from "lucide-react";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface PreviewLesson { id: string; title: string; description: string; duration_minutes: number; is_free_preview: boolean; }
interface PreviewModule { id: string; title: string; description: string; lessons: PreviewLesson[]; }
interface PreviewCourse { id: string; title: string; slug: string; short_description: string; long_description: string; cover_image_url: string | null; difficulty: string; estimated_hours: number; duration_weeks: number; technologies: string[]; status: string; modules: PreviewModule[]; }

export default function AdminCoursePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [course, setCourse] = useState<PreviewCourse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !id) return;
    let active = true;
    fetchWithAuth(`${API_BASE}/admin/courses/${id}`).then(async response => {
      if (!response.ok) throw new Error(`Unable to load course preview (${response.status}).`);
      return response.json();
    }).then(data => { if (active) setCourse(data as PreviewCourse); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load course preview."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, id]);
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-[#AEB9CA]"><Loader2 className="animate-spin"/> Loading course preview...</div>;
  if (error || !course) return <div className="mx-auto max-w-3xl px-5 py-16"><p className="text-[#F3A0AA]">{error || "Course not found."}</p><Link href={`/admin/courses/${id}`} className="mt-5 inline-flex items-center gap-2 text-sm text-[#C4B5FD]"><ArrowLeft size={15}/> Back to course editor</Link></div>;
  const lessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const minutes = course.modules.reduce((sum, module) => sum + module.lessons.reduce((m, lesson) => m + (lesson.duration_minutes || 0), 0), 0);
  return <main className="min-h-screen bg-[#0B0F1D] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href={`/admin/courses/${id}`} className="inline-flex items-center gap-2 text-sm text-[#AEB9CA] hover:text-white"><ArrowLeft size={16}/> Back to course editor</Link><span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"><Eye size={14}/> ADMIN PREVIEW · {course.status.toUpperCase()}</span></div>
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">{course.cover_image_url && <Image src={course.cover_image_url} alt={`${course.title} cover`} width={1600} height={560} unoptimized className="h-56 w-full object-cover"/>}<div className="p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#A78BFA]">ibrant Academy course preview</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{course.title}</h1><p className="mt-4 max-w-3xl leading-7 text-[#B7BDD0]">{course.short_description}</p><div className="mt-5 flex flex-wrap gap-4 text-xs text-[#9299AE]"><span>{course.difficulty}</span><span>{course.duration_weeks} weeks</span><span>{course.estimated_hours} learning hours</span><span>{course.modules.length} modules</span><span>{lessons} lessons</span><span>{minutes} lesson minutes</span></div>{course.technologies?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{course.technologies.map(tag=><span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#C9D1E2]">{tag}</span>)}</div>}</div></section>
    {course.long_description && <section className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-6"><h2 className="text-xl font-bold">About this course</h2><div className="mt-4 whitespace-pre-wrap leading-7 text-[#B7BDD0]">{course.long_description}</div></section>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-6"><h2 className="text-xl font-bold">Course curriculum</h2><div className="mt-5 space-y-4">{course.modules.map((module,index)=><article key={module.id} className="rounded-xl border border-white/10 bg-[#0B1020] p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7559E8]/20 text-sm font-bold text-[#C4B5FD]">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{module.title}</h3>{module.description && <p className="mt-1 text-sm leading-6 text-[#9299AE]">{module.description}</p>}<p className="mt-2 text-xs text-[#7A8199]">{module.lessons.length} lessons</p></div></div><div className="mt-3 divide-y divide-white/5">{module.lessons.map((lesson)=><div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><PlayCircle size={16} className="shrink-0 text-[#A78BFA]"/><div><p className="text-sm font-medium">{lesson.title}</p><p className="mt-1 text-xs text-[#7A8199]">{lesson.duration_minutes} min {lesson.is_free_preview ? "· Free preview" : ""}</p></div></div><Link href={`/admin/courses/${id}/lessons/${lesson.id}/preview`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-white/5"><Eye size={13}/> Preview lesson</Link></div>)}</div></article>)}</div></section>
    <div className="mt-6 flex justify-end"><Link href={`/admin/courses/${id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-3 text-sm font-semibold hover:bg-[#8B70FF]"><Pencil size={15}/> Edit course</Link></div>
  </div></main>;
}
