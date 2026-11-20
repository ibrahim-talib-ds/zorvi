import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

export function FinalCTASection() {
  return (
    <section className="relative bg-bg-deep py-12 sm:py-14 lg:py-20 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7559E8]/20 blur-[120px] rounded-full" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <h2 className="font-display text-[2rem] sm:text-5xl lg:text-6xl font-extrabold text-text-primary mb-5 sm:mb-6 leading-tight">
          <Tr k="cta.title" />
        </h2>
        <p className="text-base sm:text-base lg:text-lg text-text-secondary mb-8 sm:mb-10 max-w-xl mx-auto">
          <Tr k="cta.subtitle" />
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
          <Link
            href="/courses"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#7559E8] px-8 py-3.5 text-sm font-semibold text-text-primary transition-all hover:bg-[#8B70FF] hover:shadow-[0_0_24px_rgba(139,112,255,0.4)]"
          >
            <Tr k="cta.start" />
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-text-primary transition-all hover:bg-white/10"
          >
            <Tr k="home.btn_projects" />
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-text-muted font-mono">
          <Tr k="cta.tagline" />
        </p>
      </div>
    </section>
  );
}
