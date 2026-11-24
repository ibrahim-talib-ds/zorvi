"use client";

// app/playground/page.tsx - IBRANT Code Playground (v15, NEW PAGE)
//
// A real, self-contained coding workspace: editor + live preview + terminal.
//   - Editor: HTML / CSS / JS tabs, line numbers, Tab indents, Ctrl+Enter runs
//   - Preview: sandboxed live iframe, rebuilt on Run (or auto-run)
//   - Terminal: REAL console capture from the running code (log/info/warn/error,
//     runtime errors, promise rejections) + a REPL - anything you type is
//     evaluated inside the preview frame. `clear` and `help` are built in.
//   - Work is saved locally (localStorage) - nothing uploads anywhere.
//
// No new npm dependencies. Standalone route (no sidebar chrome) - linked from
// the account sidebar and the marketplace sidebar as "Code Playground".

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Terminal } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const PG_KEY = "IBRANT_PLAYGROUND_V1";
const PG_LANG_KEY = "IBRANT_PLAYGROUND_LANGUAGES_V1";

const EXTRA_LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
  { id: "shell", label: "Shell" },
  { id: "powershell", label: "PowerShell" },
  { id: "dockerfile", label: "Dockerfile" },
  { id: "xml", label: "XML" },
  { id: "scss", label: "SCSS" },
  { id: "less", label: "Less" },
  { id: "graphql", label: "GraphQL" },
  { id: "r", label: "R" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "dart", label: "Dart" },
  { id: "lua", label: "Lua" },
  { id: "perl", label: "Perl" },
  { id: "objective-c", label: "Objective-C" },
  { id: "fsharp", label: "F#" },
  { id: "clojure", label: "Clojure" },
  { id: "elixir", label: "Elixir" },
  { id: "haskell", label: "Haskell" },
  { id: "julia", label: "Julia" },
  { id: "plaintext", label: "Plain Text" },
];

const LANGUAGE_STARTERS: Record<string, string> = {
  python: 'def main():\n    print("Hello from IBRANT!")\n\nif __name__ == "__main__":\n    main()\n',
  typescript: 'const greeting: string = "Hello from IBRANT!";\nconsole.log(greeting);\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from IBRANT!");\n    }\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from IBRANT!" << std::endl;\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello from IBRANT!\\n");\n    return 0;\n}\n',
  sql: 'SELECT "Hello from IBRANT!" AS greeting;\n',
};

interface Code {
  html: string;
  css: string;
  js: string;
}
interface LogLine {
  level: "cmd" | "out" | "log" | "info" | "warn" | "error" | "sys";
  text: string;
  t: string;
}

interface ProjectNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  children?: ProjectNode[];
}

async function readProjectTree(
  directory: FileSystemDirectoryHandle,
  parentPath = ""
): Promise<ProjectNode[]> {
  const nodes: ProjectNode[] = [];

  const directoryWithEntries = directory as unknown as {
    entries(): AsyncIterableIterator<
      [string, FileSystemDirectoryHandle | FileSystemFileHandle]
    >;
  };

  for await (const [name, handle] of directoryWithEntries.entries()) {
    if (
      handle.kind === "directory" &&
      ["node_modules", ".git", ".next", "dist", "build", ".venv", "venv", "coverage", ".turbo"].includes(name)
    ) {
      continue;
    }
    const path = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === "directory") {
      const dir = handle as FileSystemDirectoryHandle;
      nodes.push({
        name,
        path,
        kind: "directory",
        handle: dir,
        children: await readProjectTree(dir, path),
      });
    } else {
      nodes.push({
        name,
        path,
        kind: "file",
        handle: handle as FileSystemFileHandle,
      });
    }
  }

  return nodes.sort((a, b) =>
    a.kind !== b.kind
      ? a.kind === "directory" ? -1 : 1
      : a.name.localeCompare(b.name)
  );
}

