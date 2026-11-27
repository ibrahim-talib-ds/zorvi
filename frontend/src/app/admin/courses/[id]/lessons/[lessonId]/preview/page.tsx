"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Eye, Loader2, Pencil } from "lucide-react";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { CodeBlock } from "@/components/courses/CodeBlock";
import { LessonMarkdown } from "@/components/courses/LessonMarkdown";
import { ExerciseBlock } from "@/components/courses/ExerciseBlock";
import { PracticalExamples, PracticeQuestions } from "@/components/courses/StructuredLessonActivities";

interface LessonData { id: string; title: string; description: string; content_markdown: string; video_provider: string; video_url: string | null; code_example: string | null; code_language?: string; exercise: string | null; duration_minutes: number; is_free_preview: boolean; practical_examples?: { title?: string; explanation?: string; code?: string; language?: string; expected_output?: string }[]; practice_questions?: { type?: string; prompt?: string; options?: string[]; answer?: string; explanation?: string; hint?: string; points?: number }[]; }
interface CourseData { id: string; title: string; slug: string; modules: { id: string; title: string; lessons: LessonData[] }[]; }

export default function AdminLessonPreviewPage() {
  const { id, lessonId } = useParams<{ id: string; lessonId: string }>();
  const { token } = useAuth();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token || !id || !lessonId) return;
    let active = true;
    fetchWithAuth(`${API_BASE}/admin/courses/${id}`).then(async response => { if (!response.ok) throw new Error(`Unable to load lesson preview (${response.status}).`); return response.json(); }).then((data: CourseData) => {
      if (!active) return;
      const owner = data.modules.find(module => module.lessons.some(item => item.id === lessonId));
      const found = owner?.lessons.find(item => item.id === lessonId);
      if (!found || !owner) throw new Error("This lesson could not be found in the selected course.");
      setCourse(data); setLesson(found); setModuleTitle(owner.title);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load lesson preview."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, id, lessonId]);
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-[#AEB9CA]"><Loader2 className="animate-spin"/> Loading lesson preview...</div>;
  if (error || !course || !lesson) return <div className="mx-auto max-w-3xl px-5 py-16"><p className="text-[#F3A0AA]">{error || "Lesson not found."}</p><Link href={`/admin/courses/${id}`} className="mt-5 inline-flex items-center gap-2 text-sm text-[#C4B5FD]"><ArrowLeft size={15}/> Back to course editor</Link></div>;
  const youtubeId = lesson.video_provider === "youtube" && lesson.video_url ? lesson.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] : null;
  return <main className="min-h-screen bg-[#0B0F1D] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-4xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href={`/admin/courses/${id}/preview`} className="inline-flex items-center gap-2 text-sm text-[#AEB9CA] hover:text-white"><ArrowLeft size={16}/> Course preview</Link><span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"><Eye size={14}/> ADMIN LESSON PREVIEW</span></div>
    <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#A78BFA]">{course.title} · {moduleTitle}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#9299AE]"><span className="inline-flex items-center gap-1.5"><Clock size={13}/>{lesson.duration_minutes} minutes</span>{lesson.is_free_preview && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-300">Free preview lesson</span>}</div><h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{lesson.title}</h1>{lesson.description && <p className="mt-4 text-lg leading-7 text-[#B7BDD0]">{lesson.description}</p>}</div>
    {youtubeId && <div className="mb-8 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${youtubeId}`} title={lesson.title} allowFullScreen/></div>}
    {lesson.content_markdown ? <article className="prose prose-invert max-w-none rounded-2xl border border-white/10 bg-[#111827] p-5 sm:p-8"><LessonMarkdown content={lesson.content_markdown} lessonId={lesson.id} courseSlug={course.slug}/></article> : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-[#9299AE]">No lesson content has been added yet.</div>}
    {lesson.code_example && <section className="mt-8"><h2 className="mb-4 text-xl font-bold">Code example</h2><CodeBlock code={lesson.code_example} language={lesson.code_language || "text"}/></section>}
    {lesson.exercise && !lesson.content_markdown?.includes("IBRANT_EXERCISE_V1:") && <ExerciseBlock exerciseText={lesson.exercise} language="html" lessonId={lesson.id} courseSlug={course.slug} />}
    <PracticalExamples examples={lesson.practical_examples || []}/><PracticeQuestions questions={lesson.practice_questions || []}/>
    <div className="mt-10 flex flex-wrap justify-end gap-3"><Link href={`/admin/courses/${id}/lessons/${lessonId}`} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-3 text-sm font-semibold hover:bg-[#8B70FF]"><Pencil size={15}/> Edit lesson</Link></div>
  </div></main>;
}
