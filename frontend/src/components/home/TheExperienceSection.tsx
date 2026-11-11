import Link from "next/link";
import { ArrowRight, BookOpen, Store, Rocket } from "lucide-react";

const CARDS = [
  {
    icon: BookOpen,
    eyebrow: "ZORVI Academy",
    title: "Learn by building. Not just watching.",
    description:
      "Follow complete, structured project journeys. Understand how frontend, backend, databases, and deployment work together.",
    cta: "Explore Academy",
    href: "/courses",
    accent: "from-[#7559E8]/20 to-transparent",
    iconColor: "text-[#A78BFA]",
    borderHover: "hover:border-[#7559E8]/40",
  },
  {
    icon: Store,
    eyebrow: "Project Marketplace",
    title: "Discover software. Find your next opportunity.",
    description:
      "Explore complete software products, inspect their capabilities, and purchase source code with documentation and licensing options.",
    cta: "Explore Projects",
    href: "/marketplace",
    accent: "from-[#5B9EFF]/20 to-transparent",
    iconColor: "text-[#5B9EFF]",
    borderHover: "hover:border-[#5B9EFF]/40",
  },
  {
    icon: Rocket,
    eyebrow: "Build Your Own Product",
    title: "Your idea. Your architecture. Your product.",
    description:
      "Move from concept to UI design, database architecture, backend development, frontend integration, testing, and deployment.",
    cta: "Start Building",
    href: "/courses",
    accent: "from-[#22C58B]/20 to-transparent",
    iconColor: "text-[#22C58B]",
    borderHover: "hover:border-[#22C58B]/40",
  },
];

export function TheExperienceSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            More Than Just Learning
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Everything you need to build your next big idea.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.eyebrow}
              href={card.href}
              className={`group flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] ${card.borderHover}`}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.accent} flex items-center justify-center mb-6`}>
                <card.icon size={22} className={card.iconColor} />
              </div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199] mb-3">
                {card.eyebrow}
              </p>
              <h3 className="font-display text-xl font-bold text-white mb-3 leading-snug">
                {card.title}
              </h3>
              <p className="text-sm text-[#B7BDD0] leading-relaxed flex-1 mb-6">
                {card.description}
              </p>
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${card.iconColor}`}>
                {card.cta} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
