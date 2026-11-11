"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, ArrowLeft, Edit3, Trash2, Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  status: "draft" | "published" | "archived";
  difficulty: string;
  starting_price_cents: number;
  currency: string;
  packages?: Array<{ id: string; name: string; price_cents: number }>;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/admin/products");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/marketplace`, {
          headers: { },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handlePublish = async (id: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/marketplace/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: newStatus as AdminProduct["status"] } : p,
        ),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
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
      <div className="mx-auto max-w-7xl px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-white mb-1">Products</h1>
            <p className="text-sm text-[#B7BDD0]">
              {products.length} {products.length === 1 ? "product" : "products"} total
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus size={16} /> New Product
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <Loader2 className="animate-spin text-[#A78BFA] mx-auto" size={32} />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-8 text-center">
            <p className="text-[#F05D70]">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
            <p className="text-[#B7BDD0] mb-4">No products yet.</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF]"
            >
              <Plus size={16} /> Create your first product
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-[#7A8199]">
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center text-[#A78BFA] font-bold">
                          {p.title.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{p.title}</p>
                          <p className="text-xs text-[#7A8199] font-mono">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${
                          p.status === "published"
                            ? "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]"
                            : p.status === "draft"
                            ? "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
                            : "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-display text-lg font-bold text-white">
                        ${(p.starting_price_cents / 100).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handlePublish(p.id, p.status)}
                          title={p.status === "published" ? "Unpublish" : "Publish"}
                          className="p-2 rounded-lg bg-white/5 text-[#B7BDD0] hover:bg-white/10 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <Link href={`/admin/products/${p.id}/edit`} className="p-2 rounded hover:bg-white/10 transition" title="Edit"><Edit3 size={14} /></Link>
                      </div>
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
