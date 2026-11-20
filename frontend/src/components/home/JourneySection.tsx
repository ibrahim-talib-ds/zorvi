import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const STAGES = [
  { n: "01", titleKey: "journey.s1_title", descKey: "journey.s1_desc" },
  { n: "02", titleKey: "journey.s2_title", descKey: "journey.s2_desc" },
  { n: "03", titleKey: "journey.s3_title", descKey: "journey.s3_desc" },
  { n: "04", titleKey: "journey.s4_title", descKey: "journey.s4_desc" },
  { n: "05", titleKey: "journey.s5_title", descKey: "journey.s5_desc" },
  { n: "06", titleKey: "journey.s6_title", descKey: "journey.s6_desc" },
  { n: "07", titleKey: "journey.s7_title", descKey: "journey.s7_desc" },
  { n: "08", titleKey: "journey.s8_title", descKey: "journey.s8_desc" },
];

export function JourneySection() {
  return (
    <section className="relative bg-[#0B0F1D] py-16 sm:py-20 lg:py-28 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3 sm:mb-4">
            <Tr k="journey.eyebrow" />
          </p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
            <Tr k="journey.title" />
          </h2>
          <p className="text-base sm:text-lg text-[#B7BDD0]">
            <Tr k="journey.subtitle" />
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STAGES.map((stage, i) => (
            <div
              key={stage.n}
              className="relative rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 hover:bg-white/[0.04] hover:border-[#7559E8]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="font-mono text-xs text-[#A78BFA]">{stage.n}</span>
                {i < STAGES.length - 1 && (
                  <ArrowRight size={12} className="text-[#2A3150] hidden sm:block" />
                )}
              </div>
              <h3 className="font-display font-bold text-white mb-1.5"><Tr k={stage.titleKey} /></h3>
              <p className="text-xs text-[#B7BDD0] leading-relaxed"><Tr k={stage.descKey} /></p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Link
            href="/courses"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-md border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Tr k="journey.cta" /> <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
