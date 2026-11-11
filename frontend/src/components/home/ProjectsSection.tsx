"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Sparkles, Star } from "lucide-react";
import { API_BASE } from "@/lib/api/client";

interface Product {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  difficulty: string;
  is_featured: boolean;
  is_free?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-[#22C58B]/10 text-[#22C58B] border-[#22C58B]/30",
  intermediate: "bg-[#5B9EFF]/10 text-[#5B9EFF] border-[#5B9EFF]/30",
  advanced: "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30",
  expert: "bg-[#F05D70]/10 text-[#F05D70] border-[#F05D70]/30",
};

export function ProjectsSection() {
  const [projects, setProjects] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/marketplace/products?limit=3`);
        if (res.ok) {
          const data = await res.json();
          setProjects(Array.isArray(data) ? data.slice(0, 3) : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="relative py-20 bg-[#0B0F1D]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-[#7559E8]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3">Featured Projects</p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Production-ready software.</h2>
            <p className="text-[#B7BDD0] mt-3 max-w-xl">
              Skip months of setup. Buy complete, fully-documented source code built by expert developers.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition shrink-0"
          >
            Explore all <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#7559E8]" size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-[#7A8199]">Projects are being prepared. Check back soon.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/marketplace/${p.slug}`}
                className="group flex flex-col rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-[#7559E8]/40 hover:bg-white/[0.04] transition"
              >
                {/* Cover */}
                <div className="aspect-[16/10] bg-gradient-to-br from-[#171B33] to-[#0B0F1D] relative overflow-hidden">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl font-extrabold text-[#7559E8]/30 group-hover:text-[#7559E8]/50 transition duration-500">
                        {p.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  {p.is_featured && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5A623] text-[9px] font-bold uppercase tracking-wider text-black">
                      <Sparkles size={9} /> Featured
                    </span>
                  )}
                  {p.is_free && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#22C58B] text-[9px] font-bold uppercase tracking-wider text-black">
                      Free
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <span className={`self-start inline-block rounded text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border mb-2 ${DIFFICULTY_COLORS[p.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                    {p.difficulty}
                  </span>

                  <h3 className="font-display text-base font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-[#A78BFA] transition">
                    {p.title}
                  </h3>

                  <p className="text-xs text-[#B7BDD0] mb-3 line-clamp-2 flex-1">
                    {p.short_description}
                  </p>

                  <div className="flex items-center gap-1 mb-2">
                    <Star size={11} className="fill-[#F5A623] text-[#F5A623]" />
                    <span className="text-[10px] text-[#7A8199]">5.0</span>
                    <span className="text-[10px] text-[#7A8199] ml-1">(New)</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[9px] text-[#7A8199] font-mono uppercase tracking-wider">From</p>
                      <p className="text-sm font-bold text-white">
                        {p.is_free ? "Free" : `$${(p.starting_price_cents / 100).toFixed(0)}`}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/5 group-hover:bg-[#7559E8] flex items-center justify-center transition">
                      <ArrowRight size={11} className="text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
