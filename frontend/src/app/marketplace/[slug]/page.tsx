import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Download, User, Play, Check, Clock } from "lucide-react";
import { BuyButton } from "./BuyButton";
import { FreeDownloadButton } from "./FreeDownloadButton";
import { ProductGallery } from "./ProductGallery";
import { ProductTabs } from "./ProductTabs";

import { API_BASE } from "@/lib/api/client";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  instructions: string | null;
  license: string | null;
  difficulty: string;
  status: string;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  demo_video_url: string | null;
  live_demo_url: string | null;
  is_featured: boolean;
  is_free?: boolean;
  external_download_url: string | null;
  published_at: string | null;
  packages: any[];
  creator_id: string | null;
  creator_name: string | null;
  creator_avatar_url: string | null;
}


async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchImages(slug: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/products/${slug}/images`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: "Product not found — ZORVI" };
  return { title: `${product.title} — ZORVI`, description: product.short_description };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const images = await fetchImages(slug);
  const activePackages = (product.packages || []).filter((p: any) => p.is_active);
  const minPrice = activePackages.length > 0 ? Math.min(...activePackages.map((p: any) => p.price_cents)) : product.starting_price_cents;
  const isFree = product.is_free || minPrice === 0;

  // Build all images: cover first, then gallery
  const allImages: string[] = [];
  if (product.cover_image_url) allImages.push(product.cover_image_url);
  images.forEach((img: any) => {
    if (!allImages.includes(img.image_url)) allImages.push(img.image_url);
  });

  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-12">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition mb-6">
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
          {/* LEFT: Gallery + Details */}
          <div className="min-w-0">
            {/* Full Gallery Component */}
            <ProductGallery
              images={allImages}
              title={product.title}
            />

            {/* Tabs with real content */}
            <ProductTabs
              longDescription={product.long_description}
              instructions={product.instructions}
              license={product.license}
              reviewCount={0}
            />

            
          </div>

          {/* RIGHT: Purchase Card */}
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* CREATOR CARD - at the TOP */}
            {product.creator_name && product.creator_id && (
              <Link
                href={`/creators/${product.creator_id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#7559E8]/40 transition"
              >
                <div className="w-12 h-12 rounded-full bg-[#7559E8]/20 border border-[#7559E8]/30 flex items-center justify-center overflow-hidden shrink-0">
                  {product.creator_avatar_url ? (
                    <img src={`http://127.0.0.1:8010${product.creator_avatar_url}`} alt={product.creator_name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-[#A78BFA]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#7A8199] uppercase tracking-wider font-mono">Built by</p>
                  <p className="text-white font-semibold truncate">{product.creator_name}</p>
                </div>
                <ArrowLeft size={16} className="text-[#7A8199] rotate-180 shrink-0" />
              </Link>
            )}

            {/* PURCHASE CARD */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33]/80 to-[#0B0F1D] p-6 shadow-xl shadow-black/40">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block rounded-full border border-[#5B9EFF]/30 bg-[#5B9EFF]/10 px-2.5 py-1 text-[10px] font-medium text-[#5B9EFF] uppercase tracking-wider">
                  {product.difficulty}
                </span>
              </div>

              <h1 className="font-display text-2xl font-extrabold text-white mb-3 leading-tight">{product.title}</h1>
              <p className="text-sm text-[#B7BDD0] mb-6">{product.short_description}</p>

              <div className="flex items-center gap-2 mb-6">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-[#F5A623] text-[#F5A623]" />)}
                </div>
                <span className="text-xs text-[#7A8199]">5.0 (New)</span>
              </div>

              <div className="mb-4">
                <p className="text-[10px] text-[#7A8199] font-mono uppercase tracking-wider mb-1">{isFree ? "Price" : "Starting at"}</p>
                <p className="font-display text-4xl font-extrabold text-white">
                  {isFree ? <span className="text-[#22C58B]">Free</span> : <>${(minPrice / 100).toFixed(0)}<span className="text-base font-normal text-[#7A8199] ml-1">{product.currency}</span></>}
                </p>
              </div>

              {/* SINGLE Test Live Project button */}
              {product.live_demo_url && (
                <a
                  href={product.live_demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-3 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#22C58B]/40 bg-[#22C58B]/10 px-6 py-3 text-sm font-bold text-[#22C58B] hover:bg-[#22C58B]/20 transition"
                >
                  <Play size={16} /> Test Live Project
                </a>
              )}

              <div className="space-y-3">
                {isFree ? (
                  <FreeDownloadButton productId={product.id} packages={activePackages} />
                ) : (
                  <BuyButton productId={product.id} packages={activePackages} />
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 space-y-3 text-sm">
                <div className="flex items-center gap-2.5 text-[#B7BDD0]"><Check size={16} className="text-[#22C58B]" /> Complete source code</div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]"><Check size={16} className="text-[#22C58B]" /> Documentation included</div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]"><Check size={16} className="text-[#22C58B]" /> Lifetime access</div>
                <div className="flex items-center gap-2.5 text-[#B7BDD0]"><Check size={16} className="text-[#22C58B]" /> {isFree ? "Instant download" : "Instant access after approval"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
