import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Package, Calendar } from "lucide-react";

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8010/api/v1";

async function fetchCreator(id: string): Promise<CreatorProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/creators/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchCreator(id);
  if (!data) return { title: "Creator not found — ZORVI" };
  return { title: `${data.creator.full_name} — ZORVI` };
}

export default async function CreatorPage({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchCreator(id);
  if (!data) notFound();

  const { creator, products } = data;

  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-20">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12 pb-10 border-b border-white/5">
          <div className="w-24 h-24 rounded-full bg-[#7559E8]/20 border border-[#7559E8]/30 flex items-center justify-center overflow-hidden shrink-0">
            {creator.avatar_url ? (
              <img src={`http://127.0.0.1:8010${creator.avatar_url}`} alt={creator.full_name} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-[#A78BFA]" />
            )}
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-2">
              {creator.role.replace("_", " ")}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-2">
              {creator.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#7A8199]">
              <span className="inline-flex items-center gap-1.5">
                <Package size={14} /> {products.length} {products.length === 1 ? "project" : "projects"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} /> Joined {new Date(creator.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-6">Projects by {creator.full_name}</h2>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
              <p className="text-[#7A8199]">No published projects yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.slug}`}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition"
                >
                  <div className="aspect-[16/10] bg-gradient-to-br from-[#171B33] to-[#0B0F1D] flex items-center justify-center overflow-hidden">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-8xl font-extrabold text-[#7559E8]/20 group-hover:text-[#7559E8]/30 transition-colors duration-500">
                        {p.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#A78BFA] transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-[#B7BDD0] mb-4 line-clamp-2">{p.short_description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#7A8199] uppercase">From</span>
                      <span className="font-bold text-white">${(p.starting_price_cents / 100).toFixed(0)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
