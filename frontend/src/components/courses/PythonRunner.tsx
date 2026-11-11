"use client";

import { useState } from "react";
import { Play, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  initialCode: string;
  onSuccess?: () => void;
}

export function PythonRunner({ initialCode, onSuccess }: Props) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pyodideLoaded, setPyodideLoaded] = useState(false);

  const runCode = async () => {
    setRunning(true);
    setOutput(null);
    setError(null);

    try {
      // Dynamically load Pyodide from CDN on first run
      if (!pyodideLoaded) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
        
        setPyodideLoaded(true);
      }

      // @ts-ignore
      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });

      // Capture stdout
      let stdout = "";
      pyodide.setStdout({
        batched: (msg: string) => {
          stdout += msg + "\n";
        },
      });

      // Capture stderr
      let stderr = "";
      pyodide.setStderr({
        batched: (msg: string) => {
          stderr += msg + "\n";
        },
      });

      // Run the code
      await pyodide.runPythonAsync(code);

      if (stderr) {
        setError(stderr);
      } else {
        setOutput(stdout || "(No output)");
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Run Button */}
      <button
        onClick={runCode}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-[#22C58B] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#1ea877] transition disabled:opacity-50 mb-3"
      >
        {running ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Running...
          </>
        ) : (
          <>
            <Play size={16} /> Run Code
          </>
        )}
      </button>

      {/* Terminal Output */}
      {(output || error) && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1E1E1E] border-b border-[#404040]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <span className="ml-2 text-xs font-mono text-[#A9B7C6] uppercase tracking-wider">
                Terminal
              </span>
            </div>
          </div>
          <div className="bg-[#0B0F1D] p-4 font-mono text-sm">
            {output && (
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#22C58B] mt-0.5 flex-shrink-0" />
                <pre className="text-[#22C58B] whitespace-pre-wrap">{output}</pre>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2">
                <XCircle size={16} className="text-[#F05D70] mt-0.5 flex-shrink-0" />
                <pre className="text-[#F05D70] whitespace-pre-wrap">{error}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
