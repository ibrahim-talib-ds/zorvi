"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Star, ArrowRight, Sparkles, Play, Download, Filter } from "lucide-react";

interface Product {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  difficulty: string;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  is_featured: boolean;
  is_free?: boolean;
  creator_name: string | null;
  creator_avatar_url?: string | null;
  live_demo_url?: string | null;
  external_download_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  products: Product[];
  categories: Category[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-[#22C58B]/10 text-[#22C58B] border-[#22C58B]/30",
  intermediate: "bg-[#5B9EFF]/10 text-[#5B9EFF] border-[#5B9EFF]/30",
  advanced: "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30",
  expert: "bg-[#F05D70]/10 text-[#F05D70] border-[#F05D70]/30",
};

export function MarketplaceGrid({ products, categories }: Props) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.short_description.toLowerCase().includes(q) ||
          (p.creator_name && p.creator_name.toLowerCase().includes(q)),
      );
    }

    if (difficulty !== "all") {
      result = result.filter((p) => p.difficulty === difficulty);
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.starting_price_cents - b.starting_price_cents);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.starting_price_cents - a.starting_price_cents);
    } else if (sortBy === "free_first") {
      result.sort((a, b) => Number(b.is_free || 0) - Number(a.is_free || 0));
    }

    return result;
  }, [products, search, difficulty, sortBy, activeCategory]);

  return (
    <div>
      {/* ───── SEARCH BAR ───── */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8199]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, description, or creator..."
            className="w-full rounded-xl border border-white/10 bg-[#0B0F1D] pl-12 pr-4 py-3 text-sm text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
          />
        </div>
      </div>

      {/* ───── CATEGORY PILLS ───── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeCategory === "all"
                ? "bg-[#7559E8] text-white"
                : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 hover:text-white"
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.slug)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeCategory === c.slug
                  ? "bg-[#7559E8] text-white"
                  : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ───── FILTER BAR ───── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {["all", "beginner", "intermediate", "advanced", "expert"].map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              difficulty === d
                ? "bg-[#7559E8] text-white"
                : "bg-white/5 text-[#B7BDD0] hover:bg-white/10 hover:text-white"
            }`}
          >
            {d === "all" ? "All levels" : d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Filter size={14} className="text-[#7A8199]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-1.5 text-xs text-white focus:border-[#7559E8] focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="free_first">Free first</option>
          </select>
        </div>
      </div>

      {/* ───── COUNT ───── */}
      <p className="text-sm text-[#7A8199] mb-6">
        Showing <span className="text-white font-medium">{filtered.length}</span> of {products.length} {products.length === 1 ? "project" : "projects"}
      </p>

      {/* ───── GRID ───── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/5 bg-white/[0.02]">
          <Search size={32} className="text-[#7A8199] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No projects match your filters</p>
          <p className="text-sm text-[#7A8199]">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* PRODUCT CARD                                   */
/* ─────────────────────────────────────────────── */
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-[#7559E8]/40 hover:bg-white/[0.04] transition">
      {/* Cover image + demo overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#171B33] to-[#0B0F1D]">
        <Link href={`/marketplace/${product.slug}`}>
          {product.cover_image_url ? (
            <img
              src={product.cover_image_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-[#7559E8]/30 group-hover:text-[#7559E8]/50 transition">
                {product.title.charAt(0)}
              </span>
            </div>
          )}
        </Link>

        {/* Demo button overlay — ALWAYS shows if demo exists */}
        {product.live_demo_url && (
          <a
            href={product.live_demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-black/80 backdrop-blur-md px-2 py-1.5 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition"
            onClick={(e) => e.stopPropagation()}
          >
            <Play size={10} /> Live Demo
          </a>
        )}

        {product.is_featured && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F5A623] text-[8px] font-bold uppercase tracking-wider text-black">
            <Sparkles size={8} /> Featured
          </span>
        )}

        {product.is_free && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#22C58B] text-[8px] font-bold uppercase tracking-wider text-black">
            Free
          </span>
        )}
      </div>

      {/* Content */}
      <Link href={`/marketplace/${product.slug}`} className="p-3 flex flex-col flex-1">
        {/* Difficulty */}
        <span className={`self-start inline-block rounded text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border mb-2 ${DIFFICULTY_COLORS[product.difficulty] || DIFFICULTY_COLORS.beginner}`}>
          {product.difficulty}
        </span>

        <h3 className="font-display text-sm font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-[#A78BFA] transition">
          {product.title}
        </h3>

        <p className="text-[11px] text-[#B7BDD0] mb-2 line-clamp-2 flex-1">
          {product.short_description}
        </p>

        {/* Creator */}
        {product.creator_name && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-[#7559E8]/20 overflow-hidden flex items-center justify-center shrink-0">
              {product.creator_avatar_url ? (
                <img src={`http://127.0.0.1:8010${product.creator_avatar_url}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-[#A78BFA]">{product.creator_name.charAt(0)}</span>
              )}
            </div>
            <span className="text-[9px] text-[#7A8199] truncate">{product.creator_name}</span>
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-0.5 mb-2">
          <Star size={9} className="fill-[#F5A623] text-[#F5A623]" />
          <span className="text-[9px] text-[#7A8199]">5.0 (New)</span>
        </div>

        {/* Price + Action */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
          <div>
            <p className="text-[8px] text-[#7A8199] font-mono uppercase tracking-wider">From</p>
            <p className="text-xs font-bold text-white">
              {product.is_free ? "Free" : `$${(product.starting_price_cents / 100).toFixed(0)}`}
            </p>
          </div>
          <div className="w-5 h-5 rounded-full bg-white/5 group-hover:bg-[#7559E8] flex items-center justify-center transition">
            <ArrowRight size={10} className="text-white" />
          </div>
        </div>
      </Link>
    </div>
  );
}
