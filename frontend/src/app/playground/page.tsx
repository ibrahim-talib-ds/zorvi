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
import { GripHorizontal, GripVertical, Play, RotateCcw, Terminal, X } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const PG_KEY = "IBRANT_PLAYGROUND_V1";
const PG_LANG_KEY = "IBRANT_PLAYGROUND_LANGUAGES_V1";
const PG_TABS_KEY = "IBRANT_PLAYGROUND_TABS_V2";

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
  tabId?: string;
}

interface EditorTab {
  id: string;
  name: string;
  language: string;
  core?: boolean;
  projectPath?: string;
  handle?: FileSystemFileHandle;
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

const DEFAULT_EDITOR_TABS: EditorTab[] = [
  { id: "html", name: "index.html", language: "html", core: true },
  { id: "css", name: "style.css", language: "css", core: true },
  { id: "javascript", name: "script.js", language: "javascript", core: true },
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
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>(DEFAULT_EDITOR_TABS);
  const [activeTabId, setActiveTabId] = useState("html");
  const [runningPythonTabs, setRunningPythonTabs] = useState<string[]>([]);
  const [srcDoc, setSrcDoc] = useState<string>(() => build(DEFAULT_CODE));
  const [autoRun, setAutoRun] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [editorShare, setEditorShare] = useState(56);
  const [terminalHeight, setTerminalHeight] = useState(250);

  const [projectTree, setProjectTree] = useState<ProjectNode[]>([]);
  const [projectRootName, setProjectRootName] = useState("");
  const [activeProjectFile, setActiveProjectFile] =
    useState<FileSystemFileHandle | null>(null);
  const [activeProjectPath, setActiveProjectPath] = useState("");
  const [projectFileContent, setProjectFileContent] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const nextTabCounterRef = useRef(1);
  const workspaceSplitRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const previewReadyRef = useRef(false);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map<number, number>());
  const pythonWorkersRef = useRef(new Map<string, Worker>());
  const pythonRunTimeoutsRef = useRef(new Map<string, number>());
  const pythonBusyRef = useRef(new Set<string>());

  const clearPendingRequests = () => {
    for (const timer of pendingRequestsRef.current.values()) {
      window.clearTimeout(timer);
    }
    pendingRequestsRef.current.clear();
  };
  const logsRef = useRef<HTMLDivElement | null>(null);
  const runRef = useRef<() => void>(() => {});

  const pushLog = (level: LogLine["level"], text: string, tabId = activeTabId) => {
    setLogs((prev) => [
      ...prev.slice(-499),
      {
        level,
        text,
        tabId,
        t: new Date().toLocaleTimeString([], { hour12: false }),
      },
    ]);
  };

  const activateEditorTab = (tab: EditorTab) => {
    setActiveTabId(tab.id);
    setActiveLanguage(tab.language);
    setActiveProjectFile(tab.handle ?? null);
    setActiveProjectPath(tab.projectPath ?? "");
    setProjectFileContent(tab.handle ? extraCode[tab.id] ?? "" : "");
  };

  const createLanguageTab = (language: string) => {
    if (!language) return;

    const label = EXTRA_LANGUAGES.find((item) => item.id === language)?.label ?? language;
    const number = editorTabs.filter((tab) => tab.language === language).length + 1;
    const id = `${language}-${Date.now()}-${nextTabCounterRef.current++}`;
    const tab: EditorTab = { id, name: `${label} ${number}`, language };

    setEditorTabs((prev) => [...prev, tab]);
    setExtraCode((prev) => ({
      ...prev,
      [id]: LANGUAGE_STARTERS[language] ?? "",
    }));
    setActiveTabId(id);
    setActiveLanguage(language);
    setActiveProjectFile(null);
    setActiveProjectPath("");
    setProjectFileContent("");
  };

  const stopPythonTab = (tabId: string, showMessage = true) => {
    const worker = pythonWorkersRef.current.get(tabId);
    worker?.terminate();
    pythonWorkersRef.current.delete(tabId);

    const timer = pythonRunTimeoutsRef.current.get(tabId);
    if (timer !== undefined) window.clearTimeout(timer);
    pythonRunTimeoutsRef.current.delete(tabId);

    pythonBusyRef.current.delete(tabId);
    setRunningPythonTabs((prev) => prev.filter((id) => id !== tabId));

    if (showMessage) pushLog("warn", "Execution stopped.", tabId);
  };

