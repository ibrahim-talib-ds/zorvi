"use client";

import { CodeBlock } from "@/components/courses/CodeBlock";

export function LessonMarkdown({ content }: { content: string }) {
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
      nodes.push(<Tag key={key++} className="mb-3 mt-7 font-display font-bold text-white">{heading[2]}</Tag>);
      i++; continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { nodes.push(<blockquote key={key++} className="my-4 border-l-2 border-[#7559E8] pl-4 text-[#B7BDD0]">{inline(quote[1])}</blockquote>); i++; continue; }
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
      nodes.push(isOrdered ? <ol key={key++} className="mb-5 list-decimal space-y-2 pl-6 text-[#B7BDD0]">{items}</ol> : <ul key={key++} className="mb-5 list-disc space-y-2 pl-6 text-[#B7BDD0]">{items}</ul>);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*```/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) paragraph.push(lines[i++]);
    nodes.push(<p key={key++} className="mb-4 text-lg leading-relaxed text-[#B7BDD0]">{inline(paragraph.join(" "))}</p>);
  }
  return <div className="space-y-2">{nodes}</div>;
}