function languageFromFileName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "html", htm: "html", css: "css", js: "javascript",
    mjs: "javascript", cjs: "javascript", ts: "typescript",
    tsx: "typescript", py: "python", json: "json", xml: "xml",
    md: "markdown", yml: "yaml", yaml: "yaml", sql: "sql",
    java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp",
    cxx: "cpp", cs: "csharp", go: "go", rs: "rust",
    php: "php", rb: "ruby", sh: "shell", bash: "shell",
    ps1: "powershell", scss: "scss", less: "less",
    graphql: "graphql", r: "r", swift: "swift", kt: "kotlin",
    dart: "dart", lua: "lua", pl: "perl", m: "objective-c",
    fs: "fsharp", clj: "clojure", ex: "elixir", hs: "haskell",
    jl: "julia",
  };
  return map[ext] ?? "plaintext";
}

// ----------------------------------------------------------------------------
// default project + examples (plain strings, no nested template pitfalls)
// ----------------------------------------------------------------------------
const DEFAULT_CODE: Code = {
  html: `<div class="card">
  <span class="tag">IBRANT Playground</span>
  <h1>Hello 👋</h1>
  <p>Edit the code, press <b>Run</b>, watch the terminal.</p>
  <button id="go">Clicked 0 times</button>
</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: #0B0F1D;
  color: #E7EAF6;
}
.card {
  background: #161B36;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 28px 32px;
  border-radius: 16px;
  text-align: center;
}
.tag {
  color: #A78BFA;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
button {
  margin-top: 14px;
  background: linear-gradient(90deg, #7559E8, #8B70FF);
  color: #fff;
  border: 0;
  padding: 10px 22px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}
button:hover { filter: brightness(1.15); }`,
  js: `let n = 0;
const btn = document.getElementById("go");
btn.addEventListener("click", function () {
  n++;
  btn.textContent = "Clicked " + n + " times";
  console.log("clicked", n);
});
console.log("Playground ready — open the terminal and type help");
`,
};

const EXAMPLES: { name: string; code: Code }[] = [
  { name: "Welcome (default)", code: DEFAULT_CODE },
  {
    name: "CSS animation",
    code: {
      html: `<div class="stage">
  <div class="dot"></div>
  <div class="dot d2"></div>
  <div class="dot d3"></div>
</div>
<h2>Loading…</h2>`,
      css: `body { margin: 0; min-height: 100vh; display: grid; place-items: center;
  background: #0B0F1D; color: #E7EAF6; font-family: system-ui; }
.stage { display: flex; gap: 14px; }
.dot { width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #7559E8, #8B70FF);
  animation: bounce 0.9s infinite ease-in-out; }
.dot.d2 { animation-delay: 0.15s; background: linear-gradient(135deg, #5B9EFF, #7559E8); }
.dot.d3 { animation-delay: 0.3s; background: linear-gradient(135deg, #22C58B, #5B9EFF); }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-22px); }
}`,
      js: `let i = 0;
setInterval(function () {
  i++;
  console.log("tick", i);
}, 1000);
console.log("CSS animation running — watch the terminal count");
`,
    },
  },
  {
    name: "JS mini calculator",
    code: {
      html: `<div class="calc">
  <h2>Quick Sum</h2>
  <p id="result">3 + 4 = ?</p>
  <button id="btn">Calculate</button>
</div>`,
      css: `body { margin: 0; min-height: 100vh; display: grid; place-items: center;
  background: #0B0F1D; color: #E7EAF6; font-family: system-ui; }
.calc { background: #161B36; border: 1px solid rgba(255,255,255,0.08);
  padding: 30px; border-radius: 16px; text-align: center; }
#result { font-size: 20px; font-weight: 700; color: #8FE3C0; }
button { margin-top: 12px; background: linear-gradient(90deg, #7559E8, #8B70FF);
  color: #fff; border: 0; padding: 10px 22px; border-radius: 10px; cursor: pointer; }`,
      js: `function sum(a, b) { return a + b; }
document.getElementById("btn").addEventListener("click", function () {
  var r = sum(3, 4);
  document.getElementById("result").textContent = "3 + 4 = " + r;
  console.log("sum(3,4) =", r);
});
console.log("Tip: in the terminal below type  sum(10, 20)  and press Enter");
`,
    },
  },
];

// ----------------------------------------------------------------------------
// preview builder + console bridge injected into the iframe
// ----------------------------------------------------------------------------
const escapeScript = (s: string): string => s.replace(/<\/script>/gi, "<\\/script>");

