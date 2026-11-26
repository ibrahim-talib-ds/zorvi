"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowRight, BookOpen, Code2, FileCode2, FolderKanban,
  Loader2, Plus, RefreshCw, Rocket, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";

type TemplateId = "web" | "landing-page" | "python" | "blank";
interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  template: TemplateId;
  file_count: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
}

const TEMPLATES: { id: TemplateId; title: string; description: string; icon: typeof Code2; files: { path: string; content: string }[]; featured?: boolean }[] = [
  {
    id: "web", title: "Web application", description: "A working HTML, CSS and JavaScript project with a responsive layout and interactive starter screen.", icon: Code2, featured: true,
    files: [
      { path: "index.html", content: `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <meta name="description" content="A project built with IBRANT." />\n  <title>My IBRANT Project</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <main class="page">\n    <span class="eyebrow">YOUR BUILD STARTS HERE</span>\n    <h1>Turn your idea into something real.</h1>\n    <p>Edit this page, style it, and add your own interactions.</p>\n    <button id="action">Try the interaction</button>\n    <p id="result" class="result" aria-live="polite"></p>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n` },
      { path: "styles.css", content: `:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; color: #f8f8fc; background: radial-gradient(circle at 20% 10%, #30256d, #0b0f1d 52%); }\n.page { width: min(100%, 760px); padding: clamp(28px, 7vw, 64px); border: 1px solid #ffffff22; border-radius: 28px; background: #171b33cc; box-shadow: 0 24px 80px #0008; }\n.eyebrow { color: #b5a5ff; font-size: 12px; font-weight: 700; letter-spacing: .18em; }\nh1 { max-width: 620px; margin: 18px 0; font-size: clamp(38px, 7vw, 68px); line-height: 1.02; letter-spacing: -.05em; }\np { color: #c3c8da; font-size: 17px; line-height: 1.7; }\nbutton { margin-top: 16px; padding: 13px 20px; border: 0; border-radius: 12px; color: white; background: #7559e8; font-weight: 700; cursor: pointer; }\nbutton:hover { background: #8b70ff; }\n.result { min-height: 28px; color: #8fe0bf; }\n` },
      { path: "script.js", content: `const button = document.querySelector("#action");\nconst result = document.querySelector("#result");\nlet count = 0;\nbutton.addEventListener("click", () => {\n  count += 1;\n  result.textContent = \`You built an interaction. Clicks: \${count}\`;\n  console.log("Interaction count:", count);\n});\n` },
      { path: "README.md", content: `# My IBRANT Web Project\n\nStart by editing index.html, styles.css, and script.js in the IBRANT Build Workspace.\n\nThe live preview runs HTML, CSS, and JavaScript in a sandboxed browser frame. Download a ZIP at any time to continue in a local code editor.\n` },
    ],
  },
  {
    id: "landing-page", title: "Landing page", description: "A polished product landing-page starter with hero, feature cards, and a clear call to action.", icon: Sparkles,
    files: [
      { path: "index.html", content: `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Product Landing Page</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <header class="nav"><a class="brand" href="#top">NOVA</a><a class="nav-link" href="#features">Features</a></header>\n  <main id="top">\n    <section class="hero"><span class="pill">A BETTER WAY TO WORK</span><h1>Make room for your best ideas.</h1><p>A clear message, a useful product, and a simple next step. Make this page yours.</p><a class="cta" href="#features">Explore features</a></section>\n    <section id="features" class="features"><article role="button" tabindex="0" aria-pressed="false"><b>01</b><h2>Focus</h2><p>Remove friction from the work that matters.</p></article><article role="button" tabindex="0" aria-pressed="false"><b>02</b><h2>Create</h2><p>Turn the first draft into something useful.</p></article><article role="button" tabindex="0" aria-pressed="false"><b>03</b><h2>Grow</h2><p>Build a better experience with every iteration.</p></article></section>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n` },
      { path: "styles.css", content: `* { box-sizing: border-box; }\nbody { margin: 0; color: #f8f8fc; background: #0b0f1d; font-family: Inter, system-ui, sans-serif; }\n.nav { height: 76px; max-width: 1120px; margin: auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }\na { color: inherit; text-decoration: none; }.brand { font-weight: 900; letter-spacing: .12em; }.nav-link { color: #c0c5d8; font-size: 14px; }\n.hero { max-width: 1120px; margin: 50px auto 80px; padding: 90px 24px; text-align: center; background: radial-gradient(ellipse at center, #30256b, #0b0f1d 68%); }\n.pill { display: inline-block; padding: 8px 12px; border: 1px solid #8b70ff66; border-radius: 999px; color: #c4b5fd; font-size: 11px; font-weight: 700; letter-spacing: .12em; }\nh1 { max-width: 780px; margin: 22px auto; font-size: clamp(42px, 7vw, 76px); letter-spacing: -.055em; line-height: 1; }\n.hero p { max-width: 600px; margin: 0 auto 28px; color: #bbc2d7; font-size: 18px; line-height: 1.7; }.cta { display: inline-block; padding: 14px 22px; border-radius: 12px; background: #7559e8; font-weight: 700; }\n.features { max-width: 1120px; margin: 0 auto 80px; padding: 0 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }.features article { padding: 28px; border: 1px solid #ffffff18; border-radius: 18px; background: #171b33; cursor: pointer; transition: border-color .18s, transform .18s; }.features article.selected { border-color: #8b70ff; transform: translateY(-3px); }.features b { color: #a78bfa; }.features p { color: #aeb6cc; line-height: 1.6; }\n` },
      { path: "script.js", content: `document.querySelectorAll(".features article").forEach((card) => {\n  const activate = () => {\n    const selected = card.classList.toggle("selected");\n    card.setAttribute("aria-pressed", String(selected));\n  };\n  card.addEventListener("click", activate);\n  card.addEventListener("keydown", (event) => {\n    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); }\n  });\n});\n` },
      { path: "README.md", content: `# Landing page starter\n\nCustomize the copy in index.html and the visual system in styles.css.\n` },
    ],
  },
  {
    id: "python", title: "Python project", description: "A clean Python starter with a main entry point and a place for your own logic.", icon: FileCode2,
    files: [
      { path: "main.py", content: `def main():\n    print("Hello from your IBRANT project!")\n    # Replace this with your own project logic.\n\n\nif __name__ == "__main__":\n    main()\n` },
      { path: "README.md", content: `# Python project\n\nOpen main.py in the IBRANT Playground and run it with the Python WebAssembly runner.\n\nFor packages, services, databases, or a full Python application, download this project and continue in a local Python environment.\n` },
    ],
  },
  {
    id: "blank", title: "Blank project", description: "Start from an empty workspace and create your own file structure.", icon: FolderKanban,
    files: [{ path: "README.md", content: `# New project\n\nDescribe your idea and start adding files.\n` }],
  },
];

function prettyDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function projectApiError(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.detail === "string" && status !== 404) return parsed.detail;
  } catch { /* Keep non-JSON API errors readable. */ }
  if (status === 404) {
    return "The backend currently serving this site does not expose /api/v1/projects. The Build API route is present in the source code, but the running API is stale. Restart the IBRANT backend and refresh this page.";
  }
  return raw || `Request failed (HTTP ${status}).`;
}

export default function BuildPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("web");
  const [projectName, setProjectName] = useState("My first project");
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/projects`);
      if (!response.ok) throw new Error(projectApiError(response.status, await response.text()));
      setProjects(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your projects.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const createProject = async () => {
    if (!token || !projectName.trim()) return;
    const template = TEMPLATES.find((item) => item.id === selectedTemplate) ?? TEMPLATES[0];
    setCreating(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim() || template.description,
          template: template.id,
          files: template.files,
        }),
      });
      if (!response.ok) throw new Error(projectApiError(response.status, await response.text()));
      const project = await response.json();
      router.push(`/playground?project=${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create this project.");
      setCreating(false);
    }
  };

  const deleteProject = async (project: ProjectSummary) => {
    if (!token || !window.confirm(`Delete “${project.name}”? This removes its saved workspace files.`)) return;
    setDeletingId(project.id);
    try {
      const response = await fetchWithAuth(`${API_BASE}/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error(projectApiError(response.status, await response.text()));
      setProjects((items) => items.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this project.");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadProject = async (project: ProjectSummary) => {
    if (!token) return;
    setDownloadingId(project.id);
    setError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/projects/${project.id}/download`);
      if (!response.ok) throw new Error(projectApiError(response.status, await response.text()));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "ibrant-project"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download this project.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openCreate = (template: TemplateId = "web") => {
    const selected = TEMPLATES.find((item) => item.id === template) ?? TEMPLATES[0];
    setSelectedTemplate(template);
    setProjectName(template === "python" ? "My Python project" : template === "landing-page" ? "My landing page" : template === "blank" ? "Untitled project" : "My first project");
    setProjectDescription(selected.description);
    setShowCreate(true);
  };

  const filteredProjects = projects.filter((project) => `${project.name} ${project.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(ellipse_at_80%_0%,rgba(139,112,255,0.28),transparent_45%),linear-gradient(135deg,#1a1d3a,#0d1224_65%)] p-6 sm:p-9 lg:p-11">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A78BFA]/30 bg-[#7559E8]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B5FD]"><Rocket size={13} /> IBRANT Build Studio</span>
          <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">From lesson to working project.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C2C8DC] sm:text-base">Start with a template or open a project you already own. Your workspace saves to your IBRANT account, so you can return to the same code later.</p>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-[#929CBD]">Account projects store up to 50 text files (2 MB total); do not store credentials or environment secrets here. For larger purchased repositories, assets, or full-stack apps, extract the ZIP and use Open Folder in the Playground; server-side runtimes need a desktop development environment.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/build/ai" className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8B70FF]"><Sparkles size={17} /> Build with AI</Link>
            <button onClick={() => openCreate("web")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><Plus size={17} /> Start with a template</button>
            <Link href="/playground" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><Code2 size={16} /> Open code playground <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-10 hidden h-72 w-72 rounded-full border border-[#A78BFA]/15 xl:block"><div className="absolute inset-8 rounded-full border border-[#A78BFA]/15"><div className="absolute inset-8 rounded-full border border-[#A78BFA]/15" /></div></div>
      </section>

      {error && <div role="alert" className="mt-5 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/10 px-4 py-3 text-sm text-[#FF9AA6]">{error}</div>}

      <section className="mt-9">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A78BFA]">Your workspace</p><h2 className="mt-1 font-display text-2xl font-bold text-white">My projects <span className="ml-2 align-middle text-sm font-medium text-[#7A8199]">{projects.length}</span></h2></div>
          <div className="flex items-center gap-2">
            <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a project" className="w-48 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#7559E8]" /></label>
            <button onClick={() => void loadProjects()} disabled={loading} title="Refresh projects" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#B7BDD0] hover:bg-white/[0.07]"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>
        {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-white/5 bg-white/[0.025]" />)}</div> : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7559E8]/15 text-[#A78BFA]"><FolderKanban size={22} /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">{projects.length ? "No projects match that search" : "Your first project starts here"}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#929CBD]">{projects.length ? "Try a different project name." : "Choose a starter below and the workspace will create the files and open them in the code editor."}</p>
            <button onClick={() => openCreate("web")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF]"><Plus size={16} /> Create your first project</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <article key={project.id} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#7559E8]/40 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><FileCode2 size={19} /></span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#929CBD]">{project.template.replace("-", " ")}</span></div>
                <h3 className="mt-4 truncate font-display text-lg font-bold text-white">{project.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#929CBD]">{project.description || "No description added."}</p>
                <div className="mt-4 flex items-center gap-3 text-[11px] text-[#7A8199]"><span>{project.file_count} files</span><span>·</span><span>Updated {prettyDate(project.updated_at)}</span></div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
                  <button onClick={() => router.push(`/playground?project=${project.id}`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#7559E8] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#8B70FF]">Open workspace <ArrowRight size={14} /></button>
                  <button onClick={() => void downloadProject(project)} disabled={downloadingId === project.id} aria-label={`Download ${project.name} as ZIP`} title="Download ZIP" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#929CBD] transition hover:bg-white/5 hover:text-white disabled:opacity-50">{downloadingId === project.id ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownToLine size={15} />}</button>
                  <button onClick={() => void deleteProject(project)} disabled={deletingId === project.id} aria-label={`Delete ${project.name}`} title="Delete project" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#929CBD] transition hover:border-[#F05D70]/30 hover:bg-[#F05D70]/10 hover:text-[#FF9AA6] disabled:opacity-50">{deletingId === project.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A78BFA]">Start building</p><h2 className="mt-1 font-display text-2xl font-bold text-white">Choose a starting point</h2><p className="mt-1 text-sm text-[#929CBD]">Every template creates a saved project in your account.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((template) => { const Icon = template.icon; return <button key={template.id} onClick={() => openCreate(template.id)} className="group text-left rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#7559E8]/45 hover:bg-white/[0.045]"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Icon size={20} /></span>{template.featured && <span className="rounded-full bg-[#7559E8]/15 px-2 py-1 text-[10px] font-bold text-[#C4B5FD]">RECOMMENDED</span>}</div><h3 className="mt-4 font-display text-base font-bold text-white">{template.title}</h3><p className="mt-2 min-h-12 text-xs leading-5 text-[#929CBD]">{template.description}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7A6FF]">Use template <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span></button>; })}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="flex items-center gap-2"><BookOpen size={18} className="text-[#A78BFA]" /><h3 className="font-display font-bold text-white">From learning to building</h3></div><p className="mt-2 text-sm leading-6 text-[#929CBD]">When a lesson includes a code example, send it to the Playground to experiment with it. Your own projects stay separate from the lesson examples.</p><Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#B7A6FF]">Continue learning <ArrowRight size={14} /></Link></div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="flex items-center gap-2"><ArrowDownToLine size={18} className="text-[#22C58B]" /><h3 className="font-display font-bold text-white">Bring a purchased project</h3></div><p className="mt-2 text-sm leading-6 text-[#929CBD]">After your order is paid, download the package ZIP and extract it on your computer. In Chrome or Edge, open the Playground and choose Open Folder to edit the extracted files directly on your device. Full-stack projects need their local runtimes and dependencies.</p><Link href="/account/orders" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#B7A6FF]">View purchases <ArrowRight size={14} /></Link></div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12172b] p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">New workspace</p><h2 id="create-project-title" className="mt-1 font-display text-xl font-bold text-white">Create a project</h2></div><button onClick={() => setShowCreate(false)} aria-label="Close" className="rounded-lg p-2 text-[#929CBD] hover:bg-white/5 hover:text-white"><X size={18} /></button></div>
            <label className="mt-6 block text-xs font-semibold text-[#B7BDD0]">Project name<input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] px-4 py-3 text-sm text-white outline-none focus:border-[#7559E8]" /></label>
            <label className="mt-4 block text-xs font-semibold text-[#B7BDD0]">Description<textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={2} maxLength={500} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#0B0F1D] px-4 py-3 text-sm text-white outline-none focus:border-[#7559E8]" /></label>
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><span className="text-xs font-semibold text-white">{TEMPLATES.find((item) => item.id === selectedTemplate)?.title}</span><p className="mt-1 text-xs leading-5 text-[#929CBD]">{TEMPLATES.find((item) => item.id === selectedTemplate)?.description}</p><span className="mt-2 block text-[11px] text-[#7A8199]">{TEMPLATES.find((item) => item.id === selectedTemplate)?.files.length} starter files will be created.</span></div>
            <div className="mt-6 flex flex-wrap justify-end gap-2"><button onClick={() => setShowCreate(false)} disabled={creating} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-[#B7BDD0] hover:bg-white/5">Cancel</button><button onClick={() => void createProject()} disabled={creating || !projectName.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#8B70FF] disabled:opacity-50">{creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create and open</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
