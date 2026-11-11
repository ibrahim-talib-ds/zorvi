import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, PlayCircle, GraduationCap } from "lucide-react";
import { EnrollButton } from "./EnrollButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LessonPreview {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: LessonPreview[];
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  difficulty: string;
  technologies: string[];
  learning_path: string | null;
  estimated_hours: number;
  is_featured: boolean;
  modules: Module[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8010/api/v1";

async function fetchCourse(slug: string): Promise<CourseDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/courses/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const course = await fetchCourse(slug);
  if (!course) return { title: "Course not found — ZORVI" };
  return {
    title: `${course.title} — ZORVI Academy`,
    description: course.short_description,
  };
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]",
  intermediate: "border-[#5B9EFF]/30 bg-[#5B9EFF]/10 text-[#5B9EFF]",
  advanced: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]",
  expert: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await fetchCourse(slug);
  if (!course) notFound();

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalMinutes = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.duration_minutes, 0),
    0,
  );
  const firstLessonId = course.modules[0]?.lessons[0]?.id ?? null;

  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Courses
        </Link>

        <div className="grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-16 items-start">
          {/* LEFT: Course content */}
          <div className="min-w-0">
            {/* Hero image */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33] to-[#0B0F1D] overflow-hidden mb-8 aspect-[16/9] flex items-center justify-center group max-w-3xl">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-grid" />
              </div>
              {(course.cover_image_url || course.thumbnail_url) ? (
                <img 
                  src={course.cover_image_url || course.thumbnail_url || ""} 
                  alt={course.title} 
                  className="relative max-w-md max-h-full object-contain p-6" 
                />
              ) : (
                <span className="relative text-[12rem] font-extrabold text-[#7559E8]/20 group-hover:text-[#7559E8]/30 transition-colors duration-500">
                  {course.title.charAt(0)}
                </span>
              )}
              {course.is_featured && (
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/40 text-[11px] font-mono uppercase tracking-wider text-[#F5A623]">
                  Featured
                </span>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${DIFFICULTY_COLORS[course.difficulty] ?? DIFFICULTY_COLORS.beginner}`}
              >
                {course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#7A8199]">
                <Clock size={14} /> {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m of content
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#7A8199]">
                <GraduationCap size={14} /> {totalLessons} lessons
              </span>
            </div>

            {/* Title + description */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-[1.1]">
              {course.title}
            </h1>
            <p className="text-lg text-[#B7BDD0] mb-8 leading-relaxed">
              {course.short_description}
            </p>

            {/* What you'll master — technologies */}
            {course.technologies.length > 0 && (
              <div className="mb-12">
                <h2 className="font-display text-lg font-bold text-white mb-4">What you&apos;ll master</h2>
                <div className="flex flex-wrap gap-2">
                  {course.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 rounded-md text-sm font-mono bg-white/[0.03] text-[#B7BDD0] border border-white/5 hover:border-[#7559E8]/30 hover:text-white transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            {course.long_description && (
              <div className="mb-12">
                <h2 className="font-display text-2xl font-bold text-white mb-4">
                  About this course
                </h2>
                <div className="text-[#B7BDD0] leading-relaxed whitespace-pre-line">
                  {course.long_description}
                </div>
              </div>
            )}

            {/* Curriculum */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-white">
                  Course Curriculum
                </h2>
                <span className="text-sm text-[#7A8199]">
                  {course.modules.length} {course.modules.length === 1 ? "module" : "modules"} · {totalLessons} lessons
                </span>
              </div>
              <div className="space-y-4">
                {course.modules.map((module, mIdx) => {
                  const moduleMinutes = module.lessons.reduce((sum, l) => sum + l.duration_minutes, 0);
                  return (
                    <div
                      key={module.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition-colors"
                    >
                      <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <h3 className="font-display font-bold text-white">
                            Module {mIdx + 1}: {module.title}
                          </h3>
                          <span className="text-xs text-[#7A8199] whitespace-nowrap">
                            {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"} · {moduleMinutes} min
                          </span>
                        </div>
                        {module.description && <p className="text-sm text-[#B7BDD0] mt-1">{module.description}</p>}
                      </div>
                      <div>
                        {module.lessons.map((lesson) => (
                          <Link
                            key={lesson.id}
                            href={`/courses/${course.slug}/lessons/${lesson.id}`}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition border-b border-white/5 last:border-0 group"
                          >
                            <PlayCircle
                              size={18}
                              className="text-[#A78BFA] flex-shrink-0 group-hover:text-[#8B70FF] group-hover:scale-110 transition-transform"
                            />
                            <span className="text-sm text-white flex-1 group-hover:text-[#A78BFA] transition-colors">
                              {lesson.title}
                            </span>
                            {lesson.is_free_preview && (
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]">
                                Preview
                              </span>
                            )}
                            <span className="text-xs text-[#7A8199] flex items-center gap-1 whitespace-nowrap">
                              <Clock size={11} /> {lesson.duration_minutes}min
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Sticky enroll card */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33]/80 to-[#0B0F1D] p-7 backdrop-blur-sm shadow-xl shadow-black/40">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1">
                  Start learning today
                </h3>
                <p className="text-sm text-[#7A8199]">
                  Free access · Learn at your own pace
                </p>
              </div>

              <EnrollButton courseSlug={course.slug} firstLessonId={firstLessonId} />

              <div className="mt-7 pt-7 border-t border-white/5 space-y-3 text-sm">
                <div className="flex items-center gap-2.5 text-[#B7BDD0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C58B]/15 flex items-center justify-center text-[#22C58B] text-xs">✓</span>
                  {totalLessons} lessons in {course.modules.length} {course.modules.length === 1 ? "module" : "modules"}
                </div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C58B]/15 flex items-center justify-center text-[#22C58B] text-xs">✓</span>
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m of content
                </div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C58B]/15 flex items-center justify-center text-[#22C58B] text-xs">✓</span>
                  Certificate on completion
                </div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C58B]/15 flex items-center justify-center text-[#22C58B] text-xs">✓</span>
                  Lifetime access
                </div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]">
                  <span className="w-5 h-5 rounded-full bg-[#22C58B]/15 flex items-center justify-center text-[#22C58B] text-xs">✓</span>
                  Preview selected lessons
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
