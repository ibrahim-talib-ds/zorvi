import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, BarChart3, LayoutDashboard } from "lucide-react";

export function WebSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-4">
            Build For The Real World
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Build powerful web applications.
          </h2>
          <p className="text-lg text-[#B7BDD0]">
            Create professional dashboards, business platforms, and management systems with real data and real backend functionality.
          </p>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-[#171B33] shadow-2xl overflow-hidden">
          <div className="h-8 bg-[#151A2D] flex items-center px-4 gap-2 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-[#F05D70]" />
            <div className="w-3 h-3 rounded-full bg-[#F5A623]" />
            <div className="w-3 h-3 rounded-full bg-[#22C58B]" />
            <span className="ml-4 text-xs font-mono text-[#7A8199]">zorvi-academy-dashboard</span>
          </div>
          <div className="relative w-full aspect-[16/9] bg-[#0B0F1D]">
            <Image src="/images/hero/dashboard.png" alt="EduSmart Web Dashboard" fill className="object-cover" priority />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            { icon: LayoutDashboard, label: "Smart administration" },
            { icon: BarChart3, label: "Real-time data management" },
            { icon: Shield, label: "Business-ready reporting" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <item.icon size={18} className="text-[#A78BFA]" />
              <span className="text-sm text-[#B7BDD0]">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-md bg-[#7559E8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8B70FF]"
          >
            Explore Web Projects <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
