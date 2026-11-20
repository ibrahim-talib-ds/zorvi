import { Tr } from "@/components/i18n/Tr";

const REASONS = [
  { n: "01", titleKey: "diff.r1_title", descKey: "diff.r1_desc" },
  { n: "02", titleKey: "diff.r2_title", descKey: "diff.r2_desc" },
  { n: "03", titleKey: "diff.r3_title", descKey: "diff.r3_desc" },
  { n: "04", titleKey: "diff.r4_title", descKey: "diff.r4_desc" },
];

export function DifferenceSection() {
  return (
    <section className="relative bg-bg-deep py-12 sm:py-14 lg:py-20 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3 sm:mb-4">
            <Tr k="diff.eyebrow" />
          </p>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">
            <Tr k="diff.title" />
          </h2>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.n} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 lg:p-6">
              <span className="font-mono text-xs text-[#A78BFA] mb-2 sm:mb-3 block">{r.n}</span>
              <h3 className="font-display text-lg sm:text-lg lg:text-xl font-bold text-text-primary mb-2"><Tr k={r.titleKey} /></h3>
              <p className="text-sm text-text-secondary leading-relaxed"><Tr k={r.descKey} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
