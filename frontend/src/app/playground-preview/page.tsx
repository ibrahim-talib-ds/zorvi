"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Terminal, ExternalLink } from "lucide-react";
type Snapshot = { srcDoc?: string; runtimePreviewUrl?: string; logs?: {t:string;level:string;text:string}[]; language?: string; title?: string; savedAt?: number };
export default function PlaygroundPreviewPage() {
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{try{const raw=localStorage.getItem("ibrant_PLAYGROUND_PREVIEW_V1");if(raw)setSnapshot(JSON.parse(raw));}catch{/* ignore invalid preview snapshot */}},[refreshKey]);
 return <main className="flex min-h-screen flex-col bg-[#080C18] text-white">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0B1020] px-5 py-4">
   <div className="flex items-center gap-3"><Link href="/playground" className="rounded-lg border border-white/10 p-2 text-[#C4CBD8] hover:bg-white/5"><ArrowLeft size={17}/></Link><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#A78BFA]">ibrant Studio</p><h1 className="font-semibold">{snapshot?.title||"Full-page preview"}</h1></div></div>
   <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-[#AAB3CC]">{snapshot?.language?.toUpperCase()||"Preview"}</span><button onClick={()=>setRefreshKey(x=>x+1)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-[#D7DDF3] hover:bg-white/5"><RefreshCw size={13}/> Refresh snapshot</button>{snapshot?.runtimePreviewUrl&&<a href={snapshot.runtimePreviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-3 py-2 text-xs font-semibold"><ExternalLink size={13}/> Open app URL</a>}</div>
  </header>
  <section className="min-h-0 flex-1 p-3 sm:p-5"><div className="h-full min-h-[65vh] overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
   {snapshot?.runtimePreviewUrl?<iframe title="Full-page running application preview" src={snapshot.runtimePreviewUrl} className="h-full min-h-[65vh] w-full" allow="clipboard-read; clipboard-write"/>:snapshot?.srcDoc?<iframe title="Full-page code preview" srcDoc={snapshot.srcDoc} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-full min-h-[65vh] w-full"/>:<div className="flex min-h-[65vh] items-center justify-center bg-[#0B0F1D] p-8 text-center"><div><Terminal size={32} className="mx-auto mb-3 text-[#A78BFA]"/><h2 className="font-semibold">No preview is available yet</h2><p className="mt-2 text-sm text-[#9299AE]">Return to the editor, choose a supported language and run your code before opening this page.</p><Link href="/playground" className="mt-5 inline-flex rounded-lg bg-[#7559E8] px-4 py-2 text-sm font-semibold">Back to editor</Link></div></div>}
  </div></section>
  <section className="border-t border-white/10 bg-[#0B1020] px-5 py-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A78BFA]"><Terminal size={14}/> Run output</div><div className="max-h-40 space-y-1 overflow-y-auto font-mono text-xs">{snapshot?.logs?.length?snapshot.logs.map((line,i)=><p key={i} className={line.level==="error"?"text-rose-300":line.level==="warn"?"text-amber-200":"text-[#C4CBD8]"}><span className="mr-3 text-[#687087]">{line.t}</span>{line.text}</p>):<p className="text-[#7A8199]">No terminal output captured. Run the project in ibrant Studio to refresh this preview.</p>}</div></section>
 </main>;
}
