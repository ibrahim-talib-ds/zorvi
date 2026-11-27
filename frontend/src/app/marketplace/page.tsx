"use client";

// app/marketplace/page.tsx - ibrant Marketplace (v15)
//
// Marketplace catalog content. The surrounding navigation is shared with product detail pages.
//
// v15 changes:
//  - Catalog cards use a readable 2 / 3 / 4-column responsive grid, with
//    taller covers on larger screens to preserve image clarity.
//  - Hearts now PERSIST: localStorage key ibrant_SAVED_V1 (snapshot map),
//    synced across tabs. The /account/saved page reads the same key.
//
// Data: your real public endpoint - GET /marketplace/products. Anything the
// API does not provide is omitted, never faked. Search / sort / pagination
// run client-side.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Briefcase,
  Download,
  Globe,
  GraduationCap,
  Heart,
  LayoutGrid,
  Megaphone,
  Palette,
  RefreshCw,
  Search,
  Smartphone,
  Star,
  Tag,
} from "lucide-react";
import { API_BASE } from "@/lib/api/client";

// ============================================================================
// CONFIG: detail route (apply script auto-detects this from your old page)
// ============================================================================
const DETAIL_BASE = "/marketplace";

// wishlist contract: same key as app/account/saved/page.tsx
const SAVED_KEY = "ibrant_SAVED_V1";
interface SavedSnap {
  id: string;
  title: string;
  slug: string;
  price_cents: number | null;
  original_price_cents: number | null;
  cover: string;
  category: string;
  author: string;
  rating: number;
  reviews: number | null;
  saved_at: string;
}
function readSavedMap(): Record<string, SavedSnap> {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
    return v && typeof v === "object" ? (v as Record<string, SavedSnap>) : {};
  } catch {
    return {};
  }
}
function writeSavedMap(m: Record<string, SavedSnap>) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

// ============================================================================
// types + helpers
// ============================================================================
type Product = Record<string, unknown>;
type Sec = "loading" | "ready" | "error";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function extractList(data: unknown): Product[] {
  if (Array.isArray(data)) return data as Product[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["products", "items", "results", "data"]) {
      if (Array.isArray(obj[k])) return obj[k] as Product[];
    }
  }
  return [];
}
function firstNum(p: Product, keys: string[]): number | null {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}
function firstStr(p: Product, keys: string[]): string {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v) return v;
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k2 of ["full_name", "name", "title", "username"]) {
        if (typeof o[k2] === "string" && o[k2]) return o[k2] as string;
      }
    }
  }
  return "";
}
function priceOf(p: Product): { cents: number | null; originalCents: number | null } {
  let cents = firstNum(p, ["price_cents", "listing_price_cents", "amount_cents"]);
  if (cents === null && typeof p.price === "number") cents = (p.price as number) >= 1000 ? (p.price as number) : (p.price as number) * 100;
  let originalCents = firstNum(p, ["original_price_cents", "compare_at_price_cents"]);
  if (originalCents === null && typeof p.original_price === "number") {
    originalCents = (p.original_price as number) >= 1000 ? (p.original_price as number) : (p.original_price as number) * 100;
  }
  if (originalCents !== null && cents !== null && originalCents <= cents) originalCents = null;
  return { cents, originalCents };
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
function coverOf(p: Product): string {
  return firstStr(p, ["cover_image_url", "image_url", "thumbnail_url", "preview_url", "cover_url"]);
}
function titleOf(p: Product): string {
  return firstStr(p, ["title", "name"]) || "Untitled Project";
}
function descOf(p: Product): string {
  return firstStr(p, ["short_description", "description", "summary"]);
}
function authorOf(p: Product): string {
  return firstStr(p, ["creator_name", "author_name", "seller_name", "author", "creator", "user"]);
}
function categoryOf(p: Product): string {
  return firstStr(p, ["category", "category_name", "category_title"]) || "Other";
}
function ratingOf(p: Product): { rating: number; reviews: number | null } {
  const r = firstNum(p, ["rating", "average_rating", "avg_rating"]);
  const rc = firstNum(p, ["reviews_count", "review_count", "ratings_count"]);
  return { rating: r ?? 0, reviews: rc };
}
function downloadsOf(p: Product): number | null {
  return firstNum(p, ["downloads_count", "downloads", "purchase_count", "sales_count"]);
}
function isFeatured(p: Product): boolean {
  return p.featured === true || p.is_featured === true;
}
function slugOf(p: Product): string {
  return str(p.slug) || str(p.id) || "";
}
function detailHref(p: Product): string {
  return `${DETAIL_BASE}/${slugOf(p)}`;
}
function snapshotOf(p: Product): SavedSnap {
  const { cents, originalCents } = priceOf(p);
  const { rating, reviews } = ratingOf(p);
  return {
    id: str(p.id) || titleOf(p),
    title: titleOf(p),
    slug: slugOf(p),
    price_cents: cents,
    original_price_cents: originalCents,
    cover: coverOf(p),
    category: categoryOf(p),
    author: authorOf(p),
    rating,
    reviews,
    saved_at: new Date().toISOString(),
  };
}
function categoryIcon(cat: string): ReactNode {
  const c = cat.toLowerCase();
  if (c.includes("web") || c.includes("site")) return <Globe size={13} />;
  if (c.includes("mobile") || c.includes("app")) return <Smartphone size={13} />;
  if (c.includes("educat") || c.includes("course") || c.includes("learn")) return <GraduationCap size={13} />;
  if (c.includes("business") || c.includes("finance")) return <Briefcase size={13} />;
  if (c.includes("market") || c.includes("seo")) return <Megaphone size={13} />;
  if (c.includes("design") || c.includes("ui")) return <Palette size={13} />;
  if (c.includes("ai") || c.includes("data") || c.includes("ml")) return <Brain size={13} />;
  return <Tag size={13} />;
}

// ============================================================================
// data fetch
// ============================================================================
async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/marketplace/products?limit=100`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Products request failed (${res.status})`);
  return extractList(await res.json());
}

