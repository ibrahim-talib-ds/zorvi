"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertCircle, Save, Eye, EyeOff, RefreshCw, CheckCircle2,
} from "lucide-react";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

/** Pull a human-readable message out of a FastAPI error response. */
async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return (detail as Array<{ msg?: string }>)
        .map((d) => d?.msg || JSON.stringify(d))
        .join("; ");
    }
    if (detail != null) return JSON.stringify(detail);
  } catch {
    /* not JSON - fall through */
  }
  return `Request failed (${res.status})`;
}

const StepHeading = ({ n, title, hint }: { n: number; title: string; hint?: string }) => (
  <div className="flex items-baseline gap-2.5 flex-wrap">
    <span className="inline-flex h-6 w-6 flex-shrink-0 translate-y-0.5 items-center justify-center rounded-md bg-[#7559E8]/20 text-xs font-bold text-[#A78BFA]">
      {n}
    </span>
    <h2 className="font-display text-lg font-bold text-white">{title}</h2>
    {hint && <span className="text-xs text-[#7A8199]">{hint}</span>}
  </div>
);

export default function NewCoursePage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("10");
  const [isFeatured, setIsFeatured] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [submitAsDraft, setSubmitAsDraft] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const slugFromTitle = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Auto-generate the slug from the title until the admin edits it by hand
  useEffect(() => {
    if (title && !slugTouched) setSlug(slugFromTitle(title));
  }, [title, slugTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving with a filled-in form
  const snapshot = JSON.stringify({ title, shortDesc, longDesc, difficulty, technologies, estimatedHours, isFeatured, coverImage });
  const initialSnapshot = useRef<string | null>(null);
  if (initialSnapshot.current === null) initialSnapshot.current = snapshot;
  const isDirty = snapshot !== initialSnapshot.current;

  useEffect(() => {
    if (!isDirty || created) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, created]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/courses/new");
    }
  }, [authLoading, isAuthenticated, router]);

  const addTech = () => {
    const t = techInput.trim();
    if (t && !technologies.includes(t)) {
      setTechnologies([...technologies, t]);
      setTechInput("");
    }
  };

  const removeTech = (t: string) => {
    setTechnologies(technologies.filter((x) => x !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || null,
        short_description: shortDesc.trim(),
        long_description: longDesc.trim() || "",
        difficulty,
        technologies,
        prerequisites: [],
        estimated_hours: Math.max(0, Math.min(1000, parseInt(estimatedHours, 10) || 0)),
        is_featured: isFeatured,
        cover_image_url: coverImage.trim() || null,
      };

      const res = await fetchWithAuth(`${API_BASE}/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await parseError(res));
      const course = await res.json();
      setCreated(true);

      // If the admin chose to publish immediately, patch the status.
      // If that PATCH fails the course still exists - offer the editor link
      // instead of blocking (publishing can also be done from the editor).
      if (!submitAsDraft) {
        const r2 = await fetchWithAuth(`${API_BASE}/admin/courses/${course.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        if (!r2.ok) {
          const detail = await parseError(r2);
          setCreatedId(String(course.id));
          setError(
            `Course created, but publishing failed: ${detail}. You can publish it from the course editor.`
          );
          setSubmitting(false);
          return;
        }
      }

      router.push(`/admin/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const canSubmit = title.trim().length >= 3 && shortDesc.trim().length >= 10;
  const inputCls =
    "w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back to Courses
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white mb-1">
          Create a New Course
        </h1>
        <p className="text-sm text-[#B7BDD0]">
          Fill in the details to create a course. You can add modules and lessons after.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1 - Basic information */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <StepHeading n={1} title="Basic information" hint="what students see first" />

          <div>
            <label htmlFor="nc-title" className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Title <span className="text-[#F05D70]">*</span>
            </label>
            <input
              id="nc-title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Fundamentals"
              className={inputCls}
            />
            {title.length > 0 && title.trim().length < 3 && (
              <p className="mt-1.5 text-xs text-[#F5A623]">At least 3 characters.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="nc-slug" className="block text-sm font-medium text-[#B7BDD0]">
                Slug (URL) <span className="text-[#7A8199] text-xs">— auto-generated</span>
              </label>
              {title && (
                <button
                  type="button"
                  onClick={() => setSlug(slugFromTitle(title))}
                  className="inline-flex items-center gap-1 text-xs text-[#A78BFA] hover:text-white transition"
                >
                  <RefreshCw size={11} /> Regenerate from title
                </button>
              )}
            </div>
            <input
              id="nc-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="python-fundamentals"
              className={`${inputCls} font-mono text-sm`}
            />
            <p className="mt-1 text-xs text-[#7A8199]">URL: /courses/{slug || "your-slug"}</p>
          </div>

          <div>
            <label htmlFor="nc-short" className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Short description <span className="text-[#F05D70]">*</span>
              <span className="text-[#7A8199] text-xs ml-2">(shown on cards)</span>
            </label>
            <input
              id="nc-short"
              type="text"
              required
              minLength={10}
              maxLength={500}
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="One-line summary of what students will learn"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-[#7A8199]">{shortDesc.length}/500</p>
          </div>

          <div>
            <label htmlFor="nc-long" className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Long description <span className="text-[#7A8199] text-xs">— full details for the course page</span>
            </label>
            <textarea
              id="nc-long"
              rows={6}
              value={longDesc}
              onChange={(e) => setLongDesc(e.target.value)}
              placeholder="Describe the course in detail. What projects will students build? What will they learn?"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Step 2 - Classification & media */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <StepHeading n={2} title="Classification & media" hint="how the course is organised" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nc-diff" className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Difficulty <span className="text-[#F05D70]">*</span>
              </label>
              <select
                id="nc-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={inputCls}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="nc-hours" className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Estimated hours
              </label>
              <input
                id="nc-hours"
                type="number"
                min="0"
                max="1000"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="nc-tech" className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Technologies
            </label>
            <div className="flex gap-2">
              <input
                id="nc-tech"
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTech();
                  }
                }}
                placeholder="Type a technology and press Enter"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addTech}
                className="px-4 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition text-sm font-medium"
              >
                Add
              </button>
            </div>
            {technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#7559E8]/15 border border-[#7559E8]/30 text-sm text-[#A78BFA] font-mono"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTech(t)}
                      className="text-[#A78BFA] hover:text-white"
                      aria-label={`Remove ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="nc-cover" className="block text-sm font-medium text-[#B7BDD0] mb-1.5">
              Cover Image URL
            </label>
            <input
              id="nc-cover"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://cdn.simpleicons.org/sqlite/003B57"
              className={`${inputCls} py-2.5`}
            />
            <p className="text-xs text-[#7A8199] mt-1.5">
              Try Simple Icons: <code className="text-[#A78BFA]">https://cdn.simpleicons.org/sqlite/003B57</code>
            </p>
            {coverImage && (
              <div className="rounded-lg border border-white/10 bg-[#0B0F1D] p-4 mt-3">
                <p className="text-xs text-[#7A8199] mb-2">Preview:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="max-w-xs max-h-32 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-[#0B0F1D] checked:bg-[#7559E8] cursor-pointer"
            />
            <span className="text-sm text-[#B7BDD0]">
              Mark as <span className="text-[#F5A623] font-medium">Featured</span> on homepage
            </span>
          </label>
        </div>

        {/* Step 3 - Publishing */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <StepHeading n={3} title="Publishing" hint="you can change this later" />

          <div className="flex gap-3 mb-4 mt-4">
            <button
              type="button"
              onClick={() => setSubmitAsDraft(true)}
              className={`flex-1 flex items-center gap-2 justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                submitAsDraft
                  ? "border-[#7559E8] bg-[#7559E8]/10 text-white"
                  : "border-white/10 bg-transparent text-[#B7BDD0] hover:border-white/20"
              }`}
            >
              <EyeOff size={16} /> Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setSubmitAsDraft(false)}
              className={`flex-1 flex items-center gap-2 justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                !submitAsDraft
                  ? "border-[#22C58B] bg-[#22C58B]/10 text-white"
                  : "border-white/10 bg-transparent text-[#B7BDD0] hover:border-white/20"
              }`}
            >
              <Eye size={16} /> Publish Immediately
            </button>
          </div>

          <p className="text-xs text-[#7A8199] mb-6">
            {submitAsDraft
              ? "Draft: not visible to students. You can publish later from the courses list."
              : "Published: visible on /courses for all students immediately."}
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 p-3">
              <AlertCircle size={16} className="text-[#F05D70] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#F05D70]">{error}</p>
            </div>
          )}
          {created && !error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#22C58B]/30 bg-[#22C58B]/10 p-3">
              <CheckCircle2 size={16} className="text-[#22C58B] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#22C58B]">Course created — opening the editor…</p>
            </div>
          )}
          {createdId && (
            <Link
              href={`/admin/courses/${createdId}`}
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-[#7559E8]/40 bg-[#7559E8]/10 px-4 py-2 text-sm font-medium text-[#A78BFA] hover:bg-[#7559E8]/20 transition"
            >
              Open the course editor
            </Link>
          )}

          <button
            type="submit"
            disabled={submitting || created || !canSubmit}
            className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating course...
              </>
            ) : created ? (
              <>
                <CheckCircle2 size={16} /> Created — opening editor…
              </>
            ) : (
              <>
                <Save size={16} /> Create Course
              </>
            )}
          </button>

          {isDirty && !created && (
            <p className="mt-3 text-xs text-[#7A8199] text-center">
              Unsaved changes — you will be asked before leaving this page.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
