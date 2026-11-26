import { ArrowUpRight, BookOpen, Braces, Database, Server } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

const guides = [
  { id: "backend", icon: Server, title: "Build an API with FastAPI", description: "Start with routes, request validation, dependency injection, and automatic API documentation.", href: "https://fastapi.tiangolo.com/tutorial/", label: "FastAPI tutorial" },
  { id: "frontend", icon: Braces, title: "Build interfaces with Next.js", description: "Learn App Router fundamentals, layouts, server components, navigation, and data fetching.", href: "https://nextjs.org/learn", label: "Next.js learning path" },
  { id: "database", icon: Database, title: "Learn relational databases", description: "Work through SQL fundamentals, joins, constraints, indexes, and relational data modeling.", href: "https://www.postgresql.org/docs/current/tutorial.html", label: "PostgreSQL tutorial" },
];

export const metadata = { title: "Developer Guides", description: "Curated official learning resources for FastAPI, Next.js, PostgreSQL, and application security." };

export default function GuidesPage() {
  return (
    <PublicInfoPage eyebrow="Learn by building" title="Developer learning guides" description="A curated starting point for the technologies used in modern full-stack applications. Follow the official references, then practise what you learn in the IBRANT Academy and Playground.">
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map(({ id, icon: Icon, title, description, href, label }) => (
          <article id={id} key={id} className="flex flex-col rounded-2xl border border-bg-border bg-bg-elevated/55 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Icon size={20} /></div>
            <h2 className="mt-5">{title}</h2>
            <p className="mt-2 flex-1">{description}</p>
            <a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">{label} <ArrowUpRight size={15} /></a>
          </article>
        ))}
      </div>
      <div id="authentication" className="mt-6 rounded-2xl border border-bg-border p-5">
        <h2>Authentication and application security</h2>
        <p className="mt-2">When building an application, keep secrets on the server, validate every incoming request, enforce authorization on the backend, and never treat a hidden frontend control as a security boundary. Start with the <a href="https://fastapi.tiangolo.com/tutorial/security/" target="_blank" rel="noreferrer">FastAPI security guide</a>.</p>
      </div>
    </PublicInfoPage>
  );
}
