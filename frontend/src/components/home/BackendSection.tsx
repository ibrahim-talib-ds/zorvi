import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TECH = [
  "Python",
  "FastAPI",
  "PostgreSQL",
  "SQLAlchemy",
  "Docker",
];

export function BackendSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#22C58B] mb-4">
            Powerful Under The Hood
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Real backend. Real database. Real functionality.
          </h2>
          <p className="text-lg text-[#B7BDD0]">
            Understand what happens behind the interface. Design database structures, create APIs, manage authentication, and build reliable application services.
          </p>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-[#171B33] shadow-2xl overflow-hidden">
          <div className="h-8 bg-[#151A2D] flex items-center justify-between px-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#5B9EFF]" />
              <span className="text-xs font-mono text-[#7A8199]">DBeaver — zorvi_db</span>
            </div>
            <span className="text-xs font-mono text-[#22C58B]">PostgreSQL 18.6</span>
          </div>
          <div className="relative w-full aspect-[16/9] bg-[#0B0F1D]">
            <Image src="/images/database/db-schema.png" alt="PostgreSQL database schema" fill className="object-cover" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {TECH.map((t) => (
            <span key={t} className="px-4 py-2 rounded-full border border-[#22C58B]/30 bg-[#22C58B]/10 text-sm text-[#22C58B] font-mono">
              {t}
            </span>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-md bg-[#22C58B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3FD9A2]"
          >
            Explore Backend Development <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
