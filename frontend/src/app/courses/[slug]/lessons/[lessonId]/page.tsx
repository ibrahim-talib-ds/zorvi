import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, Circle, PlayCircle, AlertCircle, BookOpen } from "lucide-react";
import { cookies } from "next/headers";
import { MarkCompleteButton, ProgressBar } from "./LessonViewer";
import { CodeBlock } from "@/components/courses/CodeBlock";
import { ExerciseBlock } from "@/components/courses/ExerciseBlock";

import { API_BASE } from "@/lib/api/client";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_provider: string;
  video_url: string | null;
  video_file_key: string | null;
  content_markdown: string;
  code_example: string | null;
  exercise: string | null;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
  is_completed: boolean;
}

interface LessonPreview {
  id: string;
  title: string;
  duration_minutes: number;
  is_free_preview: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: LessonPreview[];
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  modules: Module[];
}

interface Progress {
  total_lessons: number;
  completed_lessons: number;
  percent_complete: number;
}


async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("zorvi_access_token")?.value ?? null;
}

async function fetchCourse(slug: string): Promise<CourseDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/courses/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLesson(
  slug: string,
  lessonId: string,
  token: string | null,
): Promise<{ lesson: Lesson | null; error: "auth" | "enrollment" | "notfound" | null }> {
  try {
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/courses/${slug}/lessons/${lessonId}`, {
      headers,
      cache: "no-store",
    });
    if (res.status === 401) return { lesson: null, error: "auth" };
    if (res.status === 403) return { lesson: null, error: "enrollment" };
    if (res.status === 404) return { lesson: null, error: "notfound" };
    if (!res.ok) return { lesson: null, error: "notfound" };
    return { lesson: await res.json(), error: null };
  } catch {
    return { lesson: null, error: "notfound" };
  }
}

async function fetchProgress(slug: string, token: string | null): Promise<Progress | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/courses/${slug}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonId } = await params;

  const token = await getTokenFromCookies();
  const course = await fetchCourse(slug);
  if (!course) notFound();

  const { lesson, error } = await fetchLesson(slug, lessonId, token);

  // Handle enrollment error
  if (error === "enrollment" || error === "auth") {
    return (
      <div className="relative min-h-screen bg-[#0B0F1D] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <Link
            href={`/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] mb-8"
          >
            <ArrowLeft size={14} /> Back to Course
          </Link>
          <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/5 p-10">
            <AlertCircle size={40} className="text-[#F5A623] mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              {error === "auth" ? "Sign in to continue" : "Enroll to access this lesson"}
            </h1>
            <p className="text-[#B7BDD0] mb-6">
              {error === "auth"
                ? "This lesson is part of the course. Please sign in or create a free account."
                : "This lesson is not a free preview. Enroll in the course to access all lessons."}
            </p>
            <Link
              href={`/courses/${slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110"
            >
              Go to course →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) notFound();

  const progress = await fetchProgress(slug, token);

  // Flatten lessons for prev/next navigation
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const youtubeId = lesson.video_provider === "youtube" && lesson.video_url
    ? extractYouTubeId(lesson.video_url)
    : null;

  return (
    <div className="relative min-h-screen bg-[#0B0F1D] flex">
      
      {/* LEFT SIDEBAR - Course Curriculum (W3Schools Style) */}
      <aside className="w-72 border-r border-white/5 bg-[#0B0F1D] h-screen sticky top-0 overflow-y-auto hidden lg:block shrink-0 z-40">
        <div className="p-4 border-b border-white/5">
          <Link href={`/courses/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-[#7A8199] hover:text-[#A78BFA] mb-3 transition">
            <ArrowLeft size={14} /> Back to Overview
          </Link>
          <h2 className="font-display text-sm font-bold text-white leading-snug line-clamp-2">
            {course.title}
          </h2>
          {progress && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-[#7A8199] mb-1">
                <span>Progress</span>
                <span>{Math.round(progress.percent_complete)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#7559E8] rounded-full transition-all" style={{ width: `${progress.percent_complete}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="py-2">
          {course.modules.map((module, mIdx) => (
            <div key={module.id} className="mb-2">
              <div className="px-4 py-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#7A8199]">
                  Module {mIdx + 1}
                </p>
                <p className="text-xs font-semibold text-[#B7BDD0] truncate">
                  {module.title}
                </p>
              </div>
              <div>
                {module.lessons.map((l) => {
                  const isCurrent = l.id === lesson.id;
                  return (
                    <Link
                      key={l.id}
                      href={`/courses/${slug}/lessons/${l.id}`}
                      className={`flex items-start gap-2.5 px-4 py-2 text-xs transition border-l-2 ${
                        isCurrent
                          ? "bg-[#7559E8]/10 border-[#7559E8] text-white font-medium"
                          : "hover:bg-white/[0.03] border-transparent text-[#7A8199] hover:text-[#B7BDD0]"
                      }`}
                    >
                      {isCurrent ? (
                        <PlayCircle size={14} className="flex-shrink-0 mt-0.5 text-[#A78BFA]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="flex-1 line-clamp-2">{l.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Mobile Bar / Breadcrumb */}
        <div className="border-b border-white/5 bg-[#0B0F1D]/80 backdrop-blur-sm sticky top-16 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link href={`/courses/${slug}`} className="lg:hidden inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA]">
              <ArrowLeft size={14} /> Overview
            </Link>
            <span className="hidden lg:inline-block text-xs font-mono text-[#7A8199] uppercase tracking-wider">
              Lesson {currentIndex + 1} of {allLessons.length}
            </span>
            {progress && (
              <div className="w-32 lg:w-48">
                <ProgressBar completed={progress.completed_lessons} total={progress.total_lessons} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          
          {/* Video */}
          {youtubeId ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#000] mb-10 shadow-lg shadow-black/50">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#171B33] to-[#0B0F1D] flex items-center justify-center mb-10">
              <div className="text-center">
                <BookOpen size={48} className="text-[#7559E8]/50 mx-auto mb-3" />
                <p className="text-sm text-[#7A8199]">Written Lesson</p>
              </div>
            </div>
          )}

          {/* Meta & Title */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] bg-[#7559E8]/10 px-2 py-1 rounded">
              Lesson {currentIndex + 1}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7A8199]">
              <Clock size={14} /> {lesson.duration_minutes} min read
            </span>
            {lesson.is_completed && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B] inline-flex items-center gap-1">
                <CheckCircle2 size={10} /> Completed
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            {lesson.title}
          </h1>
          
          {lesson.description && (
            <p className="text-lg text-[#B7BDD0] mb-10 leading-relaxed">{lesson.description}</p>
          )}

          {/* Written content */}
          {lesson.content_markdown && (
            <article className="prose prose-invert prose-lg max-w-none mb-12">
              <MarkdownRenderer text={lesson.content_markdown} />
            </article>
          )}

          {/* Code example */}
          {lesson.code_example && (
            <div className="mb-12">
              <h2 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7559E8]" /> Code Example
              </h2>
              {/* Default to python for the FastAPI course, but can be extended later */}
              <CodeBlock code={lesson.code_example} language="python" />
            </div>
          )}

          {/* Exercise */}
          {lesson.exercise && (
            <ExerciseBlock exerciseText={lesson.exercise} language="python" />
          )}

          {/* Mark complete button */}
          <div className="mb-12 p-6 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-white">Finished this lesson?</p>
              <p className="text-sm text-[#7A8199]">Mark it as complete to track your progress.</p>
            </div>
            <MarkCompleteButton
              courseSlug={slug}
              lessonId={lesson.id}
              initialCompleted={lesson.is_completed}
            />
          </div>

          {/* Prev / Next Navigation */}
          <div className="flex items-center justify-between gap-4 pt-8 border-t border-white/10">
            {prevLesson ? (
              <Link
                href={`/courses/${slug}/lessons/${prevLesson.id}`}
                className="group inline-flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 hover:bg-white/10 hover:border-white/20 transition max-w-[45%]"
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A8199] group-hover:text-white transition flex items-center gap-1">
                  <ArrowLeft size={10} /> Previous
                </span>
                <span className="text-sm font-medium text-white truncate w-full">{prevLesson.title}</span>
              </Link>
            ) : <div />}
            
            {nextLesson ? (
              <Link
                href={`/courses/${slug}/lessons/${nextLesson.id}`}
                className="group inline-flex flex-col items-end gap-1 rounded-xl bg-[#7559E8] px-5 py-3 hover:bg-[#8B70FF] transition max-w-[45%] ml-auto shadow-lg shadow-[#7559E8]/20"
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/80 flex items-center gap-1">
                  Next <ArrowRight size={10} />
                </span>
                <span className="text-sm font-medium text-white truncate w-full">{nextLesson.title}</span>
              </Link>
            ) : (
              <Link
                href={`/courses/${slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22C58B] px-6 py-4 text-sm font-bold text-black hover:bg-[#3FD9A2] transition ml-auto shadow-lg shadow-[#22C58B]/20"
              >
                Finish Course <ArrowRight size={16} />
              </Link>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactElement[] = [];
  let key = 0;
  let inList = false;
  let listItems: React.ReactElement[] = [];

  const parseInlineFormatting = (str: string) => {
    // 1. Bold (**text**)
    let formatted = str.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    // 2. Inline Code (`code`)
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-[#1E1E1E] text-[#F5A623] px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    // 3. Italics (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-[#B7BDD0] italic">$1</em>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); inList = false; listItems = []; }
      elements.push(<h2 key={key++} className="font-display text-3xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); inList = false; listItems = []; }
      elements.push(<h3 key={key++} className="font-display text-2xl font-bold text-[#A78BFA] mt-6 mb-3">{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); inList = false; listItems = []; }
      elements.push(<h4 key={key++} className="font-display text-xl font-bold text-white mt-5 mb-2">{line.slice(4)}</h4>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={key++} className="text-[#B7BDD0] ml-6 mb-2 list-disc leading-relaxed">
          {parseInlineFormatting(line.slice(2))}
        </li>
      );
    } else if (line.match(/^\d+\.\s/)) {
      inList = true;
      const contentText = line.replace(/^\d+\.\s/, "");
      listItems.push(
        <li key={key++} className="text-[#B7BDD0] ml-6 mb-2 list-decimal leading-relaxed">
          {parseInlineFormatting(contentText)}
        </li>
      );
    } else if (line.trim() === "") {
      if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); inList = false; listItems = []; }
      elements.push(<div key={key++} className="h-4" />);
    } else {
      if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); inList = false; listItems = []; }
      elements.push(
        <p key={key++} className="text-[#B7BDD0] mb-4 leading-relaxed text-lg">
          {parseInlineFormatting(line)}
        </p>
      );
    }
  }

  if (inList) { elements.push(<ul key={key++} className="mb-4">{listItems}</ul>); }

  return <div>{elements}</div>;
}
