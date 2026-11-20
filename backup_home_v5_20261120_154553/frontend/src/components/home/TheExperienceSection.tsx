import Link from "next/link";
import { ArrowRight, BookOpen, Store, Rocket } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const CARDS = [
  {
    icon: BookOpen,
    eyebrowKey: "exp.c1_eyebrow",
    titleKey: "exp.c1_title",
    descKey: "exp.c1_desc",
    ctaKey: "exp.c1_cta",
    href: "/courses",
    accent: "from-[#7559E8]/20 to-transparent",
    iconColor: "text-[#A78BFA]",
    borderHover: "hover:border-[#7559E8]/40",
  },
  {
    icon: Store,
    eyebrowKey: "exp.c2_eyebrow",
    titleKey: "exp.c2_title",
    descKey: "exp.c2_desc",
    ctaKey: "home.btn_projects",
    href: "/marketplace",
    accent: "from-[#5B9EFF]/20 to-transparent",
    iconColor: "text-[#5B9EFF]",
    borderHover: "hover:border-[#5B9EFF]/40",
  },
  {
    icon: Rocket,
    eyebrowKey: "exp.c3_eyebrow",
    titleKey: "exp.c3_title",
    descKey: "exp.c3_desc",
    ctaKey: "exp.c3_cta",
    href: "/courses",
    accent: "from-[#22C58B]/20 to-transparent",
    iconColor: "text-[#22C58B]",
    borderHover: "hover:border-[#22C58B]/40",
  },
];

export function TheExperienceSection() {
  return (
    <section className="relative bg-bg-deep py-16 sm:py-20 lg:py-28 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3 sm:mb-4">
            <Tr k="exp.eyebrow" />
          </p>
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary mb-2 leading-tight">
            <Tr k="exp.title" />
          </h2>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.eyebrowKey}
              href={card.href}
              className={"group flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 transition-all hover:bg-white/[0.04] " + card.borderHover}
            >
              <div className={"w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br " + card.accent + " flex items-center justify-center mb-5 sm:mb-6"}>
                <card.icon size={22} className={card.iconColor} />
              </div>
              <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-text-muted mb-2 sm:mb-3">
                <Tr k={card.eyebrowKey} />
              </p>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text-primary mb-2 sm:mb-3 leading-snug">
                <Tr k={card.titleKey} />
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-5 sm:mb-6">
                <Tr k={card.descKey} />
              </p>
              <span className={"inline-flex items-center gap-1 text-sm font-medium " + card.iconColor}>
                <Tr k={card.ctaKey} /> <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
