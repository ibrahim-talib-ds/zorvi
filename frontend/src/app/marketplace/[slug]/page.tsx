import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Download, Play, Check, Clock } from "lucide-react";
import { BuyButton } from "./BuyButton";
import { ProductGallery } from "./ProductGallery";
import { ProductTabs } from "./ProductTabs";
import { ContactSellerButton } from "./ContactSellerButton";
import { FreeDownloadButton } from "./FreeDownloadButton";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchImages(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/products/${slug}/images`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}


async function fetchMoreFromSeller(creatorId: string, currentSlug: string) {
  try {
    const res = await fetch(API_BASE + "/marketplace/creators/" + encodeURIComponent(creatorId), { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.products)) return [];
    return data.products.filter((item: any) => item.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: "Product not found — IBRANT" };
  return { title: `${product.title} — IBRANT`, description: product.short_description };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const images = await fetchImages(slug);
  const moreFromSeller = product.creator_id
    ? await fetchMoreFromSeller(product.creator_id, slug)
    : [];
  const activePackages = (product.packages || []).filter((p: any) => p.is_active);
  const minPrice = activePackages.length > 0 ? Math.min(...activePackages.map((p: any) => p.price_cents)) : product.starting_price_cents;
  const isFree = product.is_free || minPrice === 0;

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
          <div className="min-w-0">
            <ProductGallery images={allImages} title={product.title} />
            <ProductTabs
              longDescription={product.long_description}
              instructions={product.instructions}
              license={product.license}
              reviewCount={0}
            />
          </div>

          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Creator Card */}
            {product.creator_name && product.creator_id && (
              <Link
                href={`/creators/${product.creator_id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#7559E8]/40 transition"
              >
                <Avatar name={product.creator_name} size={48} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#7A8199] uppercase tracking-wider font-mono">Built by</p>
                  <p className="text-white font-semibold truncate">{product.creator_name}</p>
                </div>
                <ArrowLeft size={16} className="text-[#7A8199] rotate-180 shrink-0" />
              </Link>
            )}

            {/* Purchase Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33]/80 to-[#0B0F1D] p-6 shadow-xl shadow-black/40">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block rounded-full border border-[#5B9EFF]/30 bg-[#5B9EFF]/10 px-2.5 py-1 text-[10px] font-medium text-[#5B9EFF] uppercase tracking-wider">
                  {product.difficulty}
                </span>
              </div>

              <h1 className="font-display text-2xl font-extrabold text-white mb-3 leading-tight">{product.title}</h1>
              <p className="text-sm text-[#B7BDD0] mb-6">{product.short_description}</p>

              <div className="mb-6 flex items-center gap-2 text-xs text-[#7A8199]">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-medium text-[#B7BDD0]">New listing</span>
                <span>Reviews will appear here when available</span>
              </div>

              <div className="mb-4">
                <p className="text-[10px] text-[#7A8199] font-mono uppercase tracking-wider mb-1">{isFree ? "Price" : "Starting at"}</p>
                <p className="font-display text-4xl font-extrabold text-white">
                  {isFree ? <span className="text-[#22C58B]">Free</span> : <>${(minPrice / 100).toFixed(0)}<span className="text-base font-normal text-[#7A8199] ml-1">{product.currency}</span></>}
                </p>
              </div>

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

              {/* Ask a Question Button (Client Component) */}
              {product.creator_id && product.creator_name && (
                <ContactSellerButton
                  productId={product.id}
                  sellerId={product.creator_id}
                  sellerName={product.creator_name}
                />
              )}
            </div>
          </div>
        </div>

        {moreFromSeller.length > 0 && (
          <section className="mt-12 border-t border-white/[0.07] pt-9">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">Seller portfolio</p>
                <h2 className="font-display text-2xl font-bold text-white">More from {product.creator_name || "this seller"}</h2>
                <p className="mt-1 text-sm text-[#9299AE]">Discover other projects from the same creator.</p>
              </div>
              <Link href={"/creators/" + product.creator_id} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-semibold text-[#B7BDD0] transition hover:border-[#7559E8]/40 hover:text-white">
                View seller profile <ArrowLeft size={13} className="rotate-180" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {moreFromSeller.map((item: any) => (
                <Link key={item.id} href={"/marketplace/" + item.slug} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-[#7559E8]/40 hover:bg-white/[0.045]">
                  <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                    {item.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover_image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><span className="font-display text-5xl font-extrabold text-[#7559E8]/25">{String(item.title || "P").charAt(0)}</span></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-display text-base font-bold text-white transition group-hover:text-[#B7A7FF]">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9299AE]">{item.short_description}</p>
                    <p className="mt-3 text-sm font-semibold text-white">{item.starting_price_cents === 0 ? "Free" : (item.currency || "USD") + " " + (item.starting_price_cents / 100).toFixed(0)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
