"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Save, Check, Eye, AlertCircle,
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Link as LinkIcon, Quote,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface LessonData {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_provider: string;
  video_url: string | null;
  content_markdown: string;
  code_example: string | null;
  exercise: string | null;
  duration_minutes: number;
  is_free_preview: boolean;
}

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
  const [courseSlug, setCourseSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoProvider, setVideoProvider] = useState("none");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [codeExample, setCodeExample] = useState("");
  const [exercise, setExercise] = useState("");
  const [duration, setDuration] = useState("0");
  const [isFreePreview, setIsFreePreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const loadLesson = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Get course info (for slug)
      const courseRes = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        headers: { },
      });
      if (courseRes.ok) {
        const course = await courseRes.json();
        setCourseSlug(course.slug);
      }

      // Get lesson content (admin needs full access — use public endpoint while enrolled OR use admin)
      // Admin endpoint isn't listed for GET single lesson, so we use course detail endpoint
      // and find the lesson ID via modules
      const res = await fetchWithAuth(`${API_BASE}/admin/courses/${courseId}`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      const course = await res.json();

      let foundLesson: any = null;
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
      setContent(fullLesson.content_markdown || "");
      setCodeExample(fullLesson.code_example || "");
      setExercise(fullLesson.exercise || "");
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
          content_markdown: content,
          code_example: codeExample.trim() || null,
          exercise: exercise.trim() || null,
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
      <div className="py-10 px-6 lg:px-10">
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

  return (
    <div className="py-10 px-6 lg:px-10 max-w-5xl">
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
        <div className="flex gap-2">
          <Link
            href={courseSlug ? `/courses/${courseSlug}/lessons/${lessonId}` : "#"}
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
            placeholder={`# Welcome to this lesson\n\nWrite your lesson content here. Use markdown for formatting:\n\n## Learning objectives\n- Understand X\n- Practice Y\n\n## Steps\n1. First step\n2. Second step\n\nYou can also add code:\n\n\`\`\`python\nprint("Hello, ZORVI!")\n\`\`\``}
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
          <textarea
            value={codeExample}
            onChange={(e) => setCodeExample(e.target.value)}
            rows={8}
            placeholder={`# hello.py\nprint("Hello, ZORVI!")`}
            className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] font-mono text-sm resize-y"
          />
        </div>

        {/* Exercise */}
        <div className="rounded-2xl border border-[#F5A623]/20 bg-[#F5A623]/5 p-6">
          <h2 className="font-display text-lg font-bold text-[#F5A623] mb-4">
            Practice exercise <span className="text-xs text-[#B7BDD0] font-normal">(optional)</span>
          </h2>
          <textarea
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            rows={6}
            placeholder="What should the student do to practice this lesson?&#10;&#10;Example:&#10;1. Create a file called hello.py&#10;2. Add a print statement&#10;3. Run it and confirm the output"
            className="w-full bg-[#0B0F1D] border border-[#F5A623]/20 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#F5A623]/50 resize-y text-sm"
          />
        </div>

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
