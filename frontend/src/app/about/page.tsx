import Link from "next/link";
import {
  ArrowRight, Target, Sparkles, Code2, Users, Globe, Heart,
  BookOpen, Rocket, Award,
} from "lucide-react";

export const metadata = {
  title: "About — ZORVI",
  description: "Learn. Create. Launch. The story behind ZORVI — a project-based academy and marketplace.",
};

const VALUES = [
  {
    icon: Code2,
    color: "text-[#A78BFA]",
    bg: "bg-[#7559E8]/15",
    title: "Learn by building",
    desc: "No passive videos. Every course is a project you build from scratch — real code, real architecture, real deployment.",
  },
  {
    icon: Target,
    color: "text-[#5B9EFF]",
    bg: "bg-[#5B9EFF]/15",
    title: "Real-world focus",
    desc: "Every lesson teaches what you'll actually do on the job: debug live systems, ship features, handle production issues.",
  },
  {
    icon: Users,
    color: "text-[#22C58B]",
    bg: "bg-[#22C58B]/15",
    title: "Accessible to all",
    desc: "Complete courses, certificates, and lesson materials are free forever. Learning shouldn't be gated by money.",
  },
  {
    icon: Sparkles,
    color: "text-[#F5A623]",
    bg: "bg-[#F5A623]/15",
    title: "Ship finished products",
    desc: "Every project is portfolio-ready. Finish with an app you can sell, deploy to a client, or use as a business.",
  },
];

const STATS = [
  { value: "3+", label: "Complete courses" },
  { value: "5+", label: "Real projects in marketplace" },
  { value: "44", label: "Automated tests" },
  { value: "100%", label: "Free learning" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/30 bg-[#7559E8]/10 px-4 py-1.5 mb-6">
            <Heart size={14} className="text-[#A78BFA]" />
            <span className="text-xs font-mono tracking-wider text-[#A78BFA] uppercase">
              Our story
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            Learning should produce{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B70FF] to-[#A78BFA]">
              real products.
            </span>
          </h1>

          <p className="text-lg text-[#B7BDD0] max-w-3xl mx-auto leading-relaxed">
            ZORVI was built on one idea: people don&apos;t need more tutorials —
            they need to build things that work. Every course ends with a
            complete, deployable application. Every project you build is
            something you can be proud of.
          </p>
        </section>

        {/* Stats */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-4xl lg:text-5xl font-extrabold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#7A8199]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3">
                Our mission
              </p>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight">
                Make world-class software education accessible to everyone.
              </h2>
            </div>
            <div className="space-y-4 text-[#B7BDD0] leading-relaxed">
              <p>
                Traditional tech education is broken. Either it&apos;s a $10,000
                bootcamp that leaves you in debt, or it&apos;s endless YouTube
                videos that teach syntax but not the craft.
              </p>
              <p>
                We build a third path: structured, project-based courses that
                mirror how real engineering teams work. Free to access. Taught
                by people who&apos;ve actually shipped software.
              </p>
              <p>
                Our students don&apos;t just finish courses. They finish with
                working applications, a portfolio, and the confidence to build
                their own ideas.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3">
                What we believe
              </p>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-4">
                Four principles behind everything we build.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition"
                >
                  <div className={`w-12 h-12 rounded-lg ${v.bg} flex items-center justify-center mb-4`}>
                    <v.icon size={22} className={v.color} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-[#B7BDD0] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What ZORVI offers */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3">
              Two parts, one platform
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Academy + Marketplace
            </h2>
            <p className="text-[#B7BDD0] max-w-2xl mx-auto">
              Learn to build complete software — or buy one that&apos;s already built.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#7559E8]/30 bg-gradient-to-br from-[#7559E8]/10 to-transparent p-8">
              <div className="w-14 h-14 rounded-xl bg-[#7559E8]/20 flex items-center justify-center mb-5">
                <BookOpen size={26} className="text-[#A78BFA]" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                ZORVI Academy
              </h3>
              <p className="text-[#B7BDD0] mb-5 leading-relaxed">
                Free, project-based courses that teach you to build real
                applications from scratch. Flutter, FastAPI, PostgreSQL, and
                modern software engineering.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#A78BFA] hover:text-white transition"
              >
                Browse courses <ArrowRight size={14} />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#F5A623]/30 bg-gradient-to-br from-[#F5A623]/10 to-transparent p-8">
              <div className="w-14 h-14 rounded-xl bg-[#F5A623]/20 flex items-center justify-center mb-5">
                <Rocket size={26} className="text-[#F5A623]" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Project Marketplace
              </h3>
              <p className="text-[#B7BDD0] mb-5 leading-relaxed">
                Production-ready software you can buy and deploy today.
                Complete source code, documentation, and optional support.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5A623] hover:text-white transition"
              >
                Explore marketplace <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-[#7559E8]/20 border-2 border-[#7559E8]/40 flex items-center justify-center mx-auto mb-6">
              <span className="font-display text-3xl font-extrabold text-[#A78BFA]">
                IT
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Built by Ibrahim Talib
            </h2>
            <p className="text-sm text-[#7A8199] mb-6">
              Software engineer · Full-stack developer · Educator
            </p>
            <p className="text-[#B7BDD0] max-w-2xl mx-auto leading-relaxed">
              ZORVI is a platform I wish I had when I started learning to code.
              I built this to give the next generation of developers the path
              I had to figure out alone — with real projects, real code, and
              real outcomes.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-white mb-4">
            Ready to start building?
          </h2>
          <p className="text-lg text-[#B7BDD0] mb-8 max-w-2xl mx-auto">
            Every course is free. Every project teaches you real skills.
            Start today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              <BookOpen size={16} /> Explore Courses
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              <Rocket size={16} /> Browse Marketplace
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
