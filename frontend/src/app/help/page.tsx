import { ArrowUpRight, BookOpen, CreditCard, GraduationCap, LifeBuoy, PackageCheck } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

const questions = [
  { icon: GraduationCap, title: "Where can I find my courses?", answer: "Sign in and open My Courses from your account dashboard. Your available learning content and progress are shown there." },
  { icon: PackageCheck, title: "What should I check before buying a project?", answer: "Read the product description, included files, requirements, license terms, and seller details before placing an order. Contact the seller if something is unclear." },
  { icon: CreditCard, title: "Which payment methods are available?", answer: "The payment methods available for your purchase are displayed during checkout. Options can vary by product and region." },
  { icon: BookOpen, title: "Where can I find technical learning material?", answer: "Visit the Guides and Documentation pages for curated references, or browse the Academy for structured courses." },
];

export const metadata = { title: "Help Center", description: "Answers to common questions about IBRANT courses, marketplace purchases, and account access." };

export default function HelpPage() {
  return (
    <PublicInfoPage eyebrow="Support" title="Help center" description="Quick answers to common questions about learning, buying, and using the IBRANT platform.">
      <div className="space-y-3">
        {questions.map(({ icon: Icon, title, answer }) => (
          <details key={title} className="group rounded-2xl border border-bg-border bg-bg-elevated/45 p-5 open:border-[#7559E8]/40 open:bg-bg-elevated/75">
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-text-primary marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Icon size={18} /></span>
              <span className="flex-1">{title}</span>
              <span aria-hidden="true" className="text-lg text-text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="ml-12 mt-3">{answer}</p>
          </details>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-bg-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><LifeBuoy className="text-[#A78BFA]" size={21} /><div><h2>Still need help?</h2><p className="mt-1">Send the support team the details of your issue.</p></div></div>
        <a href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold">Contact support <ArrowUpRight size={15} /></a>
      </div>
    </PublicInfoPage>
  );
}
