import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const GROUPS = [
  {
    titleKey: "tech.g1_title",
    descKey: "tech.g1_desc",
    color: "text-[#A78BFA]",
    border: "border-[#7559E8]/30",
    bg: "bg-[#7559E8]/10",
    items: ["Flutter", "Dart", "React", "Next.js", "TypeScript"],
  },
  {
    titleKey: "tech.g2_title",
    descKey: "tech.g2_desc",
    color: "text-[#22C58B]",
    border: "border-[#22C58B]/30",
    bg: "bg-[#22C58B]/10",
    items: ["Python", "FastAPI", "REST APIs"],
  },
  {
    titleKey: "tech.g3_title",
    descKey: "tech.g3_desc",
    color: "text-[#5B9EFF]",
    border: "border-[#5B9EFF]/30",
    bg: "bg-[#5B9EFF]/10",
    items: ["PostgreSQL", "SQL", "Database design"],
  },
  {
    titleKey: "tech.g4_title",
    descKey: "tech.g4_desc",
    color: "text-[#F5A623]",
    border: "border-[#F5A623]/30",
    bg: "bg-[#F5A623]/10",
    items: ["Git & GitHub", "Docker", "Testing", "Deployment"],
  },
];

export function TechEcosystemSection() {
  return (
    <section className="relative bg-bg-deep py-12 sm:py-14 lg:py-20 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3 sm:mb-4">
            <Tr k="tech.eyebrow" />
          </p>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">
            <Tr k="tech.title" />
          </h2>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <div key={group.titleKey} className={"rounded-2xl border " + group.border + " " + group.bg + " p-4 sm:p-5"}>
              <h3 className={"font-display text-lg font-bold " + group.color + " mb-2"}>
                <Tr k={group.titleKey} />
              </h3>
              <p className="text-xs text-text-secondary mb-4"><Tr k={group.descKey} /></p>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="text-sm text-white/90 font-mono">
                    &middot; {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Link
            href="/courses"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-md border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-white/10"
          >
            <Tr k="tech.cta" /> <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
