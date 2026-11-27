import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Rocket } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

const steps = [
  { number: "01", icon: BookOpen, title: "Learn the foundations", text: "Follow structured courses, work through practical examples, and track your progress from your account.", href: "/courses", action: "Explore the academy" },
  { number: "02", icon: Code2, title: "Build and experiment", text: "Practise concepts in the coding workspace and turn lessons into projects you can develop further.", href: "/build", action: "Start building" },
  { number: "03", icon: Rocket, title: "Launch with confidence", text: "Study real project structures, explore marketplace products, and use what you learn in your own work.", href: "/marketplace", action: "Explore the marketplace" },
];

export const metadata = { title: "How ibrant Works", description: "Discover how ibrant connects practical software education, hands-on coding, and digital projects." };

export default function HowItWorksPage() {
  return (
    <PublicInfoPage eyebrow="The ibrant experience" title="Learn. Create. Launch." description="One platform that connects practical software education, hands-on coding, and a marketplace for real-world digital projects.">
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map(({ number, icon: Icon, title, text, href, action }) => (
          <article key={number} className="rounded-2xl border border-bg-border bg-bg-elevated/55 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.2em] text-[#A78BFA]">{number}</span><Icon size={21} className="text-[#A78BFA]" /></div>
            <h2 className="mt-6">{title}</h2>
            <p className="mt-2">{text}</p>
            <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-[#A78BFA]">{action} <ArrowRight size={15} /></Link>
          </article>
        ))}
      </div>
    </PublicInfoPage>
  );
}
