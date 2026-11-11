import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-[#0B0F1D] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-[#7559E8]/15 blur-[120px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/30 bg-[#7559E8]/10 px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
          <span className="text-xs font-mono tracking-wider text-[#A78BFA] uppercase">
            Your Ideas Deserve to Become Real
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-white mb-6">
          Don&apos;t just learn technology.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B70FF] to-[#A78BFA]">
            Build something extraordinary.
          </span>
        </h1>

        <p className="text-lg text-[#B7BDD0] max-w-2xl mx-auto mb-10 leading-relaxed">
          Learn modern development, create complete software projects, and turn your ideas into products you can launch, showcase, or sell.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/courses"
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-[#7559E8] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#8B70FF] hover:shadow-[0_0_24px_rgba(139,112,255,0.4)] w-full sm:w-auto"
          >
            Explore the Academy
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 w-full sm:w-auto"
          >
            Explore Projects
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#7A8199]">
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#22C58B]" /> Complete full-stack projects</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#22C58B]" /> Real-world development skills</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#22C58B]" /> Production-focused learning</span>
        </div>

        <p className="mt-10 text-sm text-[#7A8199] font-mono">
          From your first idea to your first real product.
        </p>
      </div>
    </section>
  );
}
