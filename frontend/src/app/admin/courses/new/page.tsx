"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, AlertCircle, Save, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export default function NewCoursePage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/courses/new");
    }
  }, [authLoading, isAuthenticated, router]);

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug) {
      const auto = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(auto);
    }
  }, [title, slug]);

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
    if (!token) return;

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
        estimated_hours: parseInt(estimatedHours, 10) || 0,
        is_featured: isFeatured,
        cover_image_url: coverImage.trim() || null,
      };

      const res = await fetchWithAuth(`${API_BASE}/admin/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const course = await res.json();

      // If user chose to publish immediately, patch status
      if (!submitAsDraft) {
        await fetchWithAuth(`${API_BASE}/admin/courses/${course.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            },
          body: JSON.stringify({ status: "published" }),
        });
      }

      router.push(`/admin/courses/${course.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create course");
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

  return (
    <div className="py-10 px-6 lg:px-10 max-w-3xl">
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
        {/* Basic info */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white">Basic information</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Title <span className="text-[#F05D70]">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Fundamentals"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Slug (URL) <span className="text-[#7A8199] text-xs">— auto-generated</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="python-fundamentals"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] font-mono text-sm"
            />
            <p className="mt-1 text-xs text-[#7A8199]">
              URL: /courses/{slug || "your-slug"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Short description <span className="text-[#F05D70]">*</span>
              <span className="text-[#7A8199] text-xs ml-2">(shown on cards)</span>
            </label>
            <input
              type="text"
              required
              minLength={10}
              maxLength={500}
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="One-line summary of what students will learn"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
            />
            <p className="mt-1 text-xs text-[#7A8199]">{shortDesc.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Long description <span className="text-[#7A8199] text-xs">— full details for the course page</span>
            </label>
            <textarea
              rows={6}
              value={longDesc}
              onChange={(e) => setLongDesc(e.target.value)}
              placeholder="Describe the course in detail. What projects will students build? What will they learn?"
              className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] resize-none"
            />
          </div>
        </div>

  {/* Cover Image */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Cover Image</h2>
          <p className="text-xs text-[#7A8199] -mt-2">Add a logo or screenshot. Shown on the course card.</p>
          
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Cover Image URL</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://cdn.simpleicons.org/sqlite/003B57"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
            <p className="text-xs text-[#7A8199] mt-1.5">
              Try Simple Icons: <code className="text-[#A78BFA]">https://cdn.simpleicons.org/sqlite/003B57</code>
            </p>
          </div>
          
          {coverImage && (
            <div className="rounded-lg border border-white/10 bg-[#0B0F1D] p-4">
              <p className="text-xs text-[#7A8199] mb-2">Preview:</p>
              <img
                src={coverImage}
                alt="Preview"
                className="max-w-xs max-h-32 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {/* Course settings */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white">Course settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Difficulty <span className="text-[#F05D70]">*</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Estimated hours
              </label>
              <input
                type="number"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
              Technologies
            </label>
            <div className="flex gap-2">
              <input
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
                className="flex-1 bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
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
                    >
                      ×
                    </button>
                  </span>
                ))}
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

        {/* Submit */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg font-bold text-white mb-4">Publishing</h2>

          <div className="flex gap-3 mb-4">
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

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating course...
              </>
            ) : (
              <>
                <Save size={16} /> Create Course
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
