"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Upload, X, Check, DollarSign, Link as LinkIcon, Globe } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export default function NewProductPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [price, setPrice] = useState("199");
  const [isFree, setIsFree] = useState(false);
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [externalDownloadUrl, setExternalDownloadUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/products/new");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (title && !slug) {
      const auto = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setSlug(auto);
    }
  }, [title, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);

    try {
      // Step 1 — Create Product
      setStep("Creating product...");
      const createRes = await fetchWithAuth(`${API_BASE}/admin/marketplace`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || null,
          short_description: shortDesc.trim(),
          long_description: longDesc.trim(),
          difficulty,
          starting_price_cents: isFree ? 0 : Math.round(parseFloat(price) * 100),
          currency: "USD",
          is_featured: false,
          is_free: isFree,
          live_demo_url: liveDemoUrl.trim() || null,
          cover_image_url: coverImage.trim() || null,
          external_download_url: externalDownloadUrl.trim() || null,
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      const product = await createRes.json();

      // Step 2 — Create Package
      setStep("Creating package...");
      const pkgRes = await fetchWithAuth(`${API_BASE}/admin/marketplace/${product.id}/packages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          name: "Standard",
          description: "Complete package",
          price_cents: isFree ? 0 : Math.round(parseFloat(price) * 100),
          currency: "USD",
          license_type: "personal",
          includes_source_code: true,
          includes_documentation: true,
          includes_support_days: 30,
          includes_updates_days: 365,
          sort_order: 0,
        }),
      });
      if (!pkgRes.ok) throw new Error(await pkgRes.text());
      const pkg = await pkgRes.json();

      // Step 3 — Upload file if exists
      if (file) {
        setStep("Uploading source code...");
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch(
          `${API_BASE}/admin/marketplace/${product.id}/packages/${pkg.id}/upload`,
          {
            method: "POST",
            headers: { },
            body: fd,
          }
        );
        if (!uploadRes.ok) throw new Error(await uploadRes.text());
      }

      // Step 4 — Publish
      setStep("Publishing...");
      const publishRes = await fetchWithAuth(`${API_BASE}/admin/marketplace/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ status: "published" }),
      });
      if (!publishRes.ok) throw new Error(await publishRes.text());

      // Success
      router.push("/admin/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-[#7A8199] hover:text-[#A78BFA] transition mb-4"
        >
          <ArrowLeft size={16} /> Back to Products
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-white">New Project</h1>
        <p className="text-sm text-[#B7BDD0] mt-2">Add a new project to the marketplace.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-4">
          <p className="text-sm text-[#F05D70]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Basic Info</h2>
          
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Project Title</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              required minLength={3}
              placeholder="e.g., Food Delivery System"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Short Description</label>
            <input
              type="text" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
              required minLength={10}
              placeholder="A complete Flutter + FastAPI food delivery app..."
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Full Description</label>
            <textarea
              value={longDesc} onChange={(e) => setLongDesc(e.target.value)}
              rows={6}
              placeholder="Describe what's included, the tech stack, features..."
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition resize-none"
            />
          </div>
        </div>

        {/* Pricing & Links */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <DollarSign size={18} className="text-[#22C58B]" /> Pricing & Links
          </h2>

          <div className="flex items-center gap-3 bg-[#0B0F1D] border border-white/10 rounded-lg p-4">
            <input
              type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#22C58B] focus:ring-[#22C58B] focus:ring-offset-0"
            />
            <label htmlFor="isFree" className="text-white font-medium cursor-pointer select-none flex-1">
              This project is <span className="text-[#22C58B]">Free</span> (opensource / demo)
            </label>
          </div>

          {!isFree && (
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8199]">$</span>
                <input
                  type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-8 pr-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Cover Image URL (Logo/Screenshot)</label>
            <input
              type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://.../image.jpg"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
            <p className="text-xs text-[#7A8199] mt-1.5">Paste a URL from Imgur, Cloudinary, or your own hosting.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2 flex items-center gap-2">
              <Globe size={14} className="text-[#5B9EFF]" /> Live Demo URL <span className="text-xs text-[#7A8199] font-normal">(optional)</span>
            </label>
            <input
              type="url" value={liveDemoUrl} onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://demo.yourproject.com"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
            />
            <p className="text-xs text-[#7A8199] mt-1.5">Users can click &quot;Try Live Demo&quot; to see the app in action.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2 flex items-center gap-2">
              <LinkIcon size={14} className="text-[#F5A623]" /> External Download Link <span className="text-xs text-[#7A8199] font-normal">(optional)</span>
            </label>
            <input
              type="url" value={externalDownloadUrl} onChange={(e) => setExternalDownloadUrl(e.target.value)}
              placeholder="https://play.google.com/store/apps/... or website link"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
            />
            <p className="text-xs text-[#7A8199] mt-1.5">For APKs, hosted websites, or other external links. Buyers will get this after purchase.</p>
          </div>
        </div>

        {/* Source Code Upload */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Upload size={18} className="text-[#A78BFA]" /> Source Code File
          </h2>
          <p className="text-sm text-[#B7BDD0]">Upload the ZIP file containing the complete source code.</p>
          
          <div className="relative">
            <input
              type="file" accept=".zip,.rar,.tar.gz,.7z" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-[#B7BDD0] file:mr-4 file:rounded-lg file:border-0 file:bg-[#7559E8] file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#8B70FF] file:transition file:cursor-pointer border border-white/10 rounded-lg bg-[#0B0F1D] py-2 pl-2"
            />
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-[#22C58B]">
              <Check size={16} /> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/admin/products"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition text-center"
          >
            Cancel
          </Link>
          <button
            type="submit" disabled={submitting}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="animate-spin" size={18} /> {step}</>
            ) : (
              <><Check size={18} /> Publish Project</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
