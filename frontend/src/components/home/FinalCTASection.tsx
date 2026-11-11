import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7559E8]/20 blur-[120px] rounded-full" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
          Your next great idea could start here.
        </h2>
        <p className="text-lg text-[#B7BDD0] mb-10 max-w-xl mx-auto">
          Whether you want to learn development, build your first application, or explore complete software products, ZORVI gives you a place to begin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/courses"
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-[#7559E8] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#8B70FF] hover:shadow-[0_0_24px_rgba(139,112,255,0.4)] w-full sm:w-auto"
          >
            Start Learning
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 w-full sm:w-auto"
          >
            Explore Projects
          </Link>
        </div>

        <p className="text-sm text-[#7A8199] font-mono">
          Learn. Create. Launch. Your journey starts with one idea.
        </p>
      </div>
    </section>
  );
}
