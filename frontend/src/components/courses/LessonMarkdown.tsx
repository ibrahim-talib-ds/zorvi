"use client";

import { CodeBlock } from "@/components/courses/CodeBlock";
import { ExerciseBlock } from "@/components/courses/ExerciseBlock";

export function LessonMarkdown({ content, lessonId, courseSlug }: { content: string; lessonId?: string; courseSlug?: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const inline = (value: string) => value.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[#1E1E1E] px-1.5 py-0.5 font-mono text-sm text-[#F5A623]">{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    // Render embedded structured exercise markers as an actual student workspace,
    // rather than exposing the serialized config string in lesson prose.
    if (trimmed.startsWith("IBRANT_EXERCISE_V1:")) {
      nodes.push(<ExerciseBlock key={key++} exerciseText={trimmed} lessonId={lessonId} courseSlug={courseSlug} />);
      i++;
      continue;
    }
    const fence = trimmed.match(/^```([a-zA-Z0-9_+#.-]*)\s*$/);
    if (fence) {
      const language = fence[1] || "text";
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      nodes.push(<CodeBlock key={key++} code={code.join("\n")} language={language} />);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      nodes.push(<Tag key={key++} className="mb-4 mt-9 rounded-xl border-l-4 border-[#8B70FF] bg-gradient-to-r from-[#7559E8]/15 via-[#7559E8]/[.04] to-transparent px-4 py-3 font-display font-bold text-white shadow-sm">{heading[2]}</Tag>);
      i++; continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { nodes.push(<blockquote key={key++} className="my-5 rounded-r-xl border-l-4 border-[#F5A623] bg-[#F5A623]/[.08] px-5 py-4 leading-7 text-[#F2D9A5]">{inline(quote[1])}</blockquote>); i++; continue; }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const match = lines[i].match(isOrdered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/);
        if (!match) break;
        items.push(<li key={items.length}>{inline(match[1])}</li>);
        i++;
      }
      nodes.push(isOrdered ? <ol key={key++} className="mb-6 ml-1 list-decimal space-y-3 rounded-xl border border-white/[.06] bg-white/[.025] py-4 pl-10 pr-5 text-[#C5CCDA] marker:text-[#A78BFA]">{items}</ol> : <ul key={key++} className="mb-6 ml-1 list-disc space-y-3 rounded-xl border border-white/[.06] bg-white/[.025] py-4 pl-10 pr-5 text-[#C5CCDA] marker:text-[#F5C56D]">{items}</ul>);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*```/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) paragraph.push(lines[i++]);
    nodes.push(<p key={key++} className="mb-5 text-[1.02rem] leading-8 text-[#C5CCDA]">{inline(paragraph.join(" "))}</p>);
  }
  return <div className="space-y-2">{nodes}</div>;
}