// ============================================================================
// shared states
// ============================================================================
function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/[0.06] p-8 text-center">
      <AlertCircle size={20} className="text-[#F05D70]" />
      <p className="text-sm text-[#F05D70]">Unable to load projects. Please try again.</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
      >
        <RefreshCw size={12} /> Try again
      </button>
    </div>
  );
}
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.03] p-3" aria-busy="true">
      <div className="h-28 rounded-xl bg-white/[0.04] sm:h-32 xl:h-36" />
      <div className="mt-3 h-3.5 w-3/4 rounded bg-white/[0.04]" />
      <div className="mt-2 h-3 w-full rounded bg-white/[0.04]" />
      <div className="mt-1 h-3 w-2/3 rounded bg-white/[0.04]" />
      <div className="mt-3 h-8 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

// ============================================================================
// sidebar (page-level; hidden below xl - your site header covers mobile nav)
// ============================================================================
// ============================================================================
// hero
// ============================================================================
function HeroIllustration() {
  return (
    <svg viewBox="0 0 240 170" className="h-full w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="mkLap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D35A0" />
          <stop offset="100%" stopColor="#1B1442" />
        </linearGradient>
        <radialGradient id="mkGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7559E8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7559E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="90" r="110" fill="url(#mkGlow)" />
      <rect x="150" y="18" width="34" height="34" rx="9" fill="#8B70FF" transform="rotate(8 167 35)" />
      <circle cx="167" cy="35" r="8" fill="#E9E5FF" />
      <rect x="128" y="58" width="30" height="30" rx="8" fill="#22C58B" transform="rotate(-10 143 73)" />
      <path d="M136 66 L143 80 L150 66" stroke="#0B0F1D" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="60" y="46" width="104" height="68" rx="8" fill="url(#mkLap)" stroke="#7559E8" strokeWidth="2" />
      <rect x="68" y="54" width="88" height="52" rx="4" fill="#12102E" />
      <text x="112" y="90" textAnchor="middle" fill="#A78BFA" fontSize="26" fontWeight="800" style={{ fontFamily: "monospace" }}>
        &lt;/&gt;
      </text>
      <rect x="44" y="114" width="136" height="10" rx="5" fill="#2A2455" />
      <rect x="176" y="70" width="26" height="26" rx="7" fill="#5B9EFF" transform="rotate(12 189 83)" />
      <circle cx="189" cy="83" r="6" fill="#E9F2FF" />
    </svg>
  );
}
function Hero({ query, onQuery, onSubmit }: { query: string; onQuery: (v: string) => void; onSubmit: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#241B5E] via-[#171338] to-[#0B0F1D] px-5 py-7 lg:px-10 lg:py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 260px at 80% 30%, rgba(117,89,232,0.30), transparent 65%), radial-gradient(420px 200px at 5% 110%, rgba(91,155,255,0.12), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#7559E8]/30">
            <LayoutGrid size={12} /> Marketplace
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Explore <span className="bg-gradient-to-r from-[#A78BFA] to-[#8B70FF] bg-clip-text text-transparent">Projects</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#B7BDD0] sm:text-base">
            Production-ready software you can buy or download.
          </p>
          <form
            className="mt-5 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-[#0B0F1D]/80 p-2 backdrop-blur focus-within:border-[#7559E8]/60"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            role="search"
          >
            <Search size={18} className="ml-2 flex-shrink-0 text-[#7A8199]" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search projects by name, description, or creator..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder-[#7A8199] focus:outline-none"
              aria-label="Search projects"
            />
            <button
              type="submit"
              className="flex-shrink-0 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              Search
            </button>
          </form>
        </div>
        <div className="hidden h-32 flex-shrink-0 lg:block xl:h-40">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// product card (compact)
// ============================================================================
function ProductCard({
  p,
  saved,
  onToggleSave,
}: {
  p: Product;
  saved: boolean;
  onToggleSave: (p: Product) => void;
}) {
  const title = titleOf(p);
  const { cents, originalCents } = priceOf(p);
  const { rating, reviews } = ratingOf(p);
  const downloads = downloadsOf(p);
  const author = authorOf(p);
  const cover = coverOf(p);
  const discount = originalCents !== null && cents !== null ? Math.round((1 - cents / originalCents) * 100) : null;
  const initial = title.trim().charAt(0).toUpperCase();

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition hover:border-[#7559E8]/40 hover:bg-white/[0.05]">
      <div className="relative flex h-28 sm:h-32 xl:h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
        <span className="font-display text-3xl font-extrabold text-[#A78BFA]/50">{initial}</span>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {isFeatured(p) && (
          <span className="absolute left-2 top-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            ⭐ Featured
          </span>
        )}
        {discount !== null && discount > 0 && (
          <span className="absolute left-2 top-2 rounded-lg bg-[#F05D70] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            {discount}% OFF
          </span>
        )}
        <button
          onClick={() => onToggleSave(p)}
          aria-pressed={saved}
          title={saved ? "Remove from saved" : "Save to wishlist"}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 backdrop-blur transition ${
            saved ? "bg-[#F05D70] text-white" : "bg-[#0B0F1D]/70 text-[#B7BDD0] hover:text-white"
          }`}
        >
          <Heart size={13} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-bold text-white sm:text-base">{title}</h3>
        {descOf(p) && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#929CBD]">{descOf(p)}</p>}

        <div className="mt-2 flex items-center gap-1.5">
          {author && (
            <>
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-[9px] font-bold text-white">
                {author.charAt(0).toUpperCase()}
              </span>
              {str(p.creator_id) ? (
                <Link href={"/creators/" + str(p.creator_id)} onClick={(event) => event.stopPropagation()} className="truncate text-[11px] text-[#B7BDD0] transition hover:text-[#A78BFA] hover:underline" aria-label={"View " + author + " seller profile"}>{author}</Link>
              ) : (
                <span className="truncate text-[11px] text-[#B7BDD0]">{author}</span>
              )}
            </>
          )}
          {rating > 0 && (
            <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-[11px] text-[#B7BDD0]">
              <Star size={11} className="text-[#F5A623]" fill="#F5A623" />
              <span className="font-bold text-white">{rating.toFixed(1)}</span>
              {reviews !== null && <span className="text-[#7A8199]">({fmtCompact(reviews)})</span>}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          {downloads !== null ? (
            <span className="flex items-center gap-1 text-[11px] text-[#7A8199]">
              <Download size={11} /> {fmtCompact(downloads)}
            </span>
          ) : (
            <span className="truncate rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#929CBD]">
              {categoryOf(p)}
            </span>
          )}
          <span className="ml-auto text-right">
            {cents !== null ? (
              <>
                {originalCents !== null && <span className="mr-1 text-[10px] text-[#7A8199] line-through">{fmtMoney(originalCents)}</span>}
                <span className={`font-display text-base font-extrabold ${cents === 0 ? "text-[#22C58B]" : "text-white"}`}>
                  {cents === 0 ? "Free" : fmtMoney(cents)}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-[#929CBD]">See details</span>
            )}
          </span>
        </div>

        <Link
          href={detailHref(p)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-[#7559E8]/20 transition hover:brightness-110"
        >
          View Details <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// page
// ============================================================================
const SORTS = ["Popular", "Newest", "Price: Low to High", "Price: High to Low", "Top Rated"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 12;

export default function MarketplacePage() {
  const [state, setState] = useState<Sec>("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState<Sort>("Popular");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [savedMap, setSavedMap] = useState<Record<string, SavedSnap>>({});

  // load + cross-tab sync of the persistent wishlist
  useEffect(() => {
    setSavedMap(readSavedMap());
    const on = () => setSavedMap(readSavedMap());
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setProducts(await fetchProducts());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const toggleSave = useCallback((p: Product) => {
    setSavedMap((prev) => {
      const id = str(p.id) || titleOf(p);
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = snapshotOf(p);
      writeSavedMap(next);
      return next;
    });
  }, []);

  // categories derived from the real product list
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const c = categoryOf(p);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return ["All Categories", ...[...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))];
  }, [products]);

  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      const inCat = category === "All Categories" || categoryOf(p) === category;
      if (!inCat) return false;
      if (!q) return true;
      return (
        titleOf(p).toLowerCase().includes(q) ||
        descOf(p).toLowerCase().includes(q) ||
        authorOf(p).toLowerCase().includes(q) ||
        categoryOf(p).toLowerCase().includes(q)
      );
    });
    const price = (p: Product) => priceOf(p).cents ?? Number.MAX_SAFE_INTEGER;
    const dl = (p: Product) => downloadsOf(p) ?? -1;
    const rate = (p: Product) => ratingOf(p).rating;
    list = [...list];
    if (sort === "Popular") list.sort((a, b) => dl(b) - dl(a) || rate(b) - rate(a));
    else if (sort === "Newest") list.sort((a, b) => new Date(str(a.created_at) || 0).getTime() - new Date(str(b.created_at) || 0).getTime());
    else if (sort === "Price: Low to High") list.sort((a, b) => price(a) - price(b));
    else if (sort === "Price: High to Low") list.sort((a, b) => price(b) - price(a));
    else if (sort === "Top Rated") list.sort((a, b) => rate(b) - rate(a));
    return list;
  }, [products, appliedQuery, category, sort]);

  useEffect(() => setVisible(PAGE_SIZE), [appliedQuery, category, sort]);
  const shown = filtered.slice(0, visible);

  // popular rail: real metric only (downloads, else rating)
  const popular = useMemo(() => {
    const hasDl = products.some((p) => downloadsOf(p) !== null);
    const list = [...products];
    if (hasDl) list.sort((a, b) => (downloadsOf(b) ?? 0) - (downloadsOf(a) ?? 0));
    else list.sort((a, b) => ratingOf(b).rating - ratingOf(a).rating);
    return { items: list.slice(0, 5), metric: hasDl ? ("downloads" as const) : ("rating" as const) };
  }, [products]);

  const savedCount = Object.keys(savedMap).length;

  return (
    <div className="min-w-0 space-y-6">
        <Hero
          query={query}
          onQuery={setQuery}
          onSubmit={() => {
            setAppliedQuery(query);
            setVisible(PAGE_SIZE);
          }}
        />

        {/* category chips + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.slice(0, 9).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  category === c
                    ? "border-transparent bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/25"
                    : "border-white/10 bg-white/[0.03] text-[#B7BDD0] hover:border-white/20 hover:text-white"
                }`}
              >
                {c === "All Categories" ? <LayoutGrid size={13} /> : categoryIcon(c)}
                {c}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-2 text-xs text-[#B7BDD0] focus:border-[#7559E8] focus:outline-none"
            aria-label="Sort projects"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                Sort by: {s}
              </option>
            ))}
          </select>
        </div>

        {/* results meta */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#929CBD]">
            {state === "ready" && filtered.length > 0 ? (
              <>
                Showing <span className="font-semibold text-white">1–{shown.length}</span> of{" "}
                <span className="font-semibold text-white">{filtered.length}</span> projects
                {appliedQuery && (
                  <>
                    {" "}for <span className="font-semibold text-[#A78BFA]">“{appliedQuery}”</span>
                  </>
                )}
              </>
            ) : (
              <>
                &nbsp;
              </>
            )}
          </p>
          {savedCount > 0 && (
            <Link href="/account/saved" className="flex items-center gap-1.5 text-xs text-[#B7BDD0] transition hover:text-white">
              <Heart size={11} className="text-[#F05D70]" fill="#F05D70" />
              {savedCount} saved
            </Link>
          )}
        </div>

        {/* Responsive catalog grid: two columns on phones, four on wide screens. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {state === "loading" &&
            Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
          {state === "error" && (
            <div className="col-span-2 md:col-span-3 xl:col-span-4">
              <ErrorBox onRetry={load} />
            </div>
          )}
          {state === "ready" && shown.map((p) => (
            <ProductCard
              key={str(p.id) || titleOf(p)}
              p={p}
              saved={!!savedMap[str(p.id) || titleOf(p)]}
              onToggleSave={toggleSave}
            />
          ))}
        </div>

        {state === "ready" && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <Search size={24} className="text-[#7A8199]" />
            <p className="text-sm font-medium text-white">No projects match your search.</p>
            <p className="text-xs text-[#7A8199]">Try a different keyword or browse all categories.</p>
            <button
              onClick={() => {
                setQuery("");
                setAppliedQuery("");
                setCategory("All Categories");
              }}
              className="mt-1 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {state === "ready" && filtered.length > visible && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/10"
            >
              Load More Projects
            </button>
          </div>
        )}

        {/* Popular Projects rail (compact) */}
        {state === "ready" && popular.items.length > 0 && (
          <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
              <span aria-hidden="true">🔥</span> Popular Projects
              {popular.metric === "rating" && (
                <span className="text-[10px] font-medium text-[#7A8199]">(by rating — downloads not provided yet)</span>
              )}
            </h2>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {popular.items.map((p, i) => {
                const dl = downloadsOf(p);
                const r = ratingOf(p).rating;
                const cover = coverOf(p);
                const title = titleOf(p);
                return (
                  <li key={str(p.id) || title}>
                    <Link
                      href={detailHref(p)}
                      className="group flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition hover:border-[#7559E8]/40 hover:bg-[#7559E8]/[0.06]"
                    >
                      <span className="font-display text-base font-extrabold text-[#7A8199]">{i + 1}</span>
                      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                        <span className="text-xs font-extrabold text-[#A78BFA]/60">{title.charAt(0).toUpperCase()}</span>
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{title}</span>
                        <span className="block text-[10px] text-[#7A8199]">
                          {popular.metric === "downloads" && dl !== null
                            ? `${fmtCompact(dl)} downloads`
                            : r > 0
                              ? `${r.toFixed(1)} rating`
                              : categoryOf(p)}
                        </span>
                      </span>
                      <ArrowRight size={13} className="flex-shrink-0 text-[#7A8199] transition group-hover:text-[#A78BFA]" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <p className="pb-2 text-center text-[11px] text-[#7A8199]">
          Live data from your marketplace API — badges, ratings and downloads appear only where the data exists. Hearts
          save locally and show up on your Saved page.
        </p>
    </div>
  );
}
