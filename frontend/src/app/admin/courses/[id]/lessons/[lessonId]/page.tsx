"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Save, Check, Eye,
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Link as LinkIcon, Quote,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { encodeExercise, parseExercise } from "@/components/courses/ExerciseBlock";

interface LessonData {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_provider: string;
  video_url: string | null;
  content_markdown: string;
  code_example: string | null;
  code_language?: string;
  exercise: string | null;
  duration_minutes: number;
  is_free_preview: boolean;
  practical_examples?: { title?: string; explanation?: string; code?: string; language?: string; expected_output?: string }[];
  practice_questions?: { type?: string; prompt?: string; options?: string[]; answer?: string; explanation?: string; hint?: string; points?: number }[];
}

const LESSON_CODE_LANGUAGES = [
  { value: "html", label: "HTML" }, { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" }, { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" }, { value: "tsx", label: "TSX" },
  { value: "python", label: "Python" }, { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" }, { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" }, { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" }, { value: "java", label: "Java" },
  { value: "php", label: "PHP" }, { value: "c", label: "C" },
  { value: "cpp", label: "C++" }, { value: "csharp", label: "C#" },
  { value: "go", label: "Go" }, { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" }, { value: "text", label: "Plain text" },
];

const VIDEO_PROVIDERS = [
  { value: "none", label: "No video (text only)" },
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "local", label: "Local video file" },
];

export default function LessonEditorPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoProvider, setVideoProvider] = useState("none");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [codeExample, setCodeExample] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("html");
  const [exercise, setExercise] = useState("");
  const [examples, setExamples] = useState<NonNullable<LessonData["practical_examples"]>>([]);
  const [questions, setQuestions] = useState<NonNullable<LessonData["practice_questions"]>>([]);
  const [duration, setDuration] = useState("0");
  const [isFreePreview, setIsFreePreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const loadLesson = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Get lesson content (admin needs full access — use public endpoint while enrolled OR use admin)
      // Admin endpoint isn't listed for GET single lesson, so we use course detail endpoint
      // and find the lesson ID via modules
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      const course = await res.json();

      let foundLesson: LessonData | null = null;
      for (const mod of course.modules) {
        for (const l of mod.lessons) {
          if (l.id === lessonId) {
            foundLesson = l;
            break;
          }
        }
        if (foundLesson) break;
      }

      if (!foundLesson) throw new Error("Lesson not found in this course");

      // Get full lesson content via public endpoint (admin is likely enrolled or use admin)
      const lessonRes = await fetch(
        `${API_BASE}/courses/${course.slug}/lessons/${lessonId}`,
        { headers: { } },
      );
      let fullLesson: LessonData = foundLesson;
      if (lessonRes.ok) {
        fullLesson = await lessonRes.json();
      }

      setLesson(fullLesson);
      setTitle(fullLesson.title || "");
      setDescription(fullLesson.description || "");
      setVideoProvider(fullLesson.video_provider || "none");
      setVideoUrl(fullLesson.video_url || "");
      // Migrate legacy inline exercise markers into the dedicated workspace
      // field. Keeping serialized exercise JSON in lesson Markdown makes it
      // visible to students and prevents the admin builder from editing it.
      const markerPattern = /^\s*IBRANT_EXERCISE_V1:.*(?:\n|$)/m;
      const inlineExercise = (fullLesson.content_markdown || "").match(markerPattern)?.[0]?.trim();
      const cleanContent = (fullLesson.content_markdown || "").replace(markerPattern, "").replace(/\n{3,}/g, "\n\n").trim();
      setContent(cleanContent);
      setCodeExample(fullLesson.code_example || "");
      setCodeLanguage(fullLesson.code_language || "html");
      setExercise(fullLesson.exercise || inlineExercise || "");
      setExamples(fullLesson.practical_examples || []);
      setQuestions(fullLesson.practice_questions || []);
      setDuration(String(fullLesson.duration_minutes || 0));
      setIsFreePreview(fullLesson.is_free_preview || false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?return=/admin/courses/${courseId}/lessons/${lessonId}`);
    }
  }, [authLoading, isAuthenticated, router, courseId, lessonId]);

  useEffect(() => {
    if (token && courseId && lessonId) loadLesson();
  }, [token, courseId, lessonId]);

  // Insert markdown at cursor
  const insertMarkdown = (before: string, after: string = "") => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = before + selected + after;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    // Re-focus and set cursor position after insert
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/lessons/${lessonId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          video_provider: videoProvider,
          video_url: videoProvider !== "none" ? videoUrl.trim() || null : null,
          content_markdown: content.replace(/^\s*IBRANT_EXERCISE_V1:.*(?:\n|$)/m, "").replace(/\n{3,}/g, "\n\n").trim(),
          code_example: codeExample.trim() || null,
          code_language: codeLanguage,
          exercise: exercise.trim() || null,
          practical_examples: examples,
          practice_questions: questions,
          duration_minutes: parseInt(duration) || 0,
          is_free_preview: isFreePreview,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;
  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Course
        </Link>
        <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-6">
          <p className="text-[#F05D70]">{error}</p>
        </div>
      </div>
    );
  }
  if (!lesson) return null;

  const inputClass = "w-full rounded-xl border border-white/10 bg-[#101525] px-4 py-3 text-sm text-white placeholder:text-[#687087] outline-none transition focus:border-[#8B70FF]";
  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9299AE]";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/admin/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back to Course
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white mb-1">
            Edit Lesson
          </h1>
          <p className="text-sm text-[#7A8199]">Write content, add video, set exercises.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/courses/${courseId}/submissions`} className="inline-flex items-center gap-2 rounded-lg border border-[#F5A623]/25 bg-[#F5A623]/10 px-4 py-2 text-sm font-semibold text-[#F5C56D] hover:bg-[#F5A623]/15">Exercise submissions</Link>
          <Link
            href={`/admin/courses/${courseId}/lessons/${lessonId}/preview`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
          >
            <Eye size={14} /> Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check size={14} /> Saved</>
            ) : (
              <><Save size={14} /> Save Lesson</>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">Basic information</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Title <span className="text-[#F05D70]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Short description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-line summary of this lesson"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
              />
            </div>
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#0B0F1D] checked:bg-[#22C58B]"
                />
                <span className="text-sm text-[#B7BDD0]">Free preview lesson</span>
              </label>
            </div>
          </div>
        </div>

        {/* Video */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">Video</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Video provider
            </label>
            <select
              value={videoProvider}
              onChange={(e) => setVideoProvider(e.target.value)}
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
            >
              {VIDEO_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {videoProvider !== "none" && (
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={
                  videoProvider === "youtube"
                    ? "https://www.youtube.com/watch?v=..."
                    : videoProvider === "vimeo"
                    ? "https://vimeo.com/..."
                    : "https://example.com/video.mp4"
                }
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] font-mono text-sm"
              />
              {videoProvider === "youtube" && videoUrl && (
                <p className="mt-2 text-xs text-[#22C58B]">✓ YouTube video will appear at top of lesson</p>
              )}
            </div>
          )}
        </div>

        {/* Content editor */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4">Lesson content</h2>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 mb-3 p-2 rounded-lg bg-[#0B0F1D] border border-white/10">
            <button
              type="button"
              onClick={() => insertMarkdown("**", "**")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("*", "*")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => insertMarkdown("# ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Heading 1"
            >
              <Heading1 size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("## ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Heading 2"
            >
              <Heading2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("### ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Heading 3"
            >
              <Heading3 size={14} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => insertMarkdown("- ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Bullet list"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("1. ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Numbered list"
            >
              <ListOrdered size={14} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              type="button"
              onClick={() => insertMarkdown("```\n", "\n```")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Code block"
            >
              <Code size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("[", "](url)")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Link"
            >
              <LinkIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("> ")}
              className="p-1.5 rounded hover:bg-white/5 text-[#B7BDD0] hover:text-white transition"
              title="Quote"
            >
              <Quote size={14} />
            </button>
            <span className="ml-auto text-xs text-[#7A8199] font-mono">
              Markdown supported
            </span>
          </div>

          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder={`# Welcome to this lesson\n\nWrite your lesson content here. Use markdown for formatting:\n\n## Learning objectives\n- Understand X\n- Practice Y\n\n## Steps\n1. First step\n2. Second step\n\nYou can also add code:\n\n\`\`\`python\nprint("Hello, ibrant!")\n\`\`\``}
            className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] font-mono text-sm leading-relaxed resize-y"
          />

          <p className="mt-2 text-xs text-[#7A8199]">
            {content.length} characters · Renders as formatted text in the lesson view
          </p>
        </div>

        {/* Code example */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4">
            Code example <span className="text-xs text-[#7A8199] font-normal">(optional — separate highlighted block)</span>
          </h2>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9299AE]">Programming language</label>
          <select
            value={codeLanguage}
            onChange={(e) => setCodeLanguage(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-3 text-sm text-white focus:border-[#7559E8] focus:outline-none"
          >
            {LESSON_CODE_LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>
          <textarea
            value={codeExample}
            onChange={(e) => setCodeExample(e.target.value)}
            rows={8}
            placeholder={`# hello.py\nprint("Hello, ibrant!")`}
            className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] font-mono text-sm resize-y"
          />
        </div>

        {/* Structured student exercise builder */}
        {(() => {
          const parsed = parseExercise(exercise) || { version: 1 as const, type: "written" as const, title: "Practice exercise", instructions: "", min_words: 150, max_words: 200 };
          const legacyHtmlTask = parsed.type === "written" && /write\s+(?:your\s+)?html\s+code|html\s+code\s+(?:in|below)|create\s+(?:a|your)\s+(?:simple\s+)?html\s+(?:page|profile)|build\s+(?:a|your)\s+(?:simple\s+)?html\s+(?:page|profile)/i.test(parsed.instructions);
          const config = legacyHtmlTask ? { ...parsed, type: "code" as const, language: "html" } : parsed;
          const update = (patch: Record<string, unknown>) => setExercise(encodeExercise({ ...config, ...patch } as typeof config));
          return <section className="space-y-5 rounded-2xl border border-[#F5A623]/25 bg-gradient-to-br from-[#F5A623]/[.07] to-[#7559E8]/[.06] p-6">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#F5C56D]">Student workspace</p><h2 className="mt-1 text-xl font-bold text-white">Practice exercise <span className="text-xs font-normal text-[#9299AE]">(optional)</span></h2><p className="mt-1 text-sm text-[#9299AE]">Build the student activity here. Do not paste exercise JSON into lesson content; this workspace is saved separately.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelClass}>Exercise type</label><select value={config.type} onChange={e=>update({type:e.target.value})} className={inputClass}><option value="written">Written response</option><option value="code">Code task (write & run)</option><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option></select></div><div><label className={labelClass}>Workspace title</label><input value={config.title} onChange={e=>update({title:e.target.value})} placeholder="e.g. Build your first page" className={inputClass}/></div></div>
            <div><label className={labelClass}>Instructions for students</label><textarea value={config.instructions} onChange={e=>update({instructions:e.target.value})} rows={8} placeholder="Describe the task, numbered requirements, and success criteria. Use Markdown headings and lists if helpful." className={inputClass}/><p className="mt-2 text-xs text-[#9299AE]">Use plain instructions here. For HTML tasks, write the requirements as a numbered list; students get a code editor and live preview automatically.</p></div>
            {config.type === "written" && <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelClass}>Suggested minimum words</label><input type="number" min="0" value={config.min_words || 0} onChange={e=>update({min_words:Number(e.target.value)})} className={inputClass}/></div><div><label className={labelClass}>Suggested maximum words</label><input type="number" min="0" value={config.max_words || 0} onChange={e=>update({max_words:Number(e.target.value)})} className={inputClass}/></div></div>}
            {config.type === "code" && <div><label className={labelClass}>Programming language</label><select value={config.language || "html"} onChange={e=>update({language:e.target.value})} className={inputClass}>{LESSON_CODE_LANGUAGES.map(language=><option key={language.value} value={language.value}>{language.label}</option>)}</select><p className="mt-2 text-xs text-[#9299AE]">HTML opens a safe preview and Playground. Python can run in Playground; other languages may be editor-only unless a runtime is connected.</p></div>}
            {config.type === "code" && <div><label className={labelClass}>Starter code (optional)</label><textarea value={config.starter_code || ""} onChange={e=>update({starter_code:e.target.value})} rows={12} spellCheck={false} placeholder="Add starter code that students can edit in their workspace." className={`${inputClass} font-mono text-xs leading-6`}/><p className="mt-2 text-xs text-[#9299AE]">Students receive this code in their editor. For HTML, the live webpage preview opens automatically.</p></div>}
            {(config.type === "multiple_choice" || config.type === "true_false") && <><div><label className={labelClass}>Answer options · one per line</label><textarea value={(config.type === "true_false" ? ["True","False"] : config.options || []).join("\n")} readOnly={config.type === "true_false"} onChange={e=>update({options:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})} rows={4} className={inputClass}/></div><div><label className={labelClass}>Correct answer (optional)</label><select value={config.expected_answer || ""} onChange={e=>update({expected_answer:e.target.value})} className={inputClass}><option value="">Do not auto-grade</option>{(config.type === "true_false" ? ["True","False"] : config.options || []).map(option=><option key={option} value={option}>{option}</option>)}</select></div></>}
            {config.type === "short_answer" && <div><label className={labelClass}>Suggested answer (optional)</label><textarea value={config.expected_answer || ""} onChange={e=>update({expected_answer:e.target.value})} rows={2} className={inputClass}/></div>}
            <div><label className={labelClass}>Optional hint</label><textarea value={config.hint || ""} onChange={e=>update({hint:e.target.value})} rows={2} placeholder="A helpful clue students can reveal when stuck" className={inputClass}/></div>
            <div className="rounded-xl border border-[#7559E8]/20 bg-[#7559E8]/[.07] p-4 text-xs leading-5 text-[#C7CBE0]">Preview behavior: students see this as a formatted assignment card. Code tasks include a syntax-highlighted editor, HTML preview when the language is HTML, and a link to Playground. This exercise is stored separately from lesson content.</div>
          </section>;
        })()}

        {/* Practical examples builder */}
        <section className="rounded-2xl border border-[#7559E8]/25 bg-[#111827] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#A78BFA]">Learning by doing</p><h2 className="mt-1 text-lg font-bold text-white">Practical examples</h2><p className="mt-1 text-sm text-[#9299AE]">Add several worked examples with code and expected output.</p></div><button type="button" onClick={() => setExamples([...examples,{title:`Example ${examples.length+1}`,explanation:"",code:"",language:"html",expected_output:""}])} className="rounded-xl bg-[#7559E8]/15 px-4 py-2.5 text-sm font-semibold text-[#C7B9FF] hover:bg-[#7559E8]/25">+ Add example</button></div>
          {examples.length===0 && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-[#7A8199]">No practical examples yet. Add your first example.</div>}
          {examples.map((item,index)=><div key={index} className="space-y-3 rounded-xl border border-white/10 bg-[#0B1020] p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">Example {index+1}</span><button type="button" onClick={()=>setExamples(examples.filter((_,i)=>i!==index))} className="text-xs text-[#F3A0AA] hover:text-white">Remove</button></div><input value={item.title||""} onChange={e=>setExamples(examples.map((x,i)=>i===index?{...x,title:e.target.value}:x))} placeholder="Example title" className={inputClass}/><textarea value={item.explanation||""} onChange={e=>setExamples(examples.map((x,i)=>i===index?{...x,explanation:e.target.value}:x))} rows={2} placeholder="Explain what this example demonstrates" className={inputClass}/><div className="grid gap-3 sm:grid-cols-[160px_1fr]"><select aria-label={`Example ${index + 1} programming language`} value={item.language||"html"} onChange={e=>setExamples(examples.map((x,i)=>i===index?{...x,language:e.target.value}:x))} className={inputClass}>{LESSON_CODE_LANGUAGES.map(language=><option key={language.value} value={language.value}>{language.label}</option>)}</select><textarea value={item.code||""} onChange={e=>setExamples(examples.map((x,i)=>i===index?{...x,code:e.target.value}:x))} rows={5} placeholder="Write the code for this example" className={`${inputClass} font-mono`}/></div><textarea value={item.expected_output||""} onChange={e=>setExamples(examples.map((x,i)=>i===index?{...x,expected_output:e.target.value}:x))} rows={3} placeholder="Expected output (optional)" className={`${inputClass} font-mono`}/></div>)}
        </section>

        {/* Structured practice question builder */}
        <section className="rounded-2xl border border-[#F5A623]/20 bg-[#111827] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#F5A623]">Knowledge check</p><h2 className="mt-1 text-lg font-bold text-white">Practice questions</h2><p className="mt-1 text-sm text-[#9299AE]">Each question becomes its own interactive student card.</p><p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-[#B7BDD0]">Multiple choice: enter one answer option per line, then select the correct answer from the dropdown. True / False: choose the correct answer. Short answer and Code task: type the expected answer in the answer field.</p></div><button type="button" onClick={()=>setQuestions([...questions,{type:"multiple_choice",prompt:"",options:["Option A","Option B"],answer:"",explanation:"",hint:"",points:1}])} className="rounded-xl bg-[#F5A623]/10 px-4 py-2.5 text-sm font-semibold text-[#F5C56D] hover:bg-[#F5A623]/20">+ Add question</button></div>
          {questions.length===0 && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-[#7A8199]">No practice questions yet. Add a question to build the lesson assessment.</div>}
          {questions.map((item,index)=><div key={index} className="space-y-3 rounded-xl border border-white/10 bg-[#0B1020] p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">Question {index+1}</span><button type="button" onClick={()=>setQuestions(questions.filter((_,i)=>i!==index))} className="text-xs text-[#F3A0AA] hover:text-white">Remove</button></div><div className="grid gap-3 sm:grid-cols-[1fr_110px]"><select value={item.type||"short_answer"} onChange={e=>setQuestions(questions.map((x,i)=>{if(i!==index)return x;const type=e.target.value;return type==="true_false"?{...x,type,options:["True","False"],answer:""}:type==="multiple_choice"?{...x,type,options:(x.options?.length||0)>=2?x.options:["Option A","Option B"],answer:""}:{...x,type,options:[],answer:""};}))} className={inputClass}><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option><option value="code">Code task (write & run)</option></select><input type="number" min="1" value={item.points||1} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,points:Number(e.target.value)}:x))} className={inputClass} placeholder="Points"/></div><textarea value={item.prompt||""} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,prompt:e.target.value}:x))} rows={2} placeholder="Question prompt" className={inputClass}/>{(item.type==="multiple_choice"||item.type==="true_false")&&<div><label className={labelClass}>Answer options · one per line</label><textarea aria-label={`Question ${index + 1} answer options`} value={(item.type==="true_false"?["True","False"]:(item.options||[])).join("\n")} readOnly={item.type==="true_false"} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,options:e.target.value.split("\n").map(option=>option.trim()).filter(Boolean),answer:(e.target.value.split("\n").map(option=>option.trim()).includes(x.answer||"")?x.answer:"")}:x))} rows={3} className={inputClass}/></div>}{(item.type==="multiple_choice"||item.type==="true_false")?<div><label className={labelClass}>Correct answer · select one option</label><select value={item.answer||""} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,answer:e.target.value}:x))} className={inputClass}><option value="">Choose the correct answer</option>{(item.type==="true_false"?["True","False"]:item.options||[]).map(option=><option key={option} value={option}>{option}</option>)}</select></div>:<div><label className={labelClass}>Correct / suggested answer</label><textarea value={item.answer||""} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,answer:e.target.value}:x))} rows={item.type==="code"?5:2} placeholder={item.type==="code"?"Enter the expected code solution":"Enter the expected answer"} className={`${inputClass} font-mono`}/></div>}<textarea value={item.explanation||""} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,explanation:e.target.value}:x))} rows={2} placeholder="Explanation shown with the answer" className={inputClass}/><input value={item.hint||""} onChange={e=>setQuestions(questions.map((x,i)=>i===index?{...x,hint:e.target.value}:x))} placeholder="Optional hint" className={inputClass}/></div>)}
        </section>

        {/* Bottom save */}
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/courses/${courseId}`}
            className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check size={14} /> Saved</>
            ) : (
              <><Save size={14} /> Save Lesson</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
