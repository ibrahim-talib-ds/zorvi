import Link from "next/link";
import { ArrowRight } from "lucide-react";

const GROUPS = [
  {
    title: "Frontend",
    color: "text-[#A78BFA]",
    border: "border-[#7559E8]/30",
    bg: "bg-[#7559E8]/10",
    items: ["Flutter", "Dart", "React", "Next.js", "TypeScript"],
    desc: "The interfaces people see and use.",
  },
  {
    title: "Backend",
    color: "text-[#22C58B]",
    border: "border-[#22C58B]/30",
    bg: "bg-[#22C58B]/10",
    items: ["Python", "FastAPI", "REST APIs"],
    desc: "The logic that powers every request.",
  },
  {
    title: "Database",
    color: "text-[#5B9EFF]",
    border: "border-[#5B9EFF]/30",
    bg: "bg-[#5B9EFF]/10",
    items: ["PostgreSQL", "SQL", "Database design"],
    desc: "The structure that stores real data.",
  },
  {
    title: "Engineering & Deployment",
    color: "text-[#F5A623]",
    border: "border-[#F5A623]/30",
    bg: "bg-[#F5A623]/10",
    items: ["Git & GitHub", "Docker", "Testing", "Deployment"],
    desc: "The workflow that ships real products.",
  },
];

export function TechEcosystemSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            Master The Modern Stack
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Learn the technologies that power real products.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <div
              key={group.title}
              className={`rounded-2xl border ${group.border} ${group.bg} p-6`}
            >
              <h3 className={`font-display text-lg font-bold ${group.color} mb-2`}>
                {group.title}
              </h3>
              <p className="text-xs text-[#B7BDD0] mb-4">{group.desc}</p>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="text-sm text-white/90 font-mono">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore Technologies <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
