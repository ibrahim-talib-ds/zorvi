"use client";

import { useState } from "react";
import { ArrowUpRight, Code2 } from "lucide-react";

interface Props {
  code: string;
  language: string;
  lessonTitle: string;
}

export function PracticeInPlaygroundButton({ code, language, lessonTitle }: Props) {
  const [error, setError] = useState("");

  const openPlayground = () => {
    try {
      localStorage.setItem("IBRANT_PLAYGROUND_HANDOFF_V1", JSON.stringify({
        code,
        language: language || "python",
        title: lessonTitle,
        createdAt: Date.now(),
      }));
      window.location.assign("/playground?handoff=lesson");
    } catch {
      setError("The browser could not pass this example to the Playground. Copy the code and open the workspace instead.");
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
