import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Package, Sparkles, Store } from "lucide-react";

import { API_BASE } from "@/lib/api/client";
import { Avatar } from "@/components/ui/Avatar";
import { MarketplaceShell } from "@/app/marketplace/MarketplaceShell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}
interface Product {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  difficulty: string;
  created_at: string;
  is_featured?: boolean;
}
interface CreatorProfile {
  creator: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    joined_at: string;
  };
  products: Product[];
}

async function fetchCreator(id: string): Promise<CreatorProfile | null> {
  try {
    const res = await fetch(API_BASE + "/marketplace/creators/" + encodeURIComponent(id), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.creator || !Array.isArray(data.products)) return null;
    return data as CreatorProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchCreator(id);
  if (!data) return { title: "Seller not found — ibrant" };
  return {
    title: data.creator.full_name + " — ibrant Marketplace",
    description: "Explore " + data.products.length + " published marketplace projects by " + data.creator.full_name + ".",
  };
}

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return (currency || "USD") + " " + (cents / 100).toFixed(0);
  }
}

export default async function CreatorPage({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchCreator(id);
  if (!data) notFound();

  const creator = data.creator;
  const products = data.products;
  const joined = new Date(creator.joined_at);
  const joinedLabel = Number.isNaN(joined.getTime())
    ? "ibrant member"
    : "Member since " + joined.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const featuredCount = products.filter((product) => product.is_featured).length;
  const difficulties = Array.from(new Set(products.map((product) => product.difficulty).filter(Boolean)));

  return (
    <MarketplaceShell>
      <div className="relative isolate overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#101629]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(117,89,232,0.22),transparent_52%),radial-gradient(ellipse_at_bottom_left,rgba(91,158,255,0.10),transparent_50%)]" />
        <div className="border-b border-white/[0.07] px-5 py-5 sm:px-8">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-medium text-[#9299AE] transition hover:text-white">
            <ArrowLeft size={15} /> Back to Marketplace
          </Link>
        </div>
        <section className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-br from-[#7559E8] to-[#5B9EFF] opacity-60 blur-sm" />
              <div className="relative rounded-[24px] border border-white/10 bg-[#141B31] p-1">
                <Avatar name={creator.full_name} src={creator.avatar_url || undefined} size={104} className="rounded-[20px]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7559E8]/25 bg-[#7559E8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B7A7FF]">
                <Store size={13} /> Marketplace seller
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{creator.full_name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#9299AE]">
                <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> {joinedLabel}</span>
                <span className="inline-flex items-center gap-2"><Package size={15} /> {products.length} published {products.length === 1 ? "project" : "projects"}</span>
                {featuredCount > 0 && <span className="inline-flex items-center gap-2"><Sparkles size={15} className="text-[#F5A623]" /> {featuredCount} featured</span>}
              </div>
            </div>
          </div>
        </section>
        <section className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
          <div className="bg-[#101629] px-5 py-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#77819C]">Published work</p>
            <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">{products.length}</p>
          </div>
          <div className="bg-[#101629] px-5 py-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#77819C]">Featured projects</p>
            <p className="mt-1 font-display text-2xl font-bold text-white tabular-nums">{featuredCount}</p>
          </div>
          <div className="col-span-2 bg-[#101629] px-5 py-5 sm:col-span-1 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#77819C]">Project levels</p>
            <p className="mt-1 truncate text-sm font-semibold capitalize text-white">{difficulties.length ? difficulties.join(" · ") : "Marketplace projects"}</p>
          </div>
        </section>
      </div>

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">Seller portfolio</p>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">More from {creator.full_name.split(" ")[0]}</h2>
            <p className="mt-1 text-sm text-[#9299AE]">Explore this seller’s published marketplace projects.</p>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#9299AE]">{products.length} {products.length === 1 ? "project" : "projects"}</span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#9299AE]"><Package size={24} /></div>
            <h3 className="font-display text-lg font-bold text-white">No published projects yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#9299AE]">When this seller publishes a marketplace project, it will appear here.</p>
            <Link href="/marketplace" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B70FF]">Explore marketplace <ArrowUpRight size={15} /></Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={"/marketplace/" + product.slug} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-[#7559E8]/40 hover:bg-white/[0.045]">
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                  {product.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.cover_image_url} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><span className="font-display text-7xl font-extrabold text-[#7559E8]/25">{product.title.charAt(0)}</span></div>
                  )}
                  <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0B0F1D]/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#C7BFFF] backdrop-blur">{product.difficulty || "Project"}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-white transition group-hover:text-[#B7A7FF]">{product.title}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[#9299AE]">{product.short_description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#77819C]">Starting at</span>
                    <span className="font-display text-lg font-bold text-white">{money(product.starting_price_cents, product.currency)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </MarketplaceShell>
  );
}
