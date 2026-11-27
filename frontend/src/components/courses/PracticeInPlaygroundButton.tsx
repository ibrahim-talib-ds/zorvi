"use client";

import { useState } from "react";
import { ArrowUpRight, Code2 } from "lucide-react";

interface Props {
  code: string;
  language?: string;
  lessonTitle: string;
}

function detectLanguage(code: string, declared?: string): string {
  const value = (declared || "").trim().toLowerCase().replace(/^\./, "");
  const aliases: Record<string, string> = {
    html: "html", htm: "html", css: "css", js: "javascript", javascript: "javascript",
    ts: "typescript", typescript: "typescript", py: "python", python: "python",
    sql: "sql", json: "json", xml: "xml", md: "markdown", markdown: "markdown",
  };

  // Strong syntax cues win over a stale/mis-selected language field (for example,
  // HTML snippets that were accidentally saved with language="python").
  const source = code.trim();
  if (/<!doctype\s+html|<(?:html|head|body|h[1-6]|p|div|button|ul|ol|li|a|section|main)\b/i.test(source)) return "html";
  if (/(?:^|\n)\s*[.#]?[\w-]+\s*\{\s*[\w-]+\s*:/m.test(source)) return "css";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(source)) return "sql";
  if (/\b(interface|type)\s+[A-Z]\w*|:\s*(string|number|boolean|any)\s*[=;,)]/.test(source)) return "typescript";
  if (/^\s*(def |print\(|import |from .* import |if __name__)/m.test(source)) return "python";
  if (/\b(const|let|var|function|console\.log|document\.)\b/.test(source) || /=>/.test(source)) return "javascript";
  if (/^\s*[\[{]/.test(source)) return "json";
  return aliases[value] || "plaintext";
}

export function PracticeInPlaygroundButton({ code, language, lessonTitle }: Props) {
  const [error, setError] = useState("");

  const openPlayground = () => {
    try {
      const resolvedLanguage = detectLanguage(code, language);
      localStorage.setItem("ibrant_PLAYGROUND_HANDOFF_V1", JSON.stringify({
        code,
        language: resolvedLanguage,
        title: lessonTitle,
        mode: ["html", "css", "javascript"].includes(resolvedLanguage) ? "web" : "language",
        autoRun: ["html", "css", "javascript"].includes(resolvedLanguage),
        createdAt: Date.now(),
      }));
      window.location.assign("/playground?handoff=lesson");
    } catch {
      setError("The browser could not pass this code to the Playground. Copy the code and open the workspace instead.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={openPlayground} className="inline-flex items-center gap-2 rounded-lg border border-[#7559E8]/30 bg-[#7559E8]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] transition hover:bg-[#7559E8]/20">
        <Code2 size={14} /> Try in Playground <ArrowUpRight size={13} />
      </button>
      {error && <p role="alert" className="max-w-xs text-right text-[10px] text-[#FF9AA6]">{error}</p>}
    </div>
  );
}
