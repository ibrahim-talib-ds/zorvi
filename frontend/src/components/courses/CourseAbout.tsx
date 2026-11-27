"use client";

import React from "react";

function normalizeMarkdown(value: string) {
  return (value || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\([#*_\x60[\]()>-])/g, "$1")
    .trim();
}

function inlineContent(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function CourseAbout({ content, compact = false }: { content: string; compact?: boolean }) {
  const normalized = normalizeMarkdown(content);
  const lines = normalized.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-4 grid gap-2 sm:grid-cols-2">
        {list.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm leading-6 text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
            <span>{inlineContent(item)}</span>
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) { flushList(); return; }
    if (/^[-*•]\s+/.test(line)) {
      list.push(line.replace(/^[-*•]\s+/, ""));
      return;
    }
    flushList();

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/^#+\s*/, "");
      blocks.push(
        <div key={`heading-${index}`} className={level === 1 ? "mb-4 mt-7 first:mt-0" : "mb-3 mt-7 first:mt-0"}>
          {level === 1 ? (
            <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{inlineContent(text)}</h3>
          ) : (
            <div className="flex items-center gap-3">
              <span className="h-7 w-1 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400" />
              <h4 className="text-base font-bold text-white sm:text-lg">{inlineContent(text)}</h4>
            </div>
          )}
        </div>
      );
      return;
    }
    if (/^\*\*.+\*\*$/.test(line)) {
      blocks.push(<p key={index} className="mt-4 text-sm font-semibold text-violet-200">{inlineContent(line)}</p>);
      return;
    }
    blocks.push(
      <p key={index} className={compact ? "text-sm leading-6 text-slate-300" : "text-[15px] leading-7 text-slate-300"}>
        {inlineContent(line)}
      </p>
    );
  });
  flushList();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#151B30] via-[#111827] to-[#101827] p-5 shadow-xl shadow-black/10 sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/[0.09] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-500/[0.06] blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">Course overview</span>
        </div>
        <div className="space-y-3">{blocks}</div>
      </div>
    </div>
  );
}
