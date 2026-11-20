import { Brain, Palette, Layers, Database, Bug, Rocket } from "lucide-react";

const OUTCOMES = [
  { icon: Brain, title: "Think like an engineer", desc: "Understand requirements, architecture, and technical decisions." },
  { icon: Palette, title: "Design like a product builder", desc: "Create interfaces that solve real user problems." },
  { icon: Layers, title: "Build complete systems", desc: "Connect frontend, backend, and database." },
  { icon: Database, title: "Work with real data", desc: "Design schemas, queries, and application workflows." },
  { icon: Bug, title: "Solve real problems", desc: "Debug, test, and improve your software." },
  { icon: Rocket, title: "Launch with confidence", desc: "Prepare and deploy complete applications." },
];

export function OutcomesSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#22C58B] mb-4">
            Skills That Turn Into Capabilities
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Go beyond writing code.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {OUTCOMES.map((o) => (
            <div
              key={o.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition"
            >
              <o.icon size={24} className="text-[#A78BFA] mb-4" />
              <h3 className="font-display text-lg font-bold text-white mb-2">{o.title}</h3>
              <p className="text-sm text-[#B7BDD0] leading-relaxed">{o.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
