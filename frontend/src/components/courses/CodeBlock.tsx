"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";

interface Props {
  code: string;
  language?: string;
}

function resolveCodeLanguage(code: string, declared: string): string {
  const source = code.trim();
  if (/<!doctype\s+html|<(?:html|head|body|h[1-6]|p|div|button|ul|ol|li|a|section|main)\b/i.test(source)) return "html";
  if (/(?:^|\n)\s*[.#]?[\w-]+\s*\{\s*[\w-]+\s*:/m.test(source)) return "css";
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(source)) return "sql";
  if (/^\s*(def |print\(|import |from .* import |if __name__)/m.test(source)) return "python";
  if (/\b(const|let|var|function|console\.log|document\.)\b/.test(source) || /=>/.test(source)) return "javascript";
  return declared || "text";
}

const readableVsDarkTheme: typeof themes.vsDark = {
  ...themes.vsDark,
  plain: {
    ...themes.vsDark.plain,
    color: "#E2E8F0",
  },
  styles: themes.vsDark.styles.map((rule) => {
    if (rule.types.includes("comment")) {
      return { ...rule, style: { ...rule.style, color: "#9BCB95" } };
    }
    if (rule.types.includes("constant")) {
      return { ...rule, style: { ...rule.style, color: "#BCB9FF" } };
    }
    if (rule.types.includes("char")) {
      return { ...rule, style: { ...rule.style, color: "#F08C8C" } };
    }
    if (rule.types.includes("punctuation")) {
      return { ...rule, style: { ...rule.style, color: "#E2E8F0" } };
    }
    return rule;
  }),
};

export function CodeBlock({ code, language = "text" }: Props) {
  const [copied, setCopied] = useState(false);
  const resolvedLanguage = resolveCodeLanguage(code, language.toLowerCase());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="group relative rounded-xl border border-white/10 bg-[#1E1E1E] overflow-hidden shadow-xl shadow-black/50 not-prose">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-[#404040]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
          <span className="ml-2 text-xs font-mono text-[#A9B7C6] uppercase tracking-wider">
            {resolvedLanguage}
          </span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 text-xs font-medium text-[#A9B7C6] hover:bg-white/10 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check size={12} className="text-[#22C58B]" /> Copied!
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>

      {/* Code area with Prism Renderer */}
      <div className="overflow-x-auto font-mono text-[15.5px] leading-7">
        <Highlight theme={readableVsDarkTheme} code={code.trim()} language={resolvedLanguage as Language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={className} 
              style={{ 
                ...style, 
                margin: 0, 
                padding: "1.25rem", 
                backgroundColor: "transparent",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: "15.5px",
                fontWeight: 500,
                lineHeight: 1.75,
                letterSpacing: "0.01em",
                WebkitFontSmoothing: "auto",
                fontVariantLigatures: "none",
              }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
