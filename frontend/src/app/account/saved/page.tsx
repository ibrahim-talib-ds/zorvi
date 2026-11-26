"use client";

// app/account/saved/page.tsx - IBRANT Saved Projects (v15, NEW PAGE)
//
// Shows the projects you hearted in the marketplace. Data lives in
// localStorage (key IBRANT_SAVED_V1) - the same key the marketplace page
// writes when you tap a heart. No backend wishlist endpoint exists yet;
// this is a local wishlist, synced across tabs via the storage event.
// The account layout (sidebar + auth guard) renders automatically around it.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Heart, Search, Trash2 } from "lucide-react";

const SAVED_KEY = "IBRANT_SAVED_V1";
const MARKET_BASE = "/marketplace";

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
type SavedMap = Record<string, SavedSnap>;

function readSavedMap(): SavedMap {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
    return v && typeof v === "object" ? (v as SavedMap) : {};
  } catch {
    return {};
  }
}
function writeSavedMap(m: SavedMap) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function SavedProjectsPage() {
  const [saved, setSaved] = useState<SavedMap>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setSaved(readSavedMap());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    const iv = window.setInterval(refresh, 1500);
    return () => { window.removeEventListener("storage", refresh); window.clearInterval(iv); };
  }, [refresh]);

  const remove = (id: string) => {
    const next = { ...saved };
    delete next[id];
    setSaved(next);
    writeSavedMap(next);
  };
  const clearAll = () => {
    setSaved({});
    writeSavedMap({});
  };

  const items = Object.values(saved).sort(
    (a, b) => new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime()
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F05D70]/15 text-[#F05D70]">
              <Heart size={18} fill="#F05D70" />
            </span>
            Saved Projects
          </h1>
          <p className="mt-1 text-sm text-[#929CBD]">
            {items.length > 0
              ? `${items.length} project${items.length === 1 ? "" : "s"} saved from the marketplace.`
              : "Tap the heart on any project in the marketplace and it will appear here."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Browse Marketplace <ArrowRight size={14} />
          </Link>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 px-4 py-2 text-sm font-medium text-[#F05D70] transition hover:bg-[#F05D70]/20"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.03] p-3" aria-busy="true">
              <div className="h-28 rounded-xl bg-white/[0.04]" />
              <div className="mt-3 h-3 w-3/4 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <Heart size={28} className="text-[#7A8199]" />
          <p className="text-sm font-medium text-white">Nothing saved yet.</p>
          <p className="max-w-sm text-xs text-[#7A8199]">
            Your wishlist is stored locally in this browser — hearts you tap in the marketplace show up here instantly.
          </p>
          <Link
            href="/marketplace"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Search size={14} /> Find something to save
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((s) => {
            const initial = (s.title || "?").trim().charAt(0).toUpperCase();
            const discount =
              s.original_price_cents !== null && s.price_cents !== null && s.original_price_cents > s.price_cents
                ? Math.round((1 - s.price_cents / s.original_price_cents) * 100)
                : null;
            return (
              <div
                key={s.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] transition hover:border-[#7559E8]/40 hover:bg-white/[0.05]"
              >
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B2347] to-[#10162E]">
                  <span className="font-display text-3xl font-extrabold text-[#A78BFA]/50">{initial}</span>
                  {s.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.cover}
                      alt={s.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  {discount !== null && discount > 0 && (
                    <span className="absolute left-2 top-2 rounded-lg bg-[#F05D70] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                      {discount}% OFF
                    </span>
                  )}
                  <button
                    onClick={() => remove(s.id)}
                    title="Remove from saved"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#0B0F1D]/70 text-[#F05D70] backdrop-blur transition hover:bg-[#F05D70] hover:text-white"
                  >
                    <Heart size={13} fill="currentColor" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="truncate text-sm font-bold text-white">{s.title}</h3>
                  <p className="mt-1 truncate text-[11px] text-[#929CBD]">{s.author || s.category || "Marketplace project"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {s.rating > 0 ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#B7BDD0]">
                        ★ <span className="font-bold text-white">{s.rating.toFixed(1)}</span>
                        {s.reviews !== null && <span className="text-[#7A8199]">({fmtCompact(s.reviews)})</span>}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-right">
                      {s.price_cents !== null ? (
                        <span className={`font-display text-base font-extrabold ${s.price_cents === 0 ? "text-[#22C58B]" : "text-white"}`}>
                          {s.price_cents === 0 ? "Free" : fmtMoney(s.price_cents)}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#929CBD]">See details</span>
                      )}
                    </span>
                  </div>
                  <Link
                    href={`${MARKET_BASE}/${s.slug || s.id}`}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    View Details <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="pb-2 text-center text-[11px] text-[#7A8199]">
        Saved items are stored locally in your browser for now — once a wishlist API exists, this page syncs to your account.
      </p>
    </div>
  );
}
