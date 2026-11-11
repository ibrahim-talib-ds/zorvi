"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Check, Save, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { useAuth, fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    short_description: "",
    long_description: "",
    status: "draft",
    difficulty: "beginner",
    starting_price_cents: 0,
    cover_image_url: "",
    live_demo_url: "",
    instructions: "",
    license: "",
    external_download_url: "",
    is_featured: false,
    is_free: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/products");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    
    const loadProductImages = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/${id}/images`, {});
        if (res.ok) {
          const imgs = await res.json();
          setGalleryImages(Array.isArray(imgs) ? imgs : []);
        }
      } catch (e) {
        console.error("Failed to load images", e);
      }
    };
    
    loadProductImages();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/marketplace`, {});
        if (!res.ok) throw new Error(await res.text());
        const all = await res.json();
        const product = all.find((p: any) => p.id === id);
        if (!product) throw new Error("Product not found");
        
        setForm({
          title: product.title || "",
          short_description: product.short_description || "",
          long_description: product.long_description || "",
          status: product.status || "draft",
          difficulty: product.difficulty || "beginner",
          starting_price_cents: product.starting_price_cents || 0,
          cover_image_url: product.cover_image_url || "",
          live_demo_url: product.live_demo_url || "",
          instructions: product.instructions || "",
          license: product.license || "",
          external_download_url: product.external_download_url || "",
          is_featured: product.is_featured || false,
          is_free: product.is_free || false,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          short_description: form.short_description,
          long_description: form.long_description,
          status: form.status,
          difficulty: form.difficulty,
          starting_price_cents: form.is_free ? 0 : form.starting_price_cents,
          cover_image_url: form.cover_image_url || null,
          live_demo_url: form.live_demo_url || null,
          instructions: form.instructions || null,
          license: form.license || null,
          external_download_url: form.external_download_url || null,
          is_featured: form.is_featured,
          is_free: form.is_free,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/${id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: newImageUrl.trim(),
          sort_order: galleryImages.length,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const img = await res.json();
      setGalleryImages([...galleryImages, img]);
      setNewImageUrl("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add image");
    } finally {
      setAddingImage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Max 10MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/${id}/images/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const img = await res.json();
      setGalleryImages([...galleryImages, img]);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setGalleryImages(galleryImages.filter((img) => img.id !== imageId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete image");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-[#7A8199] hover:text-white mb-6 transition">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white">Edit Product</h1>
        <p className="text-[#B7BDD0] mt-1">Update the project details. Changes apply immediately.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-4 text-sm text-[#F05D70]">{error}</div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-[#22C58B]/30 bg-[#22C58B]/10 p-4 text-sm text-[#22C58B] flex items-center gap-2">
          <Check size={16} /> Saved! Redirecting...
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Basic Info</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Title</label>
            <input
              type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Short Description</label>
            <input
              type="text" value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              required
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Full Description</label>
            <textarea
              value={form.long_description}
              onChange={(e) => setForm({ ...form, long_description: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Status & Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (live)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#0B0F1D] border border-white/10 rounded-lg p-4">
            <input
              type="checkbox" checked={form.is_free}
              onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#22C58B]"
            />
            <label className="text-white font-medium cursor-pointer">
              This project is <span className="text-[#22C58B]">Free</span> (no payment required)
            </label>
          </div>

          {!form.is_free && (
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8199]">$</span>
                <input
                  type="number" min="1"
                  value={form.starting_price_cents / 100}
                  onChange={(e) => setForm({ ...form, starting_price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-8 pr-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 bg-[#0B0F1D] border border-white/10 rounded-lg p-4">
            <input
              type="checkbox" checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#F5A623]"
            />
            <label className="text-white font-medium cursor-pointer">
              Mark as <span className="text-[#F5A623]">Featured</span> on homepage
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Links</h2>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Cover Image URL (Logo/Screenshot)</label>
            <input
              type="url" value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://.../image.jpg"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Live Demo URL</label>
            <input
              type="url" value={form.live_demo_url}
              onChange={(e) => setForm({ ...form, live_demo_url: e.target.value })}
              placeholder="https://demo.yourproject.com"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">External Download URL</label>
            <input
              type="url" value={form.external_download_url}
              onChange={(e) => setForm({ ...form, external_download_url: e.target.value })}
              placeholder="https://... or APK link"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>
        </div>

        {/* Instructions & License */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">Instructions & License</h2>
          <p className="text-xs text-[#7A8199] -mt-2">These appear in the tabs on the product page.</p>
          
          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Installation Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="How to install and run this project..."
              rows={6}
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">License Terms</label>
            <textarea
              value={form.license}
              onChange={(e) => setForm({ ...form, license: e.target.value })}
              placeholder="This project is licensed under..."
              rows={6}
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Gallery Images Section */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                <ImageIcon size={18} className="text-[#A78BFA]" /> Gallery Images
              </h2>
              <p className="text-xs text-[#7A8199] mt-1">Add up to {galleryImages.length}/20 images. Users will see them as a scrollable gallery.</p>
            </div>
            <span className="text-sm font-bold text-[#A78BFA]">{galleryImages.length}</span>
          </div>

          {/* Two Options: URL or Upload */}
          <div className="grid md:grid-cols-2 gap-3">
            {/* Option 1: Paste URL */}
            <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-4">
              <p className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-2">Option 1: Paste URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 rounded-lg border border-white/10 bg-[#171B33] px-3 py-2 text-xs text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  disabled={addingImage || !newImageUrl.trim() || galleryImages.length >= 20}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#7559E8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#8B70FF] transition disabled:opacity-50"
                >
                  {addingImage ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add
                </button>
              </div>
            </div>

            {/* Option 2: Upload File */}
            <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-4">
              <p className="text-xs font-semibold text-[#22C58B] uppercase tracking-wider mb-2">Option 2: Upload from Device</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || galleryImages.length >= 20}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#22C58B]/40 bg-[#22C58B]/10 px-4 py-2 text-xs font-semibold text-[#22C58B] hover:bg-[#22C58B]/20 transition disabled:opacity-50"
              >
                {uploadingImage ? (
                  <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                ) : (
                  <><ImageIcon size={14} /> Choose File (JPG, PNG, WebP)</>
                )}
              </button>
            </div>
          </div>

          {/* Gallery Grid */}
          {galleryImages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <ImageIcon size={32} className="text-[#7A8199] mx-auto mb-2" />
              <p className="text-sm text-[#7A8199]">No images yet. Add your first screenshot above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {galleryImages.map((img, idx) => (
                <div key={img.id} className="group relative rounded-lg border border-white/10 overflow-hidden bg-[#0B0F1D] aspect-video">
                  <img
                    src={img.image_url}
                    alt={`Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23171B33' width='100' height='100'/%3E%3Ctext x='50' y='55' fill='%237A8199' text-anchor='middle' font-size='10'%3EError%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {/* Order badge */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    #{idx + 1}
                  </div>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded bg-[#F05D70] text-white opacity-0 group-hover:opacity-100 transition hover:bg-[#e04a5f]"
                    title="Delete image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/products"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition text-center"
          >
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50"
          >
            {saving ? <><Loader2 className="animate-spin" size={18} /> Saving...</> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
