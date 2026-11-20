import { Brain, Palette, Layers, Database, Bug, Rocket } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const OUTCOMES = [
  { icon: Brain, titleKey: "outcomes.o1_title", descKey: "outcomes.o1_desc" },
  { icon: Palette, titleKey: "outcomes.o2_title", descKey: "outcomes.o2_desc" },
  { icon: Layers, titleKey: "outcomes.o3_title", descKey: "outcomes.o3_desc" },
  { icon: Database, titleKey: "outcomes.o4_title", descKey: "outcomes.o4_desc" },
  { icon: Bug, titleKey: "outcomes.o5_title", descKey: "outcomes.o5_desc" },
  { icon: Rocket, titleKey: "outcomes.o6_title", descKey: "outcomes.o6_desc" },
];

export function OutcomesSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-16 sm:py-20 lg:py-28 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#22C58B] mb-3 sm:mb-4">
            <Tr k="outcomes.eyebrow" />
          </p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            <Tr k="outcomes.title" />
          </h2>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OUTCOMES.map((o) => (
            <div
              key={o.titleKey}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6 hover:bg-white/[0.04] hover:border-white/10 transition"
            >
              <o.icon size={22} className="text-[#A78BFA] mb-3 sm:mb-4" />
              <h3 className="font-display text-base sm:text-lg font-bold text-white mb-2"><Tr k={o.titleKey} /></h3>
              <p className="text-sm text-[#B7BDD0] leading-relaxed"><Tr k={o.descKey} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
