"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertCircle, ArrowDownUp, Clock3, Loader2,
  Pause, RefreshCw, Search, ShieldAlert, Square, WandSparkles,
} from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";

type TaskStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
interface TaskEvent {
  at: string;
  type: string;
  level: string;
  message: string;
  step_index: number;
  details?: { files?: string[]; validation_notes?: string[] };
}
interface BuildTask {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  prompt: string;
  status: TaskStatus;
  current_step_index: number;
  completed_steps: number[];
  total_steps: number;
  current_step_title: string | null;
  last_error: string | null;
  events: TaskEvent[];
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  project_name: string;
  user_name: string | null;
  user_email: string | null;
}

const STATUSES: { id: "all" | TaskStatus; label: string }[] = [
  { id: "all", label: "All tasks" },
  { id: "running", label: "Running" },
  { id: "queued", label: "Queued" },
  { id: "paused", label: "Paused" },
  { id: "failed", label: "Failed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Stopped" },
];

function statusStyle(status: TaskStatus) {
  switch (status) {
    case "running": return "border-sky-400/25 bg-sky-400/10 text-sky-200";
    case "queued": return "border-violet-400/25 bg-violet-400/10 text-violet-200";
    case "paused": return "border-amber-400/25 bg-amber-400/10 text-amber-200";
    case "completed": return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
    case "failed": return "border-rose-400/25 bg-rose-400/10 text-rose-200";
    case "cancelled": return "border-white/10 bg-white/5 text-[#AAB3CC]";
  }
}

function prettyTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function AdminBuildTasksPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<BuildTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [search, setSearch] = useState("");
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const loadTasks = useCallback(async (quiet = false) => {
    if (!token) return;
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status_filter=${filter}`;
      const response = await fetchWithAuth(`${API_BASE}/ai/build/admin/tasks${query}`);
      if (!response.ok) {
        const body = await response.text();
        let detail = body;
        try { const data = JSON.parse(body); if (typeof data.detail === "string") detail = data.detail; } catch { /* plain response */ }
        throw new Error(detail || `Request failed (${response.status})`);
      }
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load AI Build tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (authLoading || !token) return;
    void loadTasks();
    const timer = window.setInterval(() => { void loadTasks(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [authLoading, token, loadTasks]);

  const controlTask = async (task: BuildTask, action: "pause" | "cancel" | "retry") => {
    if (!token) return;
    if (action === "cancel" && !window.confirm(`Stop the AI build for “${task.name}”? Files already saved will remain in the user's project.`)) return;
    setBusyTask(task.id);
    setError("");
    try {
      const response = await fetchWithAuth(`${API_BASE}/ai/build/admin/tasks/${task.id}/${action}`, { method: "POST" });
      if (!response.ok) {
        const body = await response.text();
        let detail = body;
        try { const data = JSON.parse(body); if (typeof data.detail === "string") detail = data.detail; } catch { /* plain response */ }
        throw new Error(detail || `Request failed (${response.status})`);
      }
      await loadTasks(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} this task.`);
    } finally {
      setBusyTask(null);
    }
  };

  const activeCount = tasks.filter((task) => task.status === "queued" || task.status === "running").length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;
  const filtered = tasks.filter((task) => {
    const haystack = [task.name, task.project_name, task.user_name, task.user_email, task.last_error].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (authLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-[#A78BFA]" size={28} /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#A78BFA]"><Activity size={18} /><span className="text-[11px] font-bold uppercase tracking-[0.17em]">System operations</span></div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white">AI Build Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#929CBD]">Monitor automatic project builds, see which files and steps are being generated, identify failures, and pause or stop a task when necessary.</p>
        </div>
        <button onClick={() => void loadTasks(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.07] disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#7A8199]">Tasks shown</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-white">{tasks.length}</p></div>
        <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-sky-200/70">Queued or running</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-sky-100">{activeCount}</p></div>
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-rose-200/70">Failed tasks</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-rose-100">{failedCount}</p></div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full flex-wrap gap-2">
          {STATUSES.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${filter === item.id ? "border-[#7559E8]/50 bg-[#7559E8]/15 text-[#D5CAFF]" : "border-white/10 bg-white/[0.02] text-[#929CBD] hover:bg-white/[0.05]"}`}>{item.label}</button>)}
        </div>
        <label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find user or project" className="w-60 max-w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-[#7559E8]" /></label>
      </div>

      <div className="mt-5 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
            <WandSparkles size={28} className="mx-auto text-[#7A8199]" />
            <h2 className="mt-3 font-display font-bold text-white">No build tasks found</h2>
            <p className="mt-1 text-xs text-[#929CBD]">New automatic project builds will appear here as users start them.</p>
          </div>
        ) : filtered.map((task) => {
          const progress = Math.round((task.completed_steps.length / Math.max(1, task.total_steps)) * 100);
          const isExpanded = expandedTask === task.id;
          return (
            <article key={task.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-display text-lg font-bold text-white">{task.name}</h2><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${statusStyle(task.status)}`}>{task.status}</span></div>
                    <p className="mt-1 text-xs text-[#929CBD]">{task.user_name || "IBRANT user"} · {task.user_email || task.user_id} · {task.project_name}</p>
                    <p className="mt-2 line-clamp-2 max-w-4xl text-xs leading-5 text-[#B7BDD0]">{task.prompt}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/5">{isExpanded ? "Hide timeline" : "View timeline"} <ArrowDownUp size={13} /></button>
                    {(task.status === "queued" || task.status === "running") && <button onClick={() => void controlTask(task, "pause")} disabled={busyTask === task.id} className="inline-flex items-center gap-2 rounded-lg border border-amber-400/25 px-3 py-2 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/10 disabled:opacity-50"><Pause size={13} /> Pause</button>}
                    {(task.status === "queued" || task.status === "running" || task.status === "paused") && <button onClick={() => void controlTask(task, "cancel")} disabled={busyTask === task.id} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/25 px-3 py-2 text-[11px] font-semibold text-rose-100 hover:bg-rose-400/10 disabled:opacity-50"><Square size={12} /> Stop</button>}
                    {task.status === "failed" && <button onClick={() => void controlTask(task, "retry")} disabled={busyTask === task.id} className="inline-flex items-center gap-2 rounded-lg border border-[#7559E8]/35 bg-[#7559E8]/10 px-3 py-2 text-[11px] font-semibold text-[#D5CAFF] hover:bg-[#7559E8]/20 disabled:opacity-50"><RefreshCw size={12} /> Retry</button>}
                    <span className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-[10px] text-[#929CBD]">Project {task.project_id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div><div className="mb-2 flex items-center justify-between text-[10px]"><span className="text-[#929CBD]">{task.current_step_title || (task.status === "completed" ? "All steps complete" : task.status === "failed" ? "Task failed" : "Waiting for next step")}</span><span className="font-semibold tabular-nums text-[#D7D9E7]">{task.completed_steps.length}/{task.total_steps} steps · {progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#8B70FF]" style={{ width: `${progress}%` }} /></div></div>
                  <div className="text-[10px] text-[#7A8199]">Updated {prettyTime(task.updated_at)}</div>
                </div>
                {task.last_error && <div className="mt-4 flex gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100"><ShieldAlert size={15} className="mt-0.5 shrink-0" /><div><strong>Failure details</strong><p className="mt-1">{task.last_error}</p></div></div>}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[#7A8199]"><span className="inline-flex items-center gap-1"><Clock3 size={12} /> Started {prettyTime(task.started_at)}</span><span>Created {prettyTime(task.created_at)}</span><span>Task ID {task.id.slice(0, 8)}</span></div>
              </div>
              {isExpanded && <div className="border-t border-white/10 bg-black/10 p-5"><h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-white"><Activity size={14} className="text-[#A78BFA]" /> Task events ({task.events.length})</h3><div className="space-y-3">{task.events.slice().reverse().map((event, index) => <div key={`${event.at}-${index}`} className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.level === "error" ? "bg-rose-400" : event.level === "success" ? "bg-emerald-400" : event.level === "warning" ? "bg-amber-300" : "bg-[#8B70FF]"}`} /><div className="min-w-0"><p className="text-xs leading-5 text-[#D7D9E7]">{event.message}</p><p className="mt-1 text-[10px] text-[#7A8199]">{prettyTime(event.at)} · Step {event.step_index + 1}</p>{event.details?.files && <p className="mt-1 break-words text-[10px] text-[#A78BFA]">Files: {event.details.files.join(", ")}</p>}{event.details?.validation_notes?.map((note, i) => <p key={i} className="mt-1 text-[10px] text-[#929CBD]">{note}</p>)}</div></div>)}</div><p className="mt-5 text-[10px] text-[#7A8199]">Project files remain private to the owner. This admin view exposes task status, the approved request, events and error details.</p></div>}
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-[10px] leading-5 text-[#6F7892]">Task information is stored in the IBRANT database. Failure and user-input alerts are written to in-app notifications. Validation notes come from the AI and are not proof of executed tests. Task workers are currently process-local; a stopped backend process interrupts active work until it is restarted and the task is resumed.</p>
    </div>
  );
}