  const closeEditorTab = (tabId: string) => {
    const tab = editorTabs.find((item) => item.id === tabId);
    if (!tab || tab.core) return;

    stopPythonTab(tabId, false);
    setEditorTabs((prev) => prev.filter((item) => item.id !== tabId));
    setExtraCode((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setLogs((prev) => prev.filter((line) => line.tabId !== tabId));

    if (activeTabId === tabId) {
      const fallback = editorTabs.find((item) => item.core) ?? DEFAULT_EDITOR_TABS[0];
      activateEditorTab(fallback);
    }
  };


  const startEditorResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const element = workspaceSplitRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const move = (pointer: PointerEvent) => {
      const ratio = ((pointer.clientX - rect.left) / rect.width) * 100;
      setEditorShare(Math.round(Math.max(28, Math.min(72, ratio))));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const startTerminalResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = terminalHeight;
    const panelHeight = rightPanelRef.current?.getBoundingClientRect().height ?? 700;
    const maxHeight = Math.min(560, Math.max(180, panelHeight * 0.72));

    const move = (pointer: PointerEvent) => {
      const nextHeight = startHeight + startY - pointer.clientY;
      setTerminalHeight(Math.round(Math.max(130, Math.min(maxHeight, nextHeight))));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
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
      const existing = editorTabs.find((tab) => tab.projectPath === node.path);
      if (existing) {
        activateEditorTab(existing);
        return;
      }

      const handle = node.handle as FileSystemFileHandle;
      const file = await handle.getFile();
      const content = await file.text();
      const language = languageFromFileName(node.name);
      const id = `project-${Date.now()}-${nextTabCounterRef.current++}`;
      const tab: EditorTab = {
        id,
        name: node.name,
        language,
        projectPath: node.path,
        handle,
      };

      setEditorTabs((prev) => [...prev, tab]);
      setExtraCode((prev) => ({ ...prev, [id]: content }));
      setActiveTabId(id);
      setActiveLanguage(language);
      setActiveProjectFile(handle);
      setActiveProjectPath(node.path);
      setProjectFileContent(content);
      pushLog("sys", `Opened file: ${node.path}`, id);
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

  const runPythonCode = (source: string, tabId: string) => {
    if (pythonBusyRef.current.has(tabId)) {
      pushLog("warn", "Python is already running in this tab.", tabId);
      return;
    }

    let worker = pythonWorkersRef.current.get(tabId);

    if (!worker) {
      worker = new Worker("/workers/ibrant-python.worker.js", { type: "module" });
      pythonWorkersRef.current.set(tabId, worker);

      worker.onmessage = (event: MessageEvent<{ type?: string; text?: string }>) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "stdout") {
          pushLog("out", data.text ?? "", tabId);
        } else if (data.type === "stderr") {
          pushLog("error", data.text ?? "", tabId);
        } else if (data.type === "result") {
          pushLog("out", `=> ${data.text ?? ""}`, tabId);
        } else if (data.type === "error") {
          pushLog("error", data.text || "Python execution failed.", tabId);
        } else if (data.type === "complete") {
          const timer = pythonRunTimeoutsRef.current.get(tabId);
          if (timer !== undefined) window.clearTimeout(timer);
          pythonRunTimeoutsRef.current.delete(tabId);
          pythonBusyRef.current.delete(tabId);
          setRunningPythonTabs((prev) => prev.filter((id) => id !== tabId));
        }
      };

      worker.onerror = (event) => {
        const timer = pythonRunTimeoutsRef.current.get(tabId);
        if (timer !== undefined) window.clearTimeout(timer);
        pythonRunTimeoutsRef.current.delete(tabId);
        pythonBusyRef.current.delete(tabId);
        setRunningPythonTabs((prev) => prev.filter((id) => id !== tabId));
        worker?.terminate();
        pythonWorkersRef.current.delete(tabId);
        pushLog("error", event.message || "Python worker failed.", tabId);
      };
    }

    pythonBusyRef.current.add(tabId);
    setRunningPythonTabs((prev) => prev.includes(tabId) ? prev : [...prev, tabId]);

    const timeout = window.setTimeout(() => {
      stopPythonTab(tabId, false);
      pushLog("error", "Python stopped: execution exceeded 60 seconds.", tabId);
    }, 60000);

    pythonRunTimeoutsRef.current.set(tabId, timeout);

    try {
      worker.postMessage({ code: source });
    } catch (error) {
      stopPythonTab(tabId, false);
      pushLog("error", error instanceof Error ? error.message : String(error), tabId);
    }
  };

  const run = async () => {
    const activeSource = activeProjectFile
      ? projectFileContent
      : extraCode[activeTabId] ?? LANGUAGE_STARTERS[activeLanguage] ?? "";

    if (activeLanguage === "json") {
      try {
        const parsed = JSON.parse(activeSource);
        pushLog("out", "Valid JSON.");
        pushLog("out", JSON.stringify(parsed, null, 2));
      } catch (error) {
        pushLog("error", error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (activeLanguage === "xml") {
      try {
        const xml = activeSource;
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
        const source = activeSource;

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
      runPythonCode(activeSource, activeTabId);
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
      for (const timer of pythonRunTimeoutsRef.current.values()) {
        window.clearTimeout(timer);
      }
      for (const worker of pythonWorkersRef.current.values()) {
        worker.terminate();
      }
      pythonRunTimeoutsRef.current.clear();
      pythonWorkersRef.current.clear();
      pythonBusyRef.current.clear();
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

  // Restore scratch tabs. Project-file handles are intentionally session-only.
  useEffect(() => {
    try {
      const savedTabsRaw = localStorage.getItem(PG_TABS_KEY);

      if (savedTabsRaw) {
        const saved = JSON.parse(savedTabsRaw) as {
          tabs?: EditorTab[];
          buffers?: Record<string, string>;
          activeTabId?: string;
        };
        const validTabs = (saved.tabs ?? []).filter((tab) =>
          tab &&
          typeof tab.id === "string" &&
          typeof tab.name === "string" &&
          typeof tab.language === "string" &&
          EXTRA_LANGUAGES.some((language) => language.id === tab.language) &&
          !tab.handle &&
          !tab.projectPath
        );

        setEditorTabs([...DEFAULT_EDITOR_TABS, ...validTabs]);
        setExtraCode(saved.buffers ?? {});

        const restoredActive = validTabs.find((tab) => tab.id === saved.activeTabId);
        if (restoredActive) {
          setActiveTabId(restoredActive.id);
          setActiveLanguage(restoredActive.language);
        }
        return;
      }

      // Migrate previously saved one-buffer-per-language work.
      const legacyRaw = localStorage.getItem(PG_LANG_KEY);
      if (!legacyRaw) return;

      const legacy = JSON.parse(legacyRaw) as {
        activeLanguage?: string;
        extraCode?: Record<string, string>;
      };
      const restoredTabs: EditorTab[] = [];
      const restoredBuffers: Record<string, string> = {};
      let activeRestoredId = "";

      Object.entries(legacy.extraCode ?? {}).forEach(([language, source], index) => {
        if (!EXTRA_LANGUAGES.some((item) => item.id === language)) return;
        const label = EXTRA_LANGUAGES.find((item) => item.id === language)?.label ?? language;
        const id = `${language}-restored-${index + 1}`;
        restoredTabs.push({ id, name: `${label} ${index + 1}`, language });
        restoredBuffers[id] = source;
        if (language === legacy.activeLanguage) activeRestoredId = id;
      });

      if (restoredTabs.length) {
        setEditorTabs([...DEFAULT_EDITOR_TABS, ...restoredTabs]);
        setExtraCode(restoredBuffers);
      }
      if (activeRestoredId) {
        setActiveTabId(activeRestoredId);
        setActiveLanguage(legacy.activeLanguage ?? "html");
      }
    } catch {
      // Ignore invalid saved workspace data.
    }
  }, []);

  // Save independent scratch tabs and their buffers locally.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const persistentTabs = editorTabs.filter((tab) => !tab.core && !tab.handle && !tab.projectPath);
        const buffers = Object.fromEntries(
          persistentTabs.map((tab) => [tab.id, extraCode[tab.id] ?? ""])
        );
        const saveActiveTabId = persistentTabs.some((tab) => tab.id === activeTabId)
          ? activeTabId
          : "html";

        localStorage.setItem(
          PG_TABS_KEY,
          JSON.stringify({
            tabs: persistentTabs.map(({ id, name, language }) => ({ id, name, language })),
            buffers,
            activeTabId: saveActiveTabId,
          })
        );
      } catch {
        // Ignore local storage quota or privacy-mode errors.
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [editorTabs, extraCode, activeTabId]);

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
          pushLog(d.level, d.text, "web");
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
      setLogs((prev) => prev.filter((line) => line.tabId !== activeTabId));
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
    for (const timer of pythonRunTimeoutsRef.current.values()) {
      window.clearTimeout(timer);
    }
    for (const worker of pythonWorkersRef.current.values()) {
      worker.terminate();
    }
    pythonRunTimeoutsRef.current.clear();
    pythonWorkersRef.current.clear();
    pythonBusyRef.current.clear();
    setRunningPythonTabs([]);
    clearPendingRequests();
    previewReadyRef.current = false;
    setCode(DEFAULT_CODE);
    setActiveLanguage("html");
    setEditorTabs(DEFAULT_EDITOR_TABS);
    setActiveTabId("html");
    setExtraCode({});
    setSrcDoc(build(DEFAULT_CODE));
    setLogs([]);
    try {
      localStorage.removeItem(PG_KEY);
      localStorage.removeItem(PG_LANG_KEY);
      localStorage.removeItem(PG_TABS_KEY);
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
    setActiveTabId("html");
    setActiveProjectFile(null);
    setActiveProjectPath("");
    setProjectFileContent("");
    setSrcDoc(build(ex.code));
    pushLog("sys", `Example loaded: ${ex.name}`);
  };

  const isWebLanguage = ["html", "css", "javascript"].includes(activeLanguage);
  const isWebPreviewLanguage = isWebLanguage || activeLanguage === "typescript";
  const activeTabKey: keyof Code =
    activeLanguage === "javascript" ? "js" :
    activeLanguage === "css" ? "css" : "html";
  const activeEditorTab = editorTabs.find((tab) => tab.id === activeTabId) ?? DEFAULT_EDITOR_TABS[0];
  const pythonRunning = runningPythonTabs.includes(activeTabId);
  const visibleLogs = logs.filter((line) => !line.tabId || line.tabId === activeTabId || line.tabId === "web");

  const editorValue = activeProjectFile
    ? projectFileContent
    : isWebLanguage
      ? code[activeTabKey]
      : extraCode[activeTabId] ?? LANGUAGE_STARTERS[activeLanguage] ?? "";

  const updateEditorValue = (value: string | undefined) => {
    const next = value ?? "";

    if (activeProjectFile) {
      setProjectFileContent(next);
      setExtraCode((prev) => ({ ...prev, [activeTabId]: next }));
    } else if (isWebLanguage) {
      setCode((prev) => ({ ...prev, [activeTabKey]: next }));
    } else {
      setExtraCode((prev) => ({ ...prev, [activeTabId]: next }));
      if (activeProjectFile) setProjectFileContent(next);
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
            onClick={() => runRef.current()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#7559E8]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={13} fill="currentColor" /> {pythonRunning ? "Running…" : "Run"} <span className="hidden opacity-70 sm:inline">Ctrl+↵</span>
          </button>
          {activeLanguage === "python" && pythonRunning && (
            <button
              type="button"
              onClick={() => stopPythonTab(activeTabId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 px-3 py-2 text-xs font-semibold text-[#FF9AA6] transition hover:bg-[#F05D70]/20"
            >
              Stop
            </button>
          )}
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
        <div
          ref={workspaceSplitRef}
          className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 lg:h-full lg:grid-cols-[minmax(0,var(--pg-editor))_12px_minmax(0,var(--pg-preview))] lg:gap-0"
          style={{
            "--pg-editor": `${editorShare}fr`,
            "--pg-preview": `${100 - editorShare}fr`,
          } as React.CSSProperties}
        >
        {/* editor */}
        <section className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] lg:h-full lg:min-h-0">
          <div className="flex min-h-[46px] shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 bg-[#0A0E24] px-2">
            {editorTabs.map((tab) => {
              const selected = tab.id === activeTabId;
              const tabRunning = runningPythonTabs.includes(tab.id);

              return (
                <div
                  key={tab.id}
                  className={`group flex shrink-0 items-center gap-1 rounded-t-lg border-b-2 px-2 ${
                    selected
                      ? "border-[#A78BFA] bg-white/[0.06] text-white"
                      : "border-transparent text-[#7A8199] hover:bg-white/[0.04] hover:text-[#D7DDF3]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => activateEditorTab(tab)}
                    title={tab.projectPath ?? tab.name}
                    aria-current={selected ? "page" : undefined}
                    className="flex min-h-9 items-center gap-2 py-1 font-mono text-xs"
                  >
                    {tabRunning && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22C58B]" />
                    )}
                    <span>{tab.name}</span>
                  </button>

                  {!tab.core && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeEditorTab(tab.id);
                      }}
                      aria-label={`Close ${tab.name}`}
                      title={`Close ${tab.name}`}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[#687087] transition hover:bg-white/10 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            <select
              defaultValue=""
              onChange={(event) => {
                const language = event.currentTarget.value;
                if (language) createLanguageTab(language);
                event.currentTarget.value = "";
              }}
              aria-label="Create another language tab"
              className="ml-2 min-w-[116px] rounded-md border border-white/10 bg-[#0B0F1D] px-2 py-1.5 text-[11px] text-[#B7BDD0] outline-none focus:border-[#7559E8]"
            >
              <option value="" disabled>+ New tab…</option>
              {EXTRA_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>

            <span className="ml-auto hidden shrink-0 px-2 text-right font-mono text-[10px] text-[#687087] xl:inline">
              {activeLanguage === "python"
                ? pythonRunning ? "Python · Running" : "Python · WebAssembly"
                : isWebLanguage ? "Web preview · Ctrl+↵"
                : ["json", "xml"].includes(activeLanguage) ? "Validator · Ctrl+↵"
                : "Editor · Ctrl+↵"}
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

        <div
          role="separator"
          aria-label="Resize editor and preview"
          aria-orientation="vertical"
          aria-valuenow={editorShare}
          onPointerDown={startEditorResize}
          className="hidden min-w-0 cursor-col-resize items-center justify-center text-[#59617A] transition hover:text-[#A78BFA] lg:flex"
          style={{ touchAction: "none" }}
        >
          <GripVertical size={17} />
        </div>

        {/* preview + terminal */}
        <section
          ref={rightPanelRef}
          className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0"
        >
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

          <div
            role="separator"
            aria-label="Resize preview and terminal"
            aria-orientation="horizontal"
            aria-valuenow={terminalHeight}
            onPointerDown={startTerminalResize}
            className="flex h-3 shrink-0 cursor-row-resize items-center justify-center text-[#59617A] transition hover:text-[#A78BFA]"
            style={{ touchAction: "none" }}
          >
            <GripHorizontal size={18} />
          </div>

          <div
            style={{ height: terminalHeight }}
            className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0A0E24]"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-2.5">
              <Terminal size={13} className="text-[#A78BFA]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A8199]">Terminal · {activeEditorTab.name}</span>
            </div>
            <div ref={logsRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-2 font-mono text-[12px] leading-relaxed">
              {visibleLogs.length === 0 ? (
                <p className="italic text-[#3D4568]">Console output from your code shows up here. Type <span className="text-[#A78BFA]">help</span> below.</p>
              ) : (
                visibleLogs.map((l, i) => (
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
      </div>

      <p className="mx-auto mt-3 max-w-[1600px] text-center text-[11px] text-[#7A8199]">
        Your code saves automatically on this device. HTML, CSS and JavaScript run in a sandboxed browser preview. Python runs through WebAssembly. JSON and XML have validation. Other languages require their respective engines or validators.
      </p>
    </div>
  );
}
