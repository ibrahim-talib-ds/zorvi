import Link from "next/link";
import { fetchFeaturedProducts } from "@/features/marketplace/api";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { API_BASE } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace — ZORVI",
  description: "Browse production-ready software projects. Buy complete source code with documentation and licensing.",
};

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/marketplace/categories`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function MarketplacePage() {
  const [products, categories] = await Promise.all([
    fetchFeaturedProducts(100),
    fetchCategories(),
  ]);

  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-[#7A8199] hover:text-[#A78BFA] transition inline-flex items-center gap-1.5 mb-4">
            ← Back to Home
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white mb-3">Explore Projects</h1>
              <p className="text-base text-[#B7BDD0] max-w-2xl">
                Production-ready software you can buy or download. Every project is a complete application with source code and documentation.
              </p>
            </div>
            <div className="text-sm text-[#7A8199] font-mono whitespace-nowrap">
              {products.length} {products.length === 1 ? "project" : "projects"} available
            </div>
          </div>
        </div>

        {/* Interactive Grid */}
        <MarketplaceGrid products={products} categories={categories} />
      </div>
    </div>
  );
}
