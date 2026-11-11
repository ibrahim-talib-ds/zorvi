import Link from "next/link";
import {
  Check, ArrowRight, Sparkles, BookOpen, Zap, Award, Building2, HelpCircle,
} from "lucide-react";

export const metadata = {
  title: "Pricing — ZORVI",
  description: "Free access to all courses and premium project marketplace. Learn. Build. Launch.",
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Start learning today",
    price: "$0",
    period: "forever",
    icon: BookOpen,
    iconColor: "text-[#5B9EFF]",
    bg: "bg-[#5B9EFF]/10",
    border: "border-[#5B9EFF]/30",
    features: [
      "Access to all free courses",
      "Full lesson videos and content",
      "Practice exercises",
      "Progress tracking",
      "Community discussions",
      "Certificate on completion",
    ],
    cta: "Get Started",
    href: "/register",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious learners",
    price: "$19",
    period: "per month",
    icon: Zap,
    iconColor: "text-[#A78BFA]",
    bg: "bg-[#7559E8]/15",
    border: "border-[#7559E8]/40",
    features: [
      "Everything in Free, plus:",
      "Early access to new courses",
      "Priority support response",
      "Downloadable resources",
      "Advanced project tutorials",
      "Exclusive community channels",
      "10% off marketplace purchases",
    ],
    cta: "Coming Soon",
    href: "#",
    highlight: true,
    badge: "Popular",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "For professionals",
    price: "$49",
    period: "per month",
    icon: Award,
    iconColor: "text-[#F5A623]",
    bg: "bg-[#F5A623]/10",
    border: "border-[#F5A623]/30",
    features: [
      "Everything in Pro, plus:",
      "1-on-1 mentorship sessions",
      "Code review on your projects",
      "Career guidance",
      "Advanced certification",
      "Portfolio review",
      "20% off marketplace purchases",
    ],
    cta: "Coming Soon",
    href: "#",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Is ZORVI really free to start?",
    a: "Yes. Every course is free to enroll and complete. You get full access to lessons, videos, exercises, and certificates at no cost. Paid tiers will add premium features like mentorship and early access — but core learning stays free.",
  },
  {
    q: "Do I need to pay to earn a certificate?",
    a: "No. Complete any course 100% and a certificate is auto-issued. Every certificate has a unique verification code and can be printed or shared.",
  },
  {
    q: "What's included in the marketplace?",
    a: "The marketplace sells complete, production-ready projects: Food Delivery System, EduSmart, Credit Risk Predictor, and more. Each comes with source code, documentation, and optional support. Prices start at $100.",
  },
  {
    q: "Can I get a refund?",
    a: "Digital products on the marketplace are non-refundable after download, but we handle each case individually. Contact support within 7 days if something doesn't work.",
  },
  {
    q: "Do you offer institutional plans?",
    a: "Yes — for schools, universities, and companies. Contact us at support@zorvi.com for details on group licensing, custom content, and dedicated support.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime from your account settings. Your access continues until the end of your billing period, then drops to the free tier automatically.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-[#0B0F1D]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#7559E8]/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7559E8]/30 bg-[#7559E8]/10 px-4 py-1.5 mb-6">
            <Sparkles size={14} className="text-[#A78BFA]" />
            <span className="text-xs font-mono tracking-wider text-[#A78BFA] uppercase">
              Simple pricing
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            Start free.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B70FF] to-[#A78BFA]">
              Go pro when ready.
            </span>
          </h1>
          <p className="text-lg text-[#B7BDD0] max-w-2xl mx-auto">
            All courses are free forever. Premium tiers unlock mentorship,
            early access, and exclusive resources. No credit card required to start.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3 mb-20">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${plan.border} bg-white/[0.02] p-7 flex flex-col ${
                  plan.highlight ? "ring-2 ring-[#7559E8]/40 shadow-2xl shadow-[#7559E8]/10" : ""
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-[10px] font-bold uppercase tracking-wider text-white">
                    {plan.badge}
                  </span>
                )}

                <div className={`w-12 h-12 rounded-lg ${plan.bg} flex items-center justify-center mb-5`}>
                  <Icon size={22} className={plan.iconColor} />
                </div>

                <h3 className="font-display text-2xl font-bold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-[#7A8199] mb-6">{plan.tagline}</p>

                <div className="mb-6">
                  <span className="font-display text-5xl font-extrabold text-white">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#7A8199] ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check
                        size={16}
                        className={`flex-shrink-0 mt-0.5 ${plan.iconColor}`}
                      />
                      <span className="text-[#B7BDD0]">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.href === "#" ? (
                  <button
                    disabled
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#7A8199] cursor-not-allowed"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <Link
                    href={plan.href}
                    className={`w-full rounded-lg px-5 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? "bg-gradient-to-r from-[#7559E8] to-[#8B70FF] text-white hover:brightness-110"
                        : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {plan.cta} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Institutional CTA */}
        <div className="rounded-2xl border border-[#22C58B]/30 bg-[#22C58B]/5 p-8 mb-20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#22C58B]/15 border border-[#22C58B]/30 flex items-center justify-center flex-shrink-0">
              <Building2 size={26} className="text-[#22C58B]" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-white mb-1">
                Institutions, schools, and teams
              </h3>
              <p className="text-sm text-[#B7BDD0]">
                Group licenses, custom content, dedicated support, and SSO.
                Contact us for a custom quote.
              </p>
            </div>
            <Link
              href="/contact"
              className="rounded-lg bg-[#22C58B] px-5 py-2.5 text-sm font-semibold text-[#0B0F1D] hover:bg-[#3FD9A2] transition whitespace-nowrap"
            >
              Contact Sales
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-4">
              <HelpCircle size={14} className="text-[#A78BFA]" />
              <span className="text-xs font-mono tracking-wider text-[#A78BFA] uppercase">
                Questions
              </span>
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Frequently asked questions
            </h2>
            <p className="text-[#B7BDD0]">
              Everything you need to know about pricing and access.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition"
              >
                <summary className="cursor-pointer flex items-center justify-between gap-4 text-white font-medium">
                  <span>{item.q}</span>
                  <span className="text-[#7A8199] group-open:rotate-180 transition-transform flex-shrink-0">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[#B7BDD0] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-[#B7BDD0] mb-4">Still have questions?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
          >
            Get in touch <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
