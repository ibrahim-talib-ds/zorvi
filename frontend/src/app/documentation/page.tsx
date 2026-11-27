import { BookOpen, Code2, Database, ExternalLink, KeyRound, Rocket } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

const resources = [
  { icon: Code2, title: "Backend API reference", description: "Explore the FastAPI endpoints and request/response schemas exposed by the backend.", href: "https://ibrant-api.onrender.com/docs", label: "Open API docs" },
  { icon: KeyRound, title: "Authentication concepts", description: "Understand token-based authentication, protected routes, and account access through the platform guides.", href: "/guides#authentication", label: "Read platform guides" },
  { icon: Database, title: "Data and architecture", description: "Review the technologies used across the ibrant learning platform and marketplace.", href: "/technologies", label: "Explore the stack" },
  { icon: Rocket, title: "Getting started", description: "Find the right path into the academy, marketplace, and browser-based coding workspace.", href: "/how-it-works", label: "How ibrant works" },
];

export const metadata = { title: "Documentation", description: "Technical references and platform guides for learners, creators, and developers using ibrant." };

export default function DocumentationPage() {
  return (
    <PublicInfoPage eyebrow="Developer resources" title="Documentation" description="Technical references and platform guides for learners, creators, and developers working with ibrant.">
      <div className="grid gap-4 sm:grid-cols-2">
        {resources.map(({ icon: Icon, title, description, href, label }) => (
          <article key={title} className="group rounded-2xl border border-bg-border bg-bg-elevated/55 p-5 transition hover:-translate-y-0.5 hover:border-[#7559E8]/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Icon size={19} /></div>
            <h2 className="mt-4">{title}</h2>
            <p className="mt-2">{description}</p>
            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">{label} <ExternalLink size={14} /></a>
          </article>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-bg-border p-5">
        <div className="flex items-center gap-2"><BookOpen size={18} className="text-[#A78BFA]" /><h2>Need a specific answer?</h2></div>
        <p className="mt-2">For account and product questions, visit the <a href="/help">Help Center</a>. For a technical issue, include the page URL, what you expected, and the error message when contacting <a href="/contact">support</a>.</p>
      </div>
    </PublicInfoPage>
  );
}
