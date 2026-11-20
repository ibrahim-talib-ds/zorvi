import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const TECH = ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Docker"];

export function BackendSection() {
  return (
    <section className="relative bg-bg-deep py-16 sm:py-20 lg:py-28 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#22C58B] mb-3 sm:mb-4">
            <Tr k="backend.eyebrow" />
          </p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary mb-3 leading-tight">
            <Tr k="backend.title" />
          </h2>
          <p className="text-base sm:text-lg text-text-secondary">
            <Tr k="backend.subtitle" />
          </p>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-bg-surface shadow-2xl overflow-hidden">
          <div className="h-8 bg-bg-surface flex items-center justify-between px-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#5B9EFF]" />
              <span className="text-xs font-mono text-text-muted">DBeaver — ibrant_db</span>
            </div>
            <span className="text-xs font-mono text-[#22C58B]">PostgreSQL 18.6</span>
          </div>
          <div className="relative w-full aspect-[16/9] bg-bg-deep">
            <Image src="/images/database/db-schema.png" alt="PostgreSQL database schema" fill sizes="(max-width: 768px) 100vw, 1152px" className="object-cover" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
          {TECH.map((t) => (
            <span key={t} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#22C58B]/30 bg-[#22C58B]/10 text-xs sm:text-sm text-[#22C58B] font-mono">
              {t}
            </span>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link
            href="/courses"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-md bg-[#22C58B] px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-[#3FD9A2]"
          >
            <Tr k="backend.cta" /> <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