const BRIDGE = `<script>
(function () {
  function stringify(value) {
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;

    try {
      var result = JSON.stringify(value, null, 1);
      return typeof result === "string" ? result : String(value);
    } catch (_) {
      return String(value);
    }
  }

  function sendLog(level, text) {
    try {
      parent.postMessage({
        __ibrantPg: 1,
        type: "log",
        level: level,
        text: String(text)
      }, "*");
    } catch (_) {}
  }

  function sendResult(id, level, text) {
    try {
      parent.postMessage({
        __ibrantPg: 1,
        type: "result",
        id: id,
        level: level,
        text: String(text)
      }, "*");
    } catch (_) {}
  }

  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level]
      ? console[level].bind(console)
      : function () {};

    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      sendLog(level, args.map(stringify).join(" "));
      original.apply(null, args);
    };
  });

  window.addEventListener("error", function (event) {
    sendLog(
      "error",
      (event.message || "Script error") +
      (event.lineno ? " (line " + event.lineno + ")" : "")
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    sendLog(
      "error",
      "Unhandled rejection: " +
      ((reason && reason.message) || String(reason))
    );
  });

  // Accept commands only from the embedding parent window.
  window.addEventListener("message", function (event) {
    if (event.source !== parent) return;

    var data = event.data;

    if (
      !data ||
      data.__ibrantPgCommand !== 1 ||
      typeof data.id !== "number" ||
      typeof data.code !== "string"
    ) {
      return;
    }

    try {
      var result = (0, eval)(data.code);

      Promise.resolve(result).then(
        function (value) {
          sendResult(data.id, "out", stringify(value));
        },
        function (error) {
          sendResult(
            data.id,
            "error",
            error && error.message ? error.message : String(error)
          );
        }
      );
    } catch (error) {
      sendResult(
        data.id,
        "error",
        error && error.message ? error.message : String(error)
      );
    }
  });

  // Tell the parent that the preview bridge is ready.
  try {
    parent.postMessage({
      __ibrantPg: 1,
      type: "ready"
    }, "*");
  } catch (_) {}
})();<\/script>`;

function build(c: Code): string {
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${c.css}</style>${BRIDGE}</head><body>${c.html}` +
    `<script>try{${escapeScript(c.js)}}catch(e){console.error((e&&e.message)||String(e))}<\/script>` +
    `</body></html>`
  );
}

const LEVEL_STYLE: Record<LogLine["level"], string> = {
  cmd: "text-white font-bold",
  out: "text-[#8FE3C0]",
  log: "text-[#D7DDF3]",
  info: "text-[#7FB3FF]",
  warn: "text-[#F5C26B]",
  error: "text-[#FF7A8A]",
  sys: "text-[#7A8199] italic",
};

const TABS: { key: keyof Code; label: string }[] = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JS" },
];

// ----------------------------------------------------------------------------
// Project explorer item
// ----------------------------------------------------------------------------
function ProjectTreeItem({
  node,
  activePath,
  onOpen,
}: {
  node: ProjectNode;
  activePath: string;
  onOpen: (node: ProjectNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.kind === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#B7BDD0] hover:bg-white/[0.06]"
        >
          <span className="text-[#D6A85C]">{expanded ? "▾" : "▸"}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <div key={child.path} className="ml-3 border-l border-white/5 pl-1">
            <ProjectTreeItem
              node={child}
              activePath={activePath}
              onOpen={onOpen}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(node)}
      title={node.path}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/[0.06] ${
        activePath === node.path ? "bg-[#7559E8]/20 text-white" : "text-[#9CA5BE]"
      }`}
    >
      <span className="text-[#7A8199]">•</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ----------------------------------------------------------------------------
