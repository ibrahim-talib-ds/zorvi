import { ArrowUpRight, Code2, Database, Globe2, Smartphone } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

const stack = [
  { icon: Globe2, name: "Next.js and React", role: "Web application", detail: "Component-driven interfaces, routing, rendering, and responsive user experiences.", href: "https://nextjs.org/docs" },
  { icon: Code2, name: "Python and FastAPI", role: "Backend services", detail: "Typed API schemas, asynchronous request handling, and generated API documentation.", href: "https://fastapi.tiangolo.com/" },
  { icon: Database, name: "PostgreSQL", role: "Data layer", detail: "Relational data, constraints, indexing, and transactional persistence.", href: "https://www.postgresql.org/docs/" },
  { icon: Smartphone, name: "Flutter", role: "Mobile development", detail: "Cross-platform application development from a shared codebase.", href: "https://docs.flutter.dev/" },
];

export const metadata = { title: "Technologies", description: "Explore the modern web, backend, database, and mobile technologies featured across IBRANT." };

export default function TechnologiesPage() {
  return (
    <PublicInfoPage eyebrow="Technology" title="Built around modern tools" description="IBRANT focuses on technologies that are widely used to design, build, and operate modern software products.">
      <div className="grid gap-4 sm:grid-cols-2">
        {stack.map(({ icon: Icon, name, role, detail, href }) => (
          <article key={name} className="rounded-2xl border border-bg-border bg-bg-elevated/55 p-5">
            <div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Icon size={19} /></div><span className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{role}</span></div>
            <h2 className="mt-4">{name}</h2>
            <p className="mt-2">{detail}</p>
            <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Official documentation <ArrowUpRight size={14} /></a>
          </article>
        ))}
      </div>
    </PublicInfoPage>
  );
}
