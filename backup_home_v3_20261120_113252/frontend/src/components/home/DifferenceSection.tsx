const REASONS = [
  { n: "01", title: "Complete projects", desc: "Learn how all parts of a real application fit together." },
  { n: "02", title: "Structured learning", desc: "Follow an understandable path from beginner concepts to advanced implementation." },
  { n: "03", title: "Practical engineering", desc: "Work with real code, APIs, databases, and deployment workflows." },
  { n: "04", title: "Products you can explore", desc: "See actual software projects and understand how they are built." },
];

export function DifferenceSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            A Better Way To Learn Technology
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Don&apos;t collect tutorials. Build experience.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.n} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <span className="font-mono text-xs text-[#A78BFA] mb-3 block">{r.n}</span>
              <h3 className="font-display text-xl font-bold text-white mb-2">{r.title}</h3>
              <p className="text-sm text-[#B7BDD0] leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
