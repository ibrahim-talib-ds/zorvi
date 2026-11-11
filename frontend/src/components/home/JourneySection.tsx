import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STAGES = [
  { n: "01", title: "Discover", desc: "Define the problem and understand the requirements." },
  { n: "02", title: "Plan", desc: "Choose features, architecture, and project structure." },
  { n: "03", title: "Design", desc: "Create professional UI/UX and user journeys." },
  { n: "04", title: "Model", desc: "Design the database and relationships." },
  { n: "05", title: "Develop", desc: "Build the backend and frontend." },
  { n: "06", title: "Integrate", desc: "Connect APIs, authentication, and application data." },
  { n: "07", title: "Test", desc: "Find bugs, validate workflows, and improve reliability." },
  { n: "08", title: "Launch", desc: "Deploy your product and prepare it for real users." },
];

export function JourneySection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            From Idea To Launch
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Follow a real development process.
          </h2>
          <p className="text-lg text-[#B7BDD0]">
            Eight connected stages, from the first discovery to the final deployment.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAGES.map((stage, i) => (
            <div
              key={stage.n}
              className="relative rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-[#7559E8]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-[#A78BFA]">{stage.n}</span>
                {i < STAGES.length - 1 && (
                  <ArrowRight size={12} className="text-[#2A3150]" />
                )}
              </div>
              <h3 className="font-display font-bold text-white mb-1.5">{stage.title}</h3>
              <p className="text-xs text-[#B7BDD0] leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore the Learning Journey <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
