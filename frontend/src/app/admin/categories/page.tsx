"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", sort_order: 0 });

  const loadCategories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/categories?include_inactive=true`, {
        headers: { },
      });
      if (!res.ok) throw new Error(await res.text());
      setCategories(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/categories");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (token) loadCategories();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Failed (${res.status})`);
      }
      setForm({ name: "", description: "", sort_order: 0 });
      setShowForm(false);
      await loadCategories();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!token || !confirm(`Delete category "${name}"?`)) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/categories/${id}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, is_active: false } : c));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0B0F1D] py-16">
      <div className="mx-auto max-w-4xl px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white mb-1">Categories</h1>
            <p className="text-sm text-[#B7BDD0]">
              {categories.filter((c) => c.is_active).length} active categories
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New Category"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                  Category name <span className="text-[#F05D70]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Healthcare"
                  className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Sort order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                  className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7559E8]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Description <span className="text-[#7A8199]">(optional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description"
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
              />
            </div>
            {formError && (
              <div className="rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 p-3">
                <p className="text-sm text-[#F05D70]">{formError}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="w-full rounded-lg bg-[#7559E8] px-4 py-3 text-sm font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : "Create Category"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-6 text-center">
            <p className="text-[#F05D70]">{error}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-[#7A8199]">
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] ${!cat.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{cat.name}</div>
                      {cat.description && (
                        <div className="text-xs text-[#7A8199] mt-0.5">{cat.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[#B7BDD0]">{cat.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[#B7BDD0]">{cat.sort_order}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${
                          cat.is_active
                            ? "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]"
                            : "border-white/10 bg-white/5 text-[#7A8199]"
                        }`}
                      >
                        {cat.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cat.is_active && (
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-2 rounded-lg bg-white/5 text-[#F05D70] hover:bg-[#F05D70]/10 transition"
                          title="Deactivate category"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
