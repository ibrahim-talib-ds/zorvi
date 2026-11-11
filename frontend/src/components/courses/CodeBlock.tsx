"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "python" }: Props) {
  const [copied, setCopied] = useState(false);

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
            {language}
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
      <div className="text-sm font-mono leading-relaxed overflow-x-auto">
        <Highlight theme={themes.vsDark} code={code.trim()} language={language as any}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={className} 
              style={{ 
                ...style, 
                margin: 0, 
                padding: "1.25rem", 
                backgroundColor: "transparent",
                fontSize: "0.875rem",
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