// page
// ----------------------------------------------------------------------------
export default function PlaygroundPage() {
  const [code, setCode] = useState<Code>(DEFAULT_CODE);
  const [activeLanguage, setActiveLanguage] = useState("html");
  const [extraCode, setExtraCode] = useState<Record<string, string>>({});
  const [srcDoc, setSrcDoc] = useState<string>(() => build(DEFAULT_CODE));
  const [autoRun, setAutoRun] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [pythonRunning, setPythonRunning] = useState(false);

  const [projectTree, setProjectTree] = useState<ProjectNode[]>([]);
  const [projectRootName, setProjectRootName] = useState("");
  const [activeProjectFile, setActiveProjectFile] =
    useState<FileSystemFileHandle | null>(null);
  const [activeProjectPath, setActiveProjectPath] = useState("");
  const [projectFileContent, setProjectFileContent] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const previewReadyRef = useRef(false);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map<number, number>());
  const pythonWorkerRef = useRef<Worker | null>(null);
  const pythonRunTimeoutRef = useRef<number | null>(null);
  const pythonBusyRef = useRef(false);

  const clearPendingRequests = () => {
    for (const timer of pendingRequestsRef.current.values()) {
      window.clearTimeout(timer);
    }
    pendingRequestsRef.current.clear();
  };
  const logsRef = useRef<HTMLDivElement | null>(null);
  const runRef = useRef<() => void>(() => {});

  const pushLog = (level: LogLine["level"], text: string) => {
    setLogs((prev) => [
      ...prev.slice(-299),
      { level, text, t: new Date().toLocaleTimeString([], { hour12: false }) },
    ]);
  };

  const openProjectFolder = async () => {
    const pickerWindow = window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    };

    if (!pickerWindow.showDirectoryPicker) {
      pushLog("error", "Folder access is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      setProjectBusy(true);
      const directory = await pickerWindow.showDirectoryPicker();
      const tree = await readProjectTree(directory);

      setProjectTree(tree);
      setProjectRootName(directory.name);
      setActiveProjectFile(null);
      setActiveProjectPath("");
      setProjectFileContent("");
      pushLog("sys", `Opened project folder: ${directory.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      pushLog("error", error instanceof Error ? error.message : String(error));
    } finally {
      setProjectBusy(false);
    }
  };

  const openProjectFile = async (node: ProjectNode) => {
    if (node.kind !== "file") return;

    try {
      const handle = node.handle as FileSystemFileHandle;
      const file = await handle.getFile();
      const content = await file.text();

      setActiveProjectFile(handle);
      setActiveProjectPath(node.path);
      setProjectFileContent(content);
      setActiveLanguage(languageFromFileName(node.name));
      pushLog("sys", `Opened file: ${node.path}`);
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : String(error));
    }
  };

  const saveProjectFile = async () => {
    if (!activeProjectFile) return;

    try {
      const writable = await activeProjectFile.createWritable();
      await writable.write(projectFileContent);
      await writable.close();
      pushLog("out", `Saved: ${activeProjectPath}`);
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : String(error));
    }
  };

  const runPythonCode = (source: string) => {
    if (pythonBusyRef.current) {
      pushLog("warn", "Python is already running.");
      return;
    }

    const worker =
      pythonWorkerRef.current ??
      new Worker("/workers/ibrant-python.worker.js", {
        type: "module",
      });

    pythonWorkerRef.current = worker;

    if (!worker.onmessage) {
      worker.onmessage = (event: MessageEvent<{ type?: string; text?: string }>) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "stdout") {
          pushLog("out", data.text ?? "");
        } else if (data.type === "stderr") {
          pushLog("error", data.text ?? "");
        } else if (data.type === "result") {
          pushLog("out", `=> ${data.text ?? ""}`);
        } else if (data.type === "error") {
          pushLog("error", data.text || "Python execution failed.");
        } else if (data.type === "complete") {
          if (pythonRunTimeoutRef.current !== null) {
            window.clearTimeout(pythonRunTimeoutRef.current);
            pythonRunTimeoutRef.current = null;
          }
          pythonBusyRef.current = false;
          setPythonRunning(false);
        }
      };

      worker.onerror = (event) => {
        if (pythonRunTimeoutRef.current !== null) {
          window.clearTimeout(pythonRunTimeoutRef.current);
          pythonRunTimeoutRef.current = null;
        }
        pythonBusyRef.current = false;
        setPythonRunning(false);
        worker.terminate();
        if (pythonWorkerRef.current === worker) {
          pythonWorkerRef.current = null;
        }
        pushLog("error", event.message || "Python worker failed.");
      };
    }

    pythonBusyRef.current = true;
    setPythonRunning(true);
    pushLog("sys", "Starting Python WebAssembly runtime…");

    pythonRunTimeoutRef.current = window.setTimeout(() => {
      worker.terminate();
      if (pythonWorkerRef.current === worker) {
        pythonWorkerRef.current = null;
      }
      pythonRunTimeoutRef.current = null;
      pythonBusyRef.current = false;
      setPythonRunning(false);
      pushLog("error", "Python stopped: execution exceeded 60 seconds.");
    }, 60000);

    try {
      worker.postMessage({ code: source });
    } catch (error) {
      window.clearTimeout(pythonRunTimeoutRef.current);
      pythonRunTimeoutRef.current = null;
      pythonBusyRef.current = false;
      setPythonRunning(false);
      pushLog("error", error instanceof Error ? error.message : String(error));
    }
  };

  const run = async () => {
    if (activeLanguage === "json") {
      try {
        const parsed = JSON.parse(extraCode.json ?? "");
        pushLog("out", "Valid JSON.");
        pushLog("out", JSON.stringify(parsed, null, 2));
      } catch (error) {
        pushLog("error", error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (activeLanguage === "xml") {
      try {
        const xml = extraCode.xml ?? "";
        if (!xml.trim()) throw new Error("XML is empty.");

        const parsed = new DOMParser().parseFromString(xml, "application/xml");
        const parserError = parsed.querySelector("parsererror");

        if (parserError) {
          throw new Error(parserError.textContent || "Invalid XML.");
        }

        pushLog(
          "out",
          `Valid XML document. Root element: <${parsed.documentElement.tagName}>.`
        );
      } catch (error) {
        pushLog("error", error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (activeLanguage === "typescript") {
      try {
        pushLog("sys", "Transpiling TypeScript...");

        const ts = await import("typescript");
        const source = activeProjectFile
          ? projectFileContent
          : extraCode.typescript ?? LANGUAGE_STARTERS.typescript ?? "";

        const result = ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.None,
            strict: true,
            removeComments: false,
          },
          reportDiagnostics: true,
        });

        const errors = (result.diagnostics ?? []).filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
        );

        if (errors.length > 0) {
          for (const diagnostic of errors) {
            pushLog(
              "error",
              ts.flattenDiagnosticMessageText(diagnostic.messageText, "\\n")
            );
          }
          return;
        }

        if (!result.outputText.trim()) {
          pushLog("warn", "No JavaScript output was generated.");
          return;
        }

        clearPendingRequests();
        previewReadyRef.current = false;

        setSrcDoc(
          build({
            html: "",
            css: "",
            js: result.outputText,
          })
        );

        pushLog("out", "TypeScript transpiled successfully. Executing in the sandbox.");
      } catch (error) {
        pushLog("error", error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (activeLanguage === "python") {
      runPythonCode(
        activeProjectFile
          ? projectFileContent
          : extraCode.python ?? LANGUAGE_STARTERS.python ?? ""
      );
      return;
    }

    if (!["html", "css", "javascript"].includes(activeLanguage)) {
      pushLog(
        "sys",
        `${activeLanguage} does not have a local runtime or validator connected yet. Nothing was executed.`
      );
      return;
    }

    clearPendingRequests();
    previewReadyRef.current = false;
    setSrcDoc(build(code));
  };
  runRef.current = run;

  useEffect(() => {
    return () => {
      if (pythonRunTimeoutRef.current !== null) {
        window.clearTimeout(pythonRunTimeoutRef.current);
      }
      pythonWorkerRef.current?.terminate();
    };
  }, []);

  // load saved work once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PG_KEY);
      if (!raw) return;
      const c = JSON.parse(raw) as Partial<Code>;
      if (c && typeof c.html === "string") {
        const restored: Code = { html: c.html, css: c.css || "", js: c.js || "" };
        setCode(restored);
        setSrcDoc(build(restored));
        pushLog("sys", "Loaded your saved work from this browser.");
      }
    } catch { /* ignore */ }
  }, []);

  // debounced local save
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { localStorage.setItem(PG_KEY, JSON.stringify(code)); } catch { /* ignore */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [code]);

  // Restore and save additional language buffers separately from the original web project.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PG_LANG_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        activeLanguage?: string;
        extraCode?: Record<string, string>;
      };
      if (saved.extraCode && typeof saved.extraCode === "object") {
        setExtraCode(saved.extraCode);
      }
      const language = saved.activeLanguage;
      if (
        typeof language === "string" &&
        (
          language === "html" ||
          language === "css" ||
          language === "javascript" ||
          EXTRA_LANGUAGES.some((item) => item.id === language)
        )
      ) {
        setActiveLanguage(language);
      }
    } catch { /* ignore invalid local data */ }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          PG_LANG_KEY,
          JSON.stringify({ activeLanguage, extraCode })
        );
      } catch { /* ignore storage errors */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [activeLanguage, extraCode]);

  // auto-run
  useEffect(() => {
    if (!autoRun) return;
    if (!["html", "css", "javascript", "typescript", "python", "json", "xml"].includes(activeLanguage)) return;
    const t = window.setTimeout(() => runRef.current(), 800);
    return () => window.clearTimeout(t);
  }, [autoRun, code, activeLanguage, extraCode]);

  // Secure communication with the opaque-origin preview iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const frame = frameRef.current;

      // Only accept messages from this sandboxed preview.
      if (!frame?.contentWindow) return;
      if (e.source !== frame.contentWindow || e.origin !== "null") return;

      const d = e.data as {
        __ibrantPg?: number;
        type?: string;
        id?: number;
        level?: string;
        text?: string;
      };

      if (!d || d.__ibrantPg !== 1) return;

      if (d.type === "ready") {
        previewReadyRef.current = true;
        return;
      }

      if (d.type === "log" && typeof d.text === "string") {
        if (
          d.level === "log" ||
          d.level === "info" ||
          d.level === "warn" ||
          d.level === "error"
        ) {
          pushLog(d.level, d.text);
        }
        return;
      }

      if (
        d.type === "result" &&
        typeof d.id === "number" &&
        typeof d.text === "string"
      ) {
        const timer = pendingRequestsRef.current.get(d.id);
        if (timer === undefined) return;

        window.clearTimeout(timer);
        pendingRequestsRef.current.delete(d.id);

        pushLog(d.level === "error" ? "error" : "out", d.text);
      }
    };

    window.addEventListener("message", onMsg);

    return () => {
      window.removeEventListener("message", onMsg);
      clearPendingRequests();
    };
  }, []);

  // keep terminal scrolled to the newest line
  useEffect(() => {
    const el = logsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const execCommand = () => {
    const src = input.trim();
    if (!src) return;

    pushLog("cmd", "> " + src);
    setInput("");

    if (src === "clear") {
      setLogs([]);
      return;
    }

    if (src === "help") {
      pushLog(
        "sys",
        "Type JavaScript and press Enter. Built-ins: clear, help"
      );
      return;
    }

    const frameWindow = frameRef.current?.contentWindow;

    if (!frameWindow || !previewReadyRef.current) {
      pushLog("error", "Preview not ready — wait for it to load or press Run.");
      return;
    }

    const id = ++requestIdRef.current;

    const timer = window.setTimeout(() => {
      pendingRequestsRef.current.delete(id);
      pushLog("error", "Command timed out. Check your code and try again.");
    }, 10000);

    pendingRequestsRef.current.set(id, timer);

    try {
      frameWindow.postMessage(
        {
          __ibrantPgCommand: 1,
          id,
          code: src,
        },
        "*"
      );
    } catch (error) {
      window.clearTimeout(timer);
      pendingRequestsRef.current.delete(id);
      pushLog("error", error instanceof Error ? error.message : String(error));
    }
  };

  const reset = () => {
    if (pythonRunTimeoutRef.current !== null) {
      window.clearTimeout(pythonRunTimeoutRef.current);
      pythonRunTimeoutRef.current = null;
    }
    pythonWorkerRef.current?.terminate();
    pythonWorkerRef.current = null;
    pythonBusyRef.current = false;
    setPythonRunning(false);
    clearPendingRequests();
    previewReadyRef.current = false;
    setCode(DEFAULT_CODE);
    setActiveLanguage("html");
    setExtraCode({});
    setSrcDoc(build(DEFAULT_CODE));
    setLogs([]);
    try {
      localStorage.removeItem(PG_KEY);
      localStorage.removeItem(PG_LANG_KEY);
    } catch { /* ignore */ }
    pushLog("sys", "Reset to the default example.");
  };

  const applyExample = (name: string) => {
    const ex = EXAMPLES.find((x) => x.name === name);
    if (!ex) return;
    clearPendingRequests();
    previewReadyRef.current = false;
    setCode(ex.code);
    setActiveLanguage("html");
    setSrcDoc(build(ex.code));
    pushLog("sys", `Example loaded: ${ex.name}`);
  };

  const isWebLanguage = ["html", "css", "javascript"].includes(activeLanguage);
  const isWebPreviewLanguage = isWebLanguage || activeLanguage === "typescript";
  const activeTab: keyof Code =
    activeLanguage === "javascript" ? "js" :
    activeLanguage === "css" ? "css" : "html";

  const editorValue = activeProjectFile
    ? projectFileContent
    : isWebLanguage
      ? code[activeTab]
      : extraCode[activeLanguage] ?? LANGUAGE_STARTERS[activeLanguage] ?? "";

  const updateEditorValue = (value: string | undefined) => {
    const next = value ?? "";

    if (activeProjectFile) {
      setProjectFileContent(next);
    } else if (isWebLanguage) {
      setCode((prev) => ({ ...prev, [activeTab]: next }));
    } else {
      setExtraCode((prev) => ({ ...prev, [activeLanguage]: next }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1D] px-4 py-5 lg:px-6 lg:py-6">
      {/* header */}
      <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7559E8] to-[#8B70FF] text-white shadow-lg shadow-[#7559E8]/25">
            <Terminal size={20} />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-white">Code Playground</h1>
            <p className="text-xs text-[#7A8199]">Monaco editor · HTML/CSS/JS preview · Python WebAssembly runner</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openProjectFolder}
            disabled={projectBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] hover:bg-white/10 disabled:opacity-50"
          >
            {projectBusy ? "Opening…" : "Open Folder"}
          </button>
          <button
            onClick={saveProjectFile}
            disabled={!activeProjectFile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save File
          </button>
          <select
            onChange={(e) => applyExample(e.target.value)}
            defaultValue=""
            aria-label="Load an example"
            className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-2 text-xs text-[#B7BDD0] focus:border-[#7559E8] focus:outline-none"
          >
            <option value="" disabled>Examples…</option>
            {EXAMPLES.map((x) => (
              <option key={x.name} value={x.name}>{x.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#B7BDD0]">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="accent-[#7559E8]"
            />
            Auto-run
          </label>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            disabled={pythonRunning}
            onClick={() => { runRef.current(); pushLog("sys", "▶ Run"); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#7559E8]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={13} fill="currentColor" /> {pythonRunning ? "Running…" : "Run"} <span className="hidden opacity-70 sm:inline">Ctrl+↵</span>
          </button>
        </div>
      </header>

      {/* workspace */}
      <div className="mx-auto mt-4 flex max-w-[1600px] flex-col gap-4 lg:h-[calc(100vh-11.5rem)] lg:flex-row">
        {projectRootName && (
          <aside className="flex max-h-[260px] w-full shrink-0 flex-col overflow-auto rounded-2xl border border-white/5 bg-white/[0.03] lg:max-h-none lg:w-56">
            <div className="sticky top-0 border-b border-white/5 bg-[#0A0E24] px-3 py-3 text-xs font-semibold text-[#D7DDF3]">
              {projectRootName}
            </div>
            <div className="p-2">
              {projectTree.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#7A8199]">This folder is empty.</p>
              ) : (
                projectTree.map((node) => (
                  <ProjectTreeItem
                    key={node.path}
                    node={node}
                    activePath={activeProjectPath}
                    onOpen={openProjectFile}
                  />
                ))
              )}
            </div>
          </aside>
        )}
        {/* editor */}
        <section className="flex h-[420px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] lg:h-auto lg:flex-1">
          <div className="flex shrink-0 items-center border-b border-white/5 bg-[#0A0E24] px-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveLanguage(t.key === "js" ? "javascript" : t.key)}
                className={`px-4 py-2.5 font-mono text-xs font-bold transition ${
                  activeTab === t.key
                    ? "border-b-2 border-[#A78BFA] text-white"
                    : "border-b-2 border-transparent text-[#7A8199] hover:text-[#B7BDD0]"
                }`}
              >
                {t.label}
              </button>
            ))}
            <select
              value={isWebLanguage ? "" : activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value)}
              aria-label="Choose another programming language"
              className="ml-2 max-w-[150px] rounded-md border border-white/10 bg-[#0B0F1D] px-2 py-1.5 text-[11px] text-[#B7BDD0] outline-none focus:border-[#7559E8]"
            >
              <option value="" disabled>More languages…</option>
              {EXTRA_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>{language.label}</option>
              ))}
            </select>
            <span className="ml-auto px-3 text-right font-mono text-[10px] text-[#3D4568]">
              {isWebLanguage ? "Tab indents · Ctrl+↵ runs" : activeLanguage === "python" ? (pythonRunning ? "Python · Running…" : "Python · WebAssembly runner") : ["json", "xml"].includes(activeLanguage) ? "Validation available · Ctrl+↵" : "Syntax highlighting · saved locally"}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <MonacoEditor
              height="100%"
              language={activeLanguage}
              theme="vs-dark"
              value={editorValue}
              onChange={updateEditorValue}
              onMount={(editor, monaco) => {
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  () => {
                    runRef.current();
                    pushLog("sys", "▶ Run");
                  }
                );
              }}
              options={{
                automaticLayout: true,
                minimap: { enabled: true },
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                fontLigatures: true,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                insertSpaces: true,
                padding: { top: 12, bottom: 12 },
                lineNumbers: "on",
                roundedSelection: false,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                readOnly: false,
              }}
            />
          </div>
        </section>

        {/* preview + terminal */}
        <section className="flex min-w-0 flex-col gap-4 lg:flex-1">
          <div className="flex h-[380px] flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] lg:h-auto lg:min-h-0 lg:flex-1">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 bg-[#0A0E24] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F05D70]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#F5C26B]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#22C58B]" />
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#7A8199]">Preview</span>
            </div>
            {isWebPreviewLanguage ? (
              <iframe
                ref={frameRef}
                title="Live preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                className="min-h-0 w-full flex-1 bg-[#0B0F1D]"
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0B0F1D] p-8">
                <div className="max-w-sm text-center">
                  <div className="mb-3 text-lg font-semibold text-[#D7DDF3]">
                    {activeLanguage === "python"
                      ? "Python WebAssembly Runtime"
                      : ["json", "xml"].includes(activeLanguage)
                        ? `${activeLanguage.toUpperCase()} Validator`
                        : `${activeLanguage.toUpperCase()} Workspace`}
                  </div>
                  <p className="text-sm leading-6 text-[#7A8199]">
                    {activeLanguage === "python"
                      ? "Python executes in an isolated WebAssembly worker. Results appear in the terminal."
                      : ["json", "xml"].includes(activeLanguage)
                        ? "Run validation to inspect syntax and errors in the terminal."
                        : "A local execution engine or validator is not connected yet. Your code is preserved and is not falsely reported as executed."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0A0E24] lg:h-72">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-2.5">
              <Terminal size={13} className="text-[#A78BFA]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A8199]">Terminal — console output & REPL</span>
            </div>
            <div ref={logsRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-2 font-mono text-[12px] leading-relaxed">
              {logs.length === 0 ? (
                <p className="italic text-[#3D4568]">Console output from your code shows up here. Type <span className="text-[#A78BFA]">help</span> below.</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-[#3D4568]">{l.t}</span>
                    <span className={`whitespace-pre-wrap break-words ${LEVEL_STYLE[l.level]}`}>{l.text}</span>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); execCommand(); }}
              className="flex shrink-0 items-center gap-2 border-t border-white/5 px-4 py-2.5"
            >
              <span className="font-mono text-sm font-bold text-[#A78BFA]">›</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type JavaScript and press Enter — try document.title"
                aria-label="Terminal input"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-[#D7DDF3] placeholder-[#3D4568] outline-none"
              />
            </form>
          </div>
        </section>
      </div>

      <p className="mx-auto mt-3 max-w-[1600px] text-center text-[11px] text-[#7A8199]">
        Your code saves automatically on this device. HTML, CSS and JavaScript run in a sandboxed browser preview. Python runs through WebAssembly. JSON and XML have validation. Other languages require their respective engines or validators.
      </p>
    </div>
  );
}
