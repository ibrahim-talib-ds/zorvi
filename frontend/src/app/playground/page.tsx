"use client";

// app/playground/page.tsx - ibrant Code Playground (v15, NEW PAGE)
//
// A real, self-contained coding workspace: editor + live preview + terminal.
//   - Editor: HTML / CSS / JS tabs, line numbers, Tab indents, Ctrl+Enter runs
//   - Preview: sandboxed live iframe, rebuilt on Run (or auto-run)
//   - Terminal: REAL console capture from the running code (log/info/warn/error,
//     runtime errors, promise rejections) + a REPL - anything you type is
//     evaluated inside the preview frame. `clear` and `help` are built in.
//   - Scratch tabs are saved locally; Build Studio projects sync to the account API.
//
// Uses the existing Monaco, sandboxed preview and Python runner. Account-backed
// projects are loaded from Build Studio; local folders use the File System Access API.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDownToLine, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, File, FileCode2, FilePlus2, Folder, FolderOpen, GripHorizontal, GripVertical, Loader2, Play, RotateCcw, Save, Terminal, X } from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const PG_KEY = "ibrant_PLAYGROUND_V1";
const PG_LANG_KEY = "ibrant_PLAYGROUND_LANGUAGES_V1";
const PG_TABS_KEY = "ibrant_PLAYGROUND_TABS_V2";

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
  python: 'def main():\n    print("Hello from ibrant!")\n\nif __name__ == "__main__":\n    main()\n',
  typescript: 'const greeting: string = "Hello from ibrant!";\nconsole.log(greeting);\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from ibrant!");\n    }\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from ibrant!" << std::endl;\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello from ibrant!\\n");\n    return 0;\n}\n',
  sql: 'SELECT "Hello from ibrant!" AS greeting;\n',
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
  cloudProject?: boolean;
}

interface CloudProjectFile {
  path: string;
  content: string;
}
interface CloudProject {
  id: string;
  name: string;
  description: string | null;
  template: string;
  files: CloudProjectFile[];
}

type CloudCorePaths = { html: string; css: string; javascript: string };

interface ProjectNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  children?: ProjectNode[];
}

interface CloudProjectTreeNode {
  name: string;
  path: string;
  kind: "directory" | "file";
  children?: CloudProjectTreeNode[];
}

function buildCloudProjectTree(paths: string[]): CloudProjectTreeNode[] {
  const root: CloudProjectTreeNode[] = [];
  const directories = new Map<string, CloudProjectTreeNode>();

  for (const rawPath of paths) {
    const parts = rawPath.split("/").filter(Boolean);
    let parent = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isDirectory = index < parts.length - 1;
      if (isDirectory) {
        let directory = directories.get(currentPath);
        if (!directory) {
          directory = { name: part, path: currentPath, kind: "directory", children: [] };
          directories.set(currentPath, directory);
          parent.push(directory);
        }
        parent = directory.children!;
      } else {
        parent.push({ name: part, path: currentPath, kind: "file" });
      }
    });
  }

  const sortNodes = (nodes: CloudProjectTreeNode[]) => {
    nodes.sort((a, b) => a.kind !== b.kind
      ? a.kind === "directory" ? -1 : 1
      : a.name.localeCompare(b.name));
    nodes.forEach((node) => { if (node.children) sortNodes(node.children); });
  };
  sortNodes(root);
  return root;
}

