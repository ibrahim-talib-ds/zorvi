import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, BarChart3, LayoutDashboard } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const FEATURES = [
  { icon: LayoutDashboard, labelKey: "web.feat1" },
  { icon: BarChart3, labelKey: "web.feat2" },
  { icon: Shield, labelKey: "web.feat3" },
];

export function WebSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-16 sm:py-20 lg:py-28 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3 sm:mb-4">
            <Tr k="web.eyebrow" />
          </p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
            <Tr k="web.title" />
          </h2>
          <p className="text-base sm:text-lg text-[#B7BDD0]">
            <Tr k="web.subtitle" />
          </p>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-[#171B33] shadow-2xl overflow-hidden">
          <div className="h-8 bg-[#151A2D] flex items-center px-4 gap-2 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-[#F05D70]" />
            <div className="w-3 h-3 rounded-full bg-[#F5A623]" />
            <div className="w-3 h-3 rounded-full bg-[#22C58B]" />
            <span className="ml-4 text-xs font-mono text-[#7A8199]">ibrant-academy-dashboard</span>
          </div>
          <div className="relative w-full aspect-[16/9] bg-[#0B0F1D]">
            <Image src="/images/hero/dashboard.png" alt="IBRANT Web Dashboard" fill sizes="(max-width: 768px) 100vw, 1152px" className="object-cover" priority />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {FEATURES.map((item) => (
            <div key={item.labelKey} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <item.icon size={18} className="text-[#A78BFA] flex-shrink-0" />
              <span className="text-sm text-[#B7BDD0]"><Tr k={item.labelKey} /></span>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link
            href="/marketplace"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-md bg-[#7559E8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8B70FF]"
          >
            <Tr k="web.cta" /> <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