function CloudProjectTreeItem({
  node, activePath, onOpen,
}: {
  node: CloudProjectTreeNode;
  activePath: string;
  onOpen: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (node.kind === "directory") {
    return (
      <div>
        <button type="button" onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] text-[#C5CAD8] transition hover:bg-white/[0.06]">
          {expanded ? <ChevronDown size={13} className="shrink-0 text-[#8C93A8]" /> : <ChevronRight size={13} className="shrink-0 text-[#8C93A8]" />}
          {expanded ? <FolderOpen size={14} className="shrink-0 text-[#D6A85C]" /> : <Folder size={14} className="shrink-0 text-[#D6A85C]" />}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && <div className="ml-[13px] border-l border-white/[0.08] pl-2">
          {node.children?.map((child) => <CloudProjectTreeItem key={child.path} node={child} activePath={activePath} onOpen={onOpen} />)}
        </div>}
      </div>
    );
  }
  const extension = node.name.split(".").pop()?.toLowerCase();
  return (
    <button type="button" onClick={() => onOpen(node.path)} title={node.path}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition ${activePath === node.path ? "bg-[#7559E8]/25 text-white" : "text-[#9CA5BE] hover:bg-white/[0.06] hover:text-white"}`}>
      {extension === "dart" || extension === "tsx" || extension === "ts" || extension === "js" || extension === "py"
        ? <FileCode2 size={14} className="shrink-0 text-[#8EA9E8]" />
        : <File size={14} className="shrink-0 text-[#7A8199]" />}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

const LOCAL_PROJECT_MAX_FILES = 1500;
const LOCAL_PROJECT_MAX_DEPTH = 12;
const LOCAL_PROJECT_MAX_TEXT_BYTES = 2 * 1024 * 1024;
const LOCAL_PROJECT_SKIP_DIRECTORIES = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".turbo", ".cache", ".dart_tool", ".gradle", "Pods", "target",
  "vendor", ".venv", "venv", "__pycache__",
]);
const LOCAL_PROJECT_BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "pdf", "zip",
  "gz", "7z", "rar", "exe", "dll", "so", "dylib", "mp3", "mp4",
  "mov", "wav", "woff", "woff2", "ttf", "otf", "eot", "class", "jar",
]);

function isSensitiveProjectFile(name: string) {
  const lower = name.toLowerCase();
  return lower === ".env"
    || (lower.startsWith(".env.") && lower !== ".env.example")
    || ["id_rsa", "id_ed25519", "authorized_keys"].includes(lower)
    || lower.endsWith(".pem")
    || lower.endsWith(".key");
}

async function readProjectTree(
  directory: FileSystemDirectoryHandle,
  parentPath = "",
  depth = 0,
  budget = { remaining: LOCAL_PROJECT_MAX_FILES },
): Promise<ProjectNode[]> {
  const nodes: ProjectNode[] = [];
  if (depth > LOCAL_PROJECT_MAX_DEPTH || budget.remaining <= 0) return nodes;

  const directoryWithEntries = directory as unknown as {
    entries(): AsyncIterableIterator<
      [string, FileSystemDirectoryHandle | FileSystemFileHandle]
    >;
  };

  for await (const [name, handle] of directoryWithEntries.entries()) {
    if (budget.remaining <= 0) break;
    if (handle.kind === "directory" && LOCAL_PROJECT_SKIP_DIRECTORIES.has(name.toLowerCase())) continue;
    if (handle.kind === "file" && isSensitiveProjectFile(name)) continue;
    if (handle.kind === "file") {
      const extension = name.split(".").pop()?.toLowerCase() ?? "";
      if (LOCAL_PROJECT_BINARY_EXTENSIONS.has(extension)) continue;
    }

    budget.remaining -= 1;
    const path = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === "directory") {
      const dir = handle as FileSystemDirectoryHandle;
      nodes.push({
        name,
        path,
        kind: "directory",
        handle: dir,
        children: await readProjectTree(dir, path, depth + 1, budget),
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
    html: "html", htm: "html", css: "css", js: "javascript", jsx: "javascript",
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
  <span class="tag">ibrant Playground</span>
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
  const { token } = useAuth();
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
  const [localAgentToken, setLocalAgentToken] = useState("");
  const [localAgentWorkspace, setLocalAgentWorkspace] = useState("");
  const [runtimePreviewUrl, setRuntimePreviewUrl] = useState("");
  const [runtimeSessionId, setRuntimeSessionId] = useState("");
  const [runtimeStarting, setRuntimeStarting] = useState(false);
  const [editorShare, setEditorShare] = useState(56);
  const [terminalHeight, setTerminalHeight] = useState(320);

  const [projectTree, setProjectTree] = useState<ProjectNode[]>([]);
  const [projectRootName, setProjectRootName] = useState("");
  const [activeProjectFile, setActiveProjectFile] =
    useState<FileSystemFileHandle | null>(null);
  const [activeProjectPath, setActiveProjectPath] = useState("");
  const [projectFileContent, setProjectFileContent] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);
  const [cloudProject, setCloudProject] = useState<CloudProject | null>(null);
  const [cloudProjectPaths, setCloudProjectPaths] = useState<string[]>([]);
  const [cloudProjectFiles, setCloudProjectFiles] = useState<Record<string, string>>({});
  const [cloudCorePaths, setCloudCorePaths] = useState<CloudCorePaths>({ html: "", css: "", javascript: "" });
  const [cloudProjectLoading, setCloudProjectLoading] = useState(false);
  const [cloudProjectStatus, setCloudProjectStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [cloudProjectError, setCloudProjectError] = useState("");
  const [cloudProjectDirty, setCloudProjectDirty] = useState(false);
  const cloudProjectReadyRef = useRef(false);
  const cloudEditRevisionRef = useRef(0);

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
  const saveProjectFileRef = useRef<() => void>(() => {});
  const saveCloudProjectRef = useRef<() => void>(() => {});

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

  // A project opened from the Build hub is loaded from the signed-in user's account.
  useEffect(() => {
    if (!token) return;
    const projectId = new URLSearchParams(window.location.search).get("project");
    if (!projectId) return;
    let active = true;
    cloudProjectReadyRef.current = false;
    setCloudProjectLoading(true);
    setCloudProjectError("");
    fetchWithAuth(`${API_BASE}/projects/${encodeURIComponent(projectId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<CloudProject>;
      })
      .then((project) => {
        if (!active) return;
        const files = Object.fromEntries((project.files ?? []).map((file) => [file.path, file.content]));
        const paths = Object.keys(files).sort((a, b) => a.localeCompare(b));
        const findPath = (names: string[]) => paths.find((path) => names.includes(path.toLowerCase()))
          ?? paths.find((path) => names.some((name) => path.toLowerCase().endsWith(`/${name}`)))
          ?? "";
        const corePaths: CloudCorePaths = {
          html: findPath(["index.html", "index.htm"]),
          css: findPath(["styles.css", "style.css", "main.css"]),
          javascript: findPath(["script.js", "main.js", "app.js"]),
        };
        const nextCode: Code = {
          html: corePaths.html ? files[corePaths.html] : "",
          css: corePaths.css ? files[corePaths.css] : "",
          js: corePaths.javascript ? files[corePaths.javascript] : "",
        };
        const corePathSet = new Set(Object.values(corePaths).filter(Boolean));
        const additionalFiles = paths.filter((path) => !corePathSet.has(path));
        const buffers: Record<string, string> = {};
        const projectTabs: EditorTab[] = additionalFiles.map((path, index) => {
          const id = `cloud-${project.id}-${index + 1}`;
          buffers[id] = files[path] ?? "";
          return { id, name: path.split("/").pop() || path, language: languageFromFileName(path), projectPath: path, cloudProject: true };
        });
        const isFlutterProject = paths.some((path) => path.toLowerCase() === "pubspec.yaml")
          && paths.some((path) => path.toLowerCase() === "lib/main.dart");
        const initialFile = project.template === "python"
          ? projectTabs.find((tab) => tab.language === "python")
          : isFlutterProject
            ? projectTabs.find((tab) => tab.projectPath?.toLowerCase() === "lib/main.dart")
            : undefined;
        setCloudProject(project);
        setCloudProjectFiles(files);
        setCloudProjectPaths(paths);
        setCloudCorePaths(corePaths);
        setProjectRootName(project.name);
        setProjectTree([]);
        setCode(nextCode);
        setEditorTabs([...DEFAULT_EDITOR_TABS.map((tab) => ({
          ...tab,
          name: tab.id === "html" ? (corePaths.html.split("/").pop() || "index.html")
            : tab.id === "css" ? (corePaths.css.split("/").pop() || "styles.css")
            : (corePaths.javascript.split("/").pop() || "script.js"),
          projectPath: corePaths[tab.id === "javascript" ? "javascript" : tab.id as "html" | "css"] || undefined,
          cloudProject: true,
        })), ...projectTabs]);
        setExtraCode(buffers);
        setActiveProjectFile(null);
        setProjectFileContent(initialFile?.projectPath ? files[initialFile.projectPath] ?? "" : "");
        setActiveProjectPath(initialFile?.projectPath ?? "");
        setActiveTabId(initialFile?.id ?? "html");
        setActiveLanguage(initialFile?.language ?? "html");
        cloudEditRevisionRef.current = 0;
        setCloudProjectDirty(false);
        setCloudProjectStatus("saved");
        cloudProjectReadyRef.current = true;
        setSrcDoc(build(nextCode));
        setLogs([]);
      })
      .catch((error) => {
        if (!active) return;
        setCloudProjectError(error instanceof Error ? error.message : "Unable to open this project.");
        setCloudProjectStatus("error");
      })
      .finally(() => { if (active) setCloudProjectLoading(false); });
    return () => { active = false; };
  }, [token]);

  const activateEditorTab = (tab: EditorTab) => {
    setActiveTabId(tab.id);
    setActiveLanguage(tab.language);
    setActiveProjectFile(tab.handle ?? null);
    setActiveProjectPath(tab.projectPath ?? "");
    setProjectFileContent(tab.handle || (tab.cloudProject && !tab.core) ? extraCode[tab.id] ?? "" : "");
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

  // A learner can send a lesson's code example straight into a fresh editor tab.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("handoff") !== "lesson") return;
    const raw = localStorage.getItem("ibrant_PLAYGROUND_HANDOFF_V1");
    if (!raw) return;
    try {
      const handoff = JSON.parse(raw) as { code?: string; language?: string; title?: string };
      if (typeof handoff.code !== "string") throw new Error("Lesson example is missing code.");
      localStorage.removeItem("ibrant_PLAYGROUND_HANDOFF_V1");
      const language = languageFromFileName(`example.${(handoff.language || "python").toLowerCase()}`);
      const title = (handoff.title || "Lesson example").slice(0, 60);
      if (["html", "css", "javascript"].includes(language)) {
        const key = language === "javascript" ? "js" : language;
        setCode((current) => ({ ...current, [key]: handoff.code! }));
        setActiveTabId(language === "javascript" ? "javascript" : language);
        setActiveLanguage(language);
      } else {
        const id = `lesson-${Date.now()}-${nextTabCounterRef.current++}`;
        const tab: EditorTab = { id, name: title || `${language} lesson`, language };
        setEditorTabs((current) => [...current, tab]);
        setExtraCode((current) => ({ ...current, [id]: handoff.code! }));
        setActiveTabId(id);
        setActiveLanguage(language);
      }
      setActiveProjectFile(null);
      setActiveProjectPath("");
      setProjectFileContent("");
      setCloudProject(null);
      pushLog("sys", `Lesson example opened: ${title}`);
    } catch (error) {
      setCloudProjectError(error instanceof Error ? error.message : "Unable to open the lesson example.");
    }
  }, []);

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
    if (cloudProject && tab.cloudProject && tab.projectPath) {
      cloudEditRevisionRef.current += 1;
      const latestContent = extraCode[tabId] ?? "";
      setCloudProjectFiles((current) => ({ ...current, [tab.projectPath!]: latestContent }));
      setCloudProjectDirty(true);
    }
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
      showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
    };

    if (!pickerWindow.showDirectoryPicker) {
      pushLog("error", "Folder access is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      if (cloudProject && cloudProjectDirty && !window.confirm("You have unsaved account project changes. Switch to a local folder and discard those changes?")) return;
      setProjectBusy(true);
      const directory = await pickerWindow.showDirectoryPicker({ mode: "readwrite" });
      const tree = await readProjectTree(directory);

      cloudProjectReadyRef.current = false;
      setCloudProject(null);
      setCloudProjectFiles({});
      setCloudProjectPaths([]);
      setCloudCorePaths({ html: "", css: "", javascript: "" });
      cloudEditRevisionRef.current = 0;
      setCloudProjectDirty(false);
      setCloudProjectStatus("idle");
      setCloudProjectError("");
      setEditorTabs(DEFAULT_EDITOR_TABS);
      setExtraCode({});
      setActiveTabId("html");
      setActiveLanguage("html");
      setCode(DEFAULT_CODE);
      setProjectTree(tree);
      setProjectRootName(directory.name);
      setActiveProjectFile(null);
      setActiveProjectPath("");
      setProjectFileContent("");
      pushLog("sys", `Opened project folder: ${directory.name}`);
      pushLog("sys", "Local folder scan skips environment files, private keys, binary assets, and generated dependency folders.");
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
      if (file.size > LOCAL_PROJECT_MAX_TEXT_BYTES) {
        throw new Error("This file is larger than the 2 MB browser editor limit. Edit it in a desktop code editor.");
      }
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

  saveProjectFileRef.current = () => { void saveProjectFile(); };

  const collectCloudProjectFiles = () => {
    if (!cloudProject) return [] as CloudProjectFile[];
    const files: Record<string, string> = { ...cloudProjectFiles };
    if (cloudCorePaths.html) files[cloudCorePaths.html] = code.html;
    if (cloudCorePaths.css) files[cloudCorePaths.css] = code.css;
    if (cloudCorePaths.javascript) files[cloudCorePaths.javascript] = code.js;
    for (const tab of editorTabs) {
      if (tab.cloudProject && !tab.core && tab.projectPath) {
        files[tab.projectPath] = extraCode[tab.id] ?? "";
      }
    }
    return Object.entries(files).map(([path, content]) => ({ path, content }));
  };

  const saveCloudProject = async () => {
    if (!cloudProject || !token || !cloudProjectReadyRef.current) return;
    setCloudProjectStatus("saving");
    setCloudProjectError("");
    const savedRevision = cloudEditRevisionRef.current;
    try {
      const files = collectCloudProjectFiles();
      const response = await fetchWithAuth(`${API_BASE}/projects/${cloudProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!response.ok) throw new Error(await response.text());
      setCloudProjectFiles(Object.fromEntries(files.map((file) => [file.path, file.content])));
      setCloudProjectPaths(files.map((file) => file.path).sort((a, b) => a.localeCompare(b)));
      const hasNewerEdits = savedRevision !== cloudEditRevisionRef.current;
      setCloudProjectDirty(hasNewerEdits);
      setCloudProjectStatus(hasNewerEdits ? "unsaved" : "saved");
      return true;
    } catch (error) {
      setCloudProjectStatus("error");
      setCloudProjectError(error instanceof Error ? error.message : "Unable to save project.");
      return false;
    }
  };
  saveCloudProjectRef.current = () => { void saveCloudProject(); };
  // Monaco's Ctrl+S command is registered once; route it through a mutable ref
  // so it always saves the active local file or account-backed project.
  saveProjectFileRef.current = () => {
    if (cloudProject) void saveCloudProject();
    else void saveProjectFile();
  };

  useEffect(() => {
    if (!cloudProject || !cloudProjectDirty || !cloudProjectReadyRef.current || cloudProjectStatus === "saving") return;
    setCloudProjectStatus("unsaved");
    const timer = window.setTimeout(() => saveCloudProjectRef.current(), 1000);
    return () => window.clearTimeout(timer);
  }, [cloudProject, cloudProjectDirty, cloudProjectStatus, code, extraCode, editorTabs, cloudProjectFiles, cloudCorePaths]);

  const exportCloudProject = async () => {
    if (!cloudProject || !token) return;
    try {
      if (cloudProjectDirty) {
        const saved = await saveCloudProject();
        if (!saved) return;
      }
      const response = await fetchWithAuth(`${API_BASE}/projects/${cloudProject.id}/download`);
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${cloudProject.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "ibrant-project"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setCloudProjectError(error instanceof Error ? error.message : "Unable to export project.");
    }
  };

  const openCloudProjectFile = (path: string) => {
    if (!cloudProject) return;
    const coreEntry = (Object.entries(cloudCorePaths) as [keyof CloudCorePaths, string][]).find(([, filePath]) => filePath && filePath === path);
    if (coreEntry) {
      const tab = DEFAULT_EDITOR_TABS.find((item) => item.id === (coreEntry[0] === "javascript" ? "javascript" : coreEntry[0]));
      if (tab) {
        const mappedTab = editorTabs.find((item) => item.id === tab.id) ?? tab;
        activateEditorTab(mappedTab);
      }
      return;
    }
    const existing = editorTabs.find((tab) => tab.cloudProject && tab.projectPath === path);
    if (existing) { activateEditorTab(existing); return; }
    const id = `cloud-${cloudProject.id}-${Date.now()}-${nextTabCounterRef.current++}`;
    const name = path.split("/").pop() || path;
    const language = languageFromFileName(name);
    const content = cloudProjectFiles[path] ?? "";
    const tab: EditorTab = { id, name, language, projectPath: path, cloudProject: true };
    setEditorTabs((prev) => [...prev, tab]);
    setExtraCode((prev) => ({ ...prev, [id]: content }));
    setActiveTabId(id);
    setActiveLanguage(language);
    setActiveProjectFile(null);
    setActiveProjectPath(path);
    setProjectFileContent(content);
  };

  const addCloudProjectFile = () => {
    if (!cloudProject) return;
    const requested = window.prompt("New file path (example: src/app.js)");
    if (!requested) return;
    const path = requested.trim().replace(/\\/g, "/");
    const pathParts = path.split("/");
    if (!path || path.startsWith("/") || pathParts.some((part) => {
      const lowerPart = part.toLowerCase();
      return !part || part === "." || part === ".." || lowerPart === ".env"
        || (lowerPart.startsWith(".env.") && lowerPart !== ".env.example")
        || lowerPart.endsWith(".pem") || lowerPart.endsWith(".key")
        || ["id_rsa", "id_ed25519", "authorized_keys"].includes(lowerPart);
    }) || path.length > 180) {
      setCloudProjectError("Use a safe relative file path, such as src/app.js.");
      return;
    }
    if (cloudProjectPaths.includes(path)) {
      openCloudProjectFile(path);
      return;
    }
    cloudEditRevisionRef.current += 1;
    setCloudProjectFiles((prev) => ({ ...prev, [path]: "" }));
    setCloudProjectPaths((prev) => [...prev, path].sort((a, b) => a.localeCompare(b)));
    setCloudProjectDirty(true);
    openCloudProjectFile(path);
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

  const startCloudProjectPreview = async () => {
    if (!localAgentToken || !cloudProject) {
      pushLog("error", "Connect the local runtime first. No project was executed.");
      return;
    }
    const paths = cloudProjectPaths.map((path) => path.toLowerCase());
    const files = cloudProjectFiles;
    const packageText = Object.entries(files).find(([path]) => path.toLowerCase() === "package.json")?.[1];
    let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> } = {};
    try { if (packageText) packageJson = JSON.parse(packageText); } catch {
      pushLog("error", "package.json is invalid JSON. Fix it before running the project.");
      return;
    }
    const deps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
    const port = 4173;
    let command = "";
    let framework = "";
    if (paths.includes("pubspec.yaml") && paths.includes("lib/main.dart")) {
      framework = "Flutter Web";
      command = (paths.includes("web/index.html") ? "" : "flutter create --platforms=web . && ") +
        "flutter pub get && flutter run -d web-server --web-hostname 0.0.0.0 --web-port " + port;
    } else if (deps.next) {
      framework = "Next.js";
      command = "npm install --no-audit --no-fund && npm run dev -- --hostname 0.0.0.0 --port " + port;
    } else if (deps.vite) {
      framework = "Vite";
      command = "npm install --no-audit --no-fund && npm run dev -- --host 0.0.0.0 --port " + port + " --base __ibrant_PREVIEW_BASE__";
    } else if (packageJson.scripts?.dev) {
      framework = "Node.js web app";
      command = "npm install --no-audit --no-fund && npm run dev -- --host 0.0.0.0 --port " + port;
    } else if (paths.includes("manage.py")) {
      framework = "Django";
      command = "python -m pip install -r requirements.txt && python manage.py runserver 0.0.0.0:" + port;
    } else if (paths.includes("requirements.txt") &&
      (files["requirements.txt"] || "").toLowerCase().includes("fastapi")) {
      framework = "FastAPI (main:app)";
      command = "python -m pip install -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port " + port;
    } else if (paths.includes("requirements.txt") &&
      (files["requirements.txt"] || "").toLowerCase().includes("flask")) {
      framework = "Flask (app.py)";
      command = "python -m pip install -r requirements.txt && python -m flask --app app run --host 0.0.0.0 --port " + port;
    } else if (paths.some((path) => path.endsWith(".html"))) {
      framework = "Static web project";
      command = "python -m http.server " + port + " --bind 0.0.0.0";
    } else {
      pushLog("error", "No browser-preview adapter found. Supported: HTML, Vite, Next.js, Flutter Web, Django, FastAPI and Flask.");
      return;
    }
    setRuntimeStarting(true);
    setRuntimePreviewUrl("");
    pushLog("sys", "Preparing " + framework + " preview…");
    try {
      const auth = { Authorization: "Bearer " + localAgentToken };
      const health = await fetch("http://127.0.0.1:4317/health", { headers: auth });
      if (!health.ok) throw new Error("Local runtime authentication failed. Reconnect the runtime.");
      const healthInfo = await health.json();
      if (healthInfo.runtime_version !== 2) {
        throw new Error("Your local runtime agent is outdated. Stop it with Ctrl+C, restart tools/ibrant-local-agent/agent.py, then reconnect with its new token.");
      }
      if (runtimeSessionId) {
        await fetch("http://127.0.0.1:4317", {
          method: "DELETE", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: runtimeSessionId }),
        }).catch(() => undefined);
      }
      const projectName = cloudProject.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "ibrant-project";
      const synced = await fetch("http://127.0.0.1:4317/sync", {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, files }),
      });
      const syncResult = await synced.json();
      if (!synced.ok) throw new Error(syncResult.error || "Could not sync project files.");
      pushLog("out", "Synced " + syncResult.files_written + " project files to the local runtime.");
      const started = await fetch("http://127.0.0.1:4317/start", {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, command, port }),
      });
      const startResult = await started.json();
      if (!started.ok) throw new Error(startResult.error || "Could not start the project runtime.");
      setRuntimeSessionId(startResult.session_id);
      pushLog("sys", framework + " process started. Installing dependencies / waiting for the preview server…");
      let lastOutput = "";
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        if (attempt % 4 === 3) {
          const progressResponse = await fetch("http://127.0.0.1:4317/output/" + startResult.session_id, { headers: auth });
          if (progressResponse.ok) {
            const progress = await progressResponse.json();
            const currentOutput = String(progress.output || "");
            if (currentOutput.length > lastOutput.length) {
              const delta = currentOutput.slice(lastOutput.length).trim();
              if (delta) pushLog("out", delta.slice(-5000));
              lastOutput = currentOutput;
            }
          }
        }
        const readyResponse = await fetch("http://127.0.0.1:4317/ready/" + startResult.session_id, { headers: auth });
        if (!readyResponse.ok) throw new Error("Lost connection to the local preview runtime.");
        const ready = await readyResponse.json();
        if (ready.ready) {
          setRuntimePreviewUrl(startResult.preview_url);
          pushLog("out", framework + " is responding. Embedded preview connected.");
          return;
        }
        if (!ready.running) {
          const outputResponse = await fetch("http://127.0.0.1:4317/output/" + startResult.session_id, { headers: auth });
          const output = await outputResponse.json();
          if (output.output) pushLog("error", output.output.slice(-12000));
          throw new Error(framework + " exited before the preview server became ready.");
        }
      }
      const outputResponse = await fetch("http://127.0.0.1:4317/output/" + startResult.session_id, { headers: auth });
      const output = await outputResponse.json();
      if (output.output) pushLog("out", output.output.slice(-12000));
      throw new Error(framework + " did not open port " + port + " within 120 seconds.");
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "Could not start project preview.");
    } finally {
      setRuntimeStarting(false);
    }
  };

  const run = async () => {
    if (cloudProject && cloudProjectPaths.length > 0) {
      const packageText = cloudProjectFiles["package.json"];
      let hasWebServer = false;
      try {
        const parsed = packageText ? JSON.parse(packageText) as {
          dependencies?: Record<string,string>; devDependencies?: Record<string,string>; scripts?: Record<string,string>
        } : {};
        const deps = { ...parsed.dependencies, ...parsed.devDependencies };
        hasWebServer = Boolean(deps.next || deps.vite || parsed.scripts?.dev);
      } catch { /* invalid manifest is reported by the adapter */ }
      const requirements = (cloudProjectFiles["requirements.txt"] || "").toLowerCase();
      const pubspec = (cloudProjectFiles["pubspec.yaml"] || "").toLowerCase();
      const isRunnableProject = hasWebServer ||
        (pubspec.includes("flutter:") && cloudProjectPaths.includes("lib/main.dart")) ||
        cloudProjectPaths.some((path) => ["manage.py"].includes(path.toLowerCase())) ||
        requirements.includes("fastapi") || requirements.includes("flask") ||
        cloudProjectPaths.some((path) => path.toLowerCase().endsWith(".html"));
      if (isRunnableProject) {
        await startCloudProjectPreview();
        return;
      }
    }
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
    if (activeProjectFile) {
      const projectPreview: Code = {
        html: activeLanguage === "html" ? activeSource : "",
        css: activeLanguage === "css" ? activeSource : "",
        js: activeLanguage === "javascript" ? activeSource : "",
      };
      setSrcDoc(build(projectPreview));
      pushLog("out", `Preview updated from ${activeProjectPath || activeLanguage}.`);
      return;
    }
    if (cloudProject && activeProjectPath && !Object.values(cloudCorePaths).includes(activeProjectPath)) {
      const projectPreview: Code = {
        html: activeLanguage === "html" ? activeSource : "",
        css: activeLanguage === "css" ? activeSource : "",
        js: activeLanguage === "javascript" ? activeSource : "",
      };
      setSrcDoc(build(projectPreview));
      pushLog("out", `Preview updated from ${activeProjectPath}.`);
      return;
    }
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

  // Restore and persist workspace preferences independently from source buffers.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ibrant_PLAYGROUND_LAYOUT_V1") || "null");
      if (saved && typeof saved === "object") {
        if (Number.isFinite(saved.editorShare)) setEditorShare(Math.max(28, Math.min(72, saved.editorShare)));
        if (Number.isFinite(saved.terminalHeight)) setTerminalHeight(Math.max(260, Math.min(560, saved.terminalHeight)));
        if (typeof saved.autoRun === "boolean") setAutoRun(saved.autoRun);
      }
    } catch { /* Ignore invalid preferences. */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem("ibrant_PLAYGROUND_LAYOUT_V1", JSON.stringify({ editorShare, terminalHeight, autoRun })); }
      catch { /* Ignore storage quota or privacy-mode errors. */ }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [editorShare, terminalHeight, autoRun]);

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

  useEffect(() => {
    try { setLocalAgentToken(localStorage.getItem("ibrant_LOCAL_AGENT_TOKEN_V1") || ""); } catch { /* storage may be unavailable */ }
  }, []);

  const connectLocalRuntime = async () => {
    const entered = window.prompt("Paste the one-time token printed by your ibrant local runtime agent:", localAgentToken);
    if (!entered?.trim()) return;
    try {
      const response = await fetch("http://127.0.0.1:4317/health", { headers: { Authorization: `Bearer ${entered.trim()}` } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The local runtime did not authenticate.");
      if (result.runtime_version !== 2) throw new Error("Update your local runtime: stop the old agent with Ctrl+C, restart it from the updated project, then connect using its new token.");
      localStorage.setItem("ibrant_LOCAL_AGENT_TOKEN_V1", entered.trim());
      setLocalAgentToken(entered.trim());
      setLocalAgentWorkspace(String(result.workspace || "Local workspace"));
      pushLog("out", `Connected to local runtime: ${result.workspace}. Shell commands execute on this computer.`);
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "Could not connect to the local runtime. Start the agent and try again.");
    }
  };

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

  const execCommand = async () => {
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

    const isNativeProjectCommand = cloudProjectPaths.some((path) => path.toLowerCase() === "pubspec.yaml")
      && cloudProjectPaths.some((path) => path.toLowerCase() === "lib/main.dart");
    if (isNativeProjectCommand || isShellLanguage) {
      if (!localAgentToken) {
        pushLog("error", "Local runtime is NOT connected. Start tools/ibrant-local-agent/agent.py on your computer, then click Connect local runtime and paste its one-time token. No command was executed.");
        return;
      }
      try {
        const health = await fetch("http://127.0.0.1:4317/health", {
          headers: { Authorization: `Bearer ${localAgentToken}` },
        });
        if (!health.ok) {
          localStorage.removeItem("ibrant_LOCAL_AGENT_TOKEN_V1");
          setLocalAgentToken("");
          setLocalAgentWorkspace("");
          throw new Error("Local runtime authentication failed. Reconnect using the current token printed by the agent.");
        }
        const response = await fetch("http://127.0.0.1:4317/run", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localAgentToken}` },
          body: JSON.stringify({ command: src }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Local runtime returned HTTP ${response.status}`);
        if (result.stdout) pushLog("out", result.stdout.trimEnd());
        if (result.stderr) pushLog(result.exit_code === 0 ? "warn" : "error", result.stderr.trimEnd());
        pushLog(result.exit_code === 0 ? "sys" : "error", `Process exited with code ${result.exit_code} · ${result.cwd}`);
      } catch (error) {
        pushLog("error", error instanceof Error ? error.message : "Local runtime connection failed.");
      }
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

  const isFlutterProject = Boolean(
    cloudProjectPaths.some((path) => path.toLowerCase() === "pubspec.yaml")
      && cloudProjectPaths.some((path) => path.toLowerCase() === "lib/main.dart"),
  );
  const isWebLanguage = ["html", "css", "javascript"].includes(activeLanguage);
  const isShellLanguage = !["html", "css", "javascript", "typescript", "python", "json", "xml"].includes(activeLanguage);
  const isWebPreviewLanguage = isWebLanguage || activeLanguage === "typescript";
  const activeTabKey: keyof Code =
    activeLanguage === "javascript" ? "js" :
    activeLanguage === "css" ? "css" : "html";
  const activeEditorTab = editorTabs.find((tab) => tab.id === activeTabId) ?? DEFAULT_EDITOR_TABS[0];
  const pythonRunning = runningPythonTabs.includes(activeTabId);
  const visibleLogs = logs.filter((line) => !line.tabId || line.tabId === activeTabId || line.tabId === "web");

  const editorValue = activeProjectFile || (cloudProject && activeEditorTab.cloudProject && !activeEditorTab.core)
    ? projectFileContent
    : isWebLanguage
      ? code[activeTabKey]
      : extraCode[activeTabId] ?? LANGUAGE_STARTERS[activeLanguage] ?? "";

  const stopRuntimePreview = async () => {
    if (!runtimeSessionId || !localAgentToken) return;
    try {
      const response = await fetch("http://127.0.0.1:4317", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localAgentToken, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: runtimeSessionId }),
      });
      if (!response.ok) throw new Error("The local runtime could not stop this preview process.");
      setRuntimeSessionId("");
      setRuntimePreviewUrl("");
      pushLog("sys", "Preview process stopped.");
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "Could not stop preview.");
    }
  };

  const updateEditorValue = (value: string | undefined) => {
    const next = value ?? "";

    if (activeProjectFile || (cloudProject && activeEditorTab.cloudProject && !activeEditorTab.core)) {
      setProjectFileContent(next);
      setExtraCode((prev) => ({ ...prev, [activeTabId]: next }));
      if (cloudProject && activeEditorTab.cloudProject) {
        cloudEditRevisionRef.current += 1;
        setCloudProjectDirty(true);
      }
    } else if (isWebLanguage) {
      setCode((prev) => ({ ...prev, [activeTabKey]: next }));
      if (cloudProject) {
        cloudEditRevisionRef.current += 1;
        setCloudProjectDirty(true);
      }
    } else {
      setExtraCode((prev) => ({ ...prev, [activeTabId]: next }));
      if (cloudProject && activeEditorTab.cloudProject) {
        cloudEditRevisionRef.current += 1;
        setCloudProjectDirty(true);
      }
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
            <h1 className="font-display text-xl font-extrabold text-white">{cloudProject ? cloudProject.name : "Code Playground"}</h1>
            <p className="text-xs text-[#7A8199]">{cloudProject ? "Saved to your ibrant account · auto-save enabled" : "Monaco editor · HTML/CSS/JS preview · Python WebAssembly runner"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/build" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] hover:bg-white/10">My Projects</Link>
          {cloudProject && <Link href={`/build/ai?project=${cloudProject.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#7559E8]/30 bg-[#7559E8]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-[#7559E8]/20"><FilePlus2 size={13} /> Add feature with AI</Link>}
          <button type="button" onClick={() => void connectLocalRuntime()} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${localAgentToken ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/[0.03] text-[#B7BDD0] hover:bg-white/10"}`} title={localAgentWorkspace ? `Connected workspace: ${localAgentWorkspace}` : "Connect the terminal to your local computer"}>
            <Terminal size={13} /> {localAgentToken ? `Local runtime${localAgentWorkspace ? ` · ${localAgentWorkspace}` : " connected"}` : "Connect local runtime"}
          </button>
          {cloudProject && (
            <>
              <span className="hidden items-center gap-1 text-[11px] text-[#929CBD] sm:inline-flex">
                {cloudProjectStatus === "saving" ? <Loader2 size={12} className="animate-spin" /> : cloudProjectStatus === "error" ? <X size={12} className="text-[#FF9AA6]" /> : <CheckCircle2 size={12} className="text-[#22C58B]" />}
                {cloudProjectStatus === "saving" ? "Saving" : cloudProjectStatus === "unsaved" ? "Unsaved changes" : cloudProjectStatus === "error" ? "Save failed" : "Saved"}
              </span>
              <button onClick={() => void saveCloudProject()} disabled={cloudProjectStatus === "saving" || !cloudProjectDirty} className="inline-flex items-center gap-1.5 rounded-lg border border-[#7559E8]/30 bg-[#7559E8]/10 px-3 py-2 text-xs font-semibold text-[#C4B5FD] hover:bg-[#7559E8]/20 disabled:opacity-40"><Save size={13} /> Save</button>
              <button onClick={() => void exportCloudProject()} disabled={cloudProjectStatus === "saving"} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] hover:bg-white/10 disabled:opacity-40"><ArrowDownToLine size={13} /> Export ZIP</button>
            </>
          )}
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
          {!cloudProject && <select
            onChange={(e) => applyExample(e.target.value)}
            defaultValue=""
            aria-label="Load an example"
            className="rounded-lg border border-white/10 bg-[#0B0F1D] px-3 py-2 text-xs text-[#B7BDD0] focus:border-[#7559E8] focus:outline-none"
          >
            <option value="" disabled>Examples…</option>
            {EXAMPLES.map((x) => (
              <option key={x.name} value={x.name}>{x.name}</option>
            ))}
          </select>}
          {!isFlutterProject && <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#B7BDD0]">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="accent-[#7559E8]"
            />
            Auto-run
          </label>}
          {!cloudProject && <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-[#B7BDD0] transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={13} /> Reset
          </button>}
          <button
            disabled={pythonRunning || runtimeStarting}
            onClick={() => runRef.current()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#7559E8]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={13} fill="currentColor" /> {runtimeStarting ? "Starting…" : pythonRunning ? "Running…" : runtimePreviewUrl ? "Restart Preview" : "Run Preview"} <span className="hidden opacity-70 sm:inline">Ctrl+↵</span>
          </button>
          {runtimeSessionId && (
            <button type="button" onClick={() => void stopRuntimePreview()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 px-3 py-2 text-xs font-semibold text-[#FF9AA6] hover:bg-[#F05D70]/20">
              Stop Preview
            </button>
          )}
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

      {cloudProjectLoading && <div className="mx-auto mt-4 max-w-[1600px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-[#B7BDD0]"><Loader2 size={14} className="mr-2 inline animate-spin" /> Loading your saved project…</div>}
      {cloudProjectError && <div role="alert" className="mx-auto mt-4 max-w-[1600px] rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/10 px-4 py-3 text-xs text-[#FF9AA6]">{cloudProjectError}</div>}
      {/* workspace */}
      <div className="mx-auto mt-4 flex max-w-[1600px] flex-col gap-4 lg:h-[calc(100vh-11.5rem)] lg:flex-row">
        {(projectRootName || cloudProject) && (
          <aside className="flex max-h-[260px] w-full shrink-0 flex-col overflow-auto rounded-2xl border border-white/5 bg-white/[0.03] lg:max-h-none lg:w-56">
            <div className="sticky top-0 z-10 border-b border-white/5 bg-[#0A0E24] px-3 py-3 text-xs font-semibold text-[#D7DDF3]">
              {cloudProject?.name || projectRootName}
            </div>
            <div className="p-2">
              {cloudProject ? (
                <>
                  <button onClick={addCloudProjectFile} className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-semibold text-[#B7BDD0] hover:border-[#7559E8]/50 hover:text-white"><FilePlus2 size={13} /> New file</button>
                  {buildCloudProjectTree(cloudProjectPaths).map((node) => (
                    <CloudProjectTreeItem key={node.path} node={node} activePath={activeProjectPath} onOpen={openCloudProjectFile} />
                  ))}
                </>
              ) : projectTree.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#7A8199]">This folder is empty.</p>
              ) : projectTree.map((node) => (
                <ProjectTreeItem key={node.path} node={node} activePath={activeProjectPath} onOpen={openProjectFile} />
              ))}
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

            {!cloudProject && <select
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
            </select>}

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
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                  () => {
                    saveProjectFileRef.current();
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
              {runtimePreviewUrl && <a href={runtimePreviewUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#C4B5FD] transition hover:border-[#8B70FF]/50 hover:bg-[#7559E8]/10"><ExternalLink size={12} /> Open in new tab</a>}
            </div>
            {runtimePreviewUrl ? (
              <iframe key={runtimePreviewUrl} title="Running project preview" src={runtimePreviewUrl}
                className="min-h-0 w-full flex-1 bg-[#0B0F1D]" allow="clipboard-read; clipboard-write" />
            ) : isFlutterProject ? (
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#0B0F1D] p-5 sm:p-7">
                <div className="mx-auto max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#8B70FF]/30 bg-[#7559E8]/10 px-3 py-1.5 text-[11px] font-semibold text-[#D6CCFF]">
                    <Terminal size={13} /> Flutter project detected
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">Run this app on an Android device</h3>
                  <p className="mt-2 text-xs leading-5 text-[#AAB3CC]">
                    Connect your local runtime and press Run Preview. ibrant will sync this project, run Flutter Web, and connect the browser preview. This requires Flutter Web support in your local Flutter SDK.
                  </p>
                  <ol className="mt-5 space-y-3 text-xs leading-5 text-[#D7DDF3]">
                    <li><strong>1. Export the project.</strong> Select <strong>Export ZIP</strong> above and extract the archive.</li>
                    <li><strong>2. Open a terminal</strong> in the extracted folder containing <code>pubspec.yaml</code>. Install Flutter and Android Studio first.</li>
                    <li><strong>3. Generate Android runner files</strong> (the current project contains the Dart source but not a complete native runner):</li>
                  </ol>
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#070B16] p-4 text-[11px] leading-6 text-[#C4B5FD]"><code>flutter doctor -v
flutter create --platforms=android .
flutter pub get
flutter devices
flutter run</code></pre>
                  <p className="mt-4 text-xs leading-5 text-[#929CBD]">
                    Keep an Android emulator running in Android Studio, or connect an Android phone with USB debugging enabled. When <code>flutter run</code> launches successfully, the app is running on that device.
                  </p>
                  <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs leading-5 text-emerald-100">
                    This panel is the Flutter run guide, not a claim that the app has already been compiled or tested.
                  </div>
                </div>
              </div>
            ) : isWebPreviewLanguage ? (
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
              <span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${localAgentToken ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                {localAgentToken ? `Local · ${localAgentWorkspace || "saved token"}` : "Runtime disconnected"}
              </span>
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
                placeholder={isFlutterProject || isShellLanguage ? "Shell command · connect local runtime first" : "JavaScript console · type help for commands"}
                aria-label="Terminal input"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-[#D7DDF3] placeholder-[#65708F] outline-none"
              />
            </form>
          </div>
        </section>
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-[1600px] text-center text-[11px] text-[#7A8199]">
        {cloudProject ? "Your project saves automatically to your ibrant account. Export ZIP to keep a local copy or continue it in a desktop editor." : projectRootName ? "Files opened from a local folder are saved back to that folder with Save File or Ctrl+S. They are not uploaded to your ibrant account. HTML, CSS and JavaScript preview in the browser; Python runs through WebAssembly." : "Scratch code saves on this device. Create a saved project in Build to sync files to your ibrant account. HTML, CSS and JavaScript run in a sandboxed browser preview; Python runs through WebAssembly. Other languages require their respective engines or validators."}
      </p>
    </div>
  );
}
