"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCircle2,
  Code2, Database, ExternalLink, Eye, FileCode2, FolderOpen, Loader2,
  MessageSquare, Play, RefreshCw, Server, Sparkles, WandSparkles,
} from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { fetchWithAuth, useAuth } from "@/lib/auth/AuthContext";

type AppType = "auto" | "web" | "mobile" | "full_stack" | "api" | "data_science";
type FrontendChoice = "auto" | "react" | "nextjs" | "flutter" | "html_css_js" | "vue";
type BackendChoice = "auto" | "none" | "python_fastapi" | "node_express" | "django" | "laravel" | "spring_boot";
type DatabaseChoice = "auto" | "none" | "postgresql" | "mysql" | "sqlite" | "mongodb";

interface PlanStep {
  id: string;
  title: string;
  objective: string;
  acceptance_criteria: string[];
}
interface BuildPlan {
  project_name: string;
  summary: string;
  app_type: string;
  stack: { frontend: string; backend: string; database: string; languages: string[]; rationale: string };
  architecture: string[];
  questions: string[];
  steps: PlanStep[];
  limitations: string[];
}
interface GeneratedFile { path: string; content: string }
interface StepResult {
  summary: string;
  files: GeneratedFile[];
  validation_notes: string[];
  user_question: string | null;
  is_final_step: boolean;
}
interface ProjectRead { id: string; name: string; files: GeneratedFile[] }
interface AiStatus {
  configured: boolean;
  service: string;
  mode: string;
}
interface BuildTaskEvent {
  at: string;
  type: string;
  level: string;
  message: string;
  step_index: number;
  details?: { files?: string[]; validation_notes?: string[] };
}
interface BuildTask {
  id: string;
  project_id: string;
  name: string;
  prompt: string;
  plan: BuildPlan;
  status: "queued" | "dispatching" | "running" | "waiting" | "paused" | "completed" | "failed" | "cancelled";
  auto_run: boolean;
  current_step_index: number;
  completed_steps: number[];
  total_steps: number;
  current_step_title: string | null;
  last_error: string | null;
  next_retry_at?: string | null;
  events: BuildTaskEvent[];
  updated_at: string | null;
}
interface SavedBuilderState {
  projectId: string;
  prompt: string;
  plan: BuildPlan;
  stepIndex: number;
  completedSteps: number[];
  extraContext: string;
  nextQuestion: string;
  taskId?: string | null;
  autoBuild?: boolean;
}
const STORAGE_PREFIX = "ibrant-ai-builder:";

function responseError(status: number, raw: string) {
  let detail = raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.detail === "string") detail = parsed.detail;
  } catch { /* The API may return text rather than JSON. */ }
  if (status === 404) {
    return "The API currently running on port 8001 is older than this Build Studio source. It has not loaded the /projects and /ai/build routes yet. Restart the ibrant backend, then refresh this page.";
  }
  return detail || `Request failed (HTTP ${status}).`;
}
async function readJson(response: Response) {
  if (!response.ok) throw new Error(responseError(response.status, await response.text()));
  return response.json();
}

export default function AIBuildPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("project");
  const requestedTaskId = searchParams.get("task");
  const { token } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [appType, setAppType] = useState<AppType>("auto");
  const [frontend, setFrontend] = useState<FrontendChoice>("auto");
  const [backend, setBackend] = useState<BackendChoice>("auto");
  const [database, setDatabase] = useState<DatabaseChoice>("auto");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [autoBuild, setAutoBuild] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<BuildTask | null>(null);
  const [taskAnswer, setTaskAnswer] = useState("");
  const [taskActionBusy, setTaskActionBusy] = useState(false);
  const [featurePrompt, setFeaturePrompt] = useState("");
  const [featurePlanning, setFeaturePlanning] = useState(false);
  const [featurePlan, setFeaturePlan] = useState<BuildPlan | null>(null);
  const [featureBuildPrompt, setFeatureBuildPrompt] = useState("");
  const [featureStarting, setFeatureStarting] = useState(false);
  const [recentTasks, setRecentTasks] = useState<BuildTask[]>([]);
  const [recentTasksLoading, setRecentTasksLoading] = useState(false);
  const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepResult, setStepResult] = useState<StepResult | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [nextQuestion, setNextQuestion] = useState("");
  const [previewRevision, setPreviewRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentStep = useMemo(() => plan?.steps[stepIndex] ?? null, [plan, stepIndex]);
  const hasUnansweredQuestion = Boolean(plan?.questions.some((_, index) => !answers[index]?.trim()));

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void fetchWithAuth(`${API_BASE}/ai/build/status`)
      .then(readJson)
      .then((data: AiStatus) => { if (alive) setStatus(data); })
      .catch((err: unknown) => { if (alive) setStatusError(err instanceof Error ? err.message : "Could not check AI configuration."); });
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const refreshRecentTasks = async () => {
      if (alive) setRecentTasksLoading(true);
      try {
        const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks`);
        const data = await readJson(response) as BuildTask[];
        if (alive) setRecentTasks(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        // Recent tasks are supplemental; the active task panel reports its own errors.
      } finally {
        if (alive) setRecentTasksLoading(false);
      }
    };
    void refreshRecentTasks();
    const timer = window.setInterval(() => { void refreshRecentTasks(); }, 8000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [token]);

  const openRecentTask = async (id: string) => {
    setOpeningTaskId(id);
    setError("");
    try {
      const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks/${id}`);
      const data = await readJson(response) as BuildTask;
      const restored: SavedBuilderState = {
        projectId: data.project_id,
        prompt: data.prompt,
        plan: data.plan,
        stepIndex: data.current_step_index,
        completedSteps: data.completed_steps,
        extraContext: "",
        nextQuestion: "",
        taskId: data.id,
        autoBuild: true,
      };
      sessionStorage.setItem(STORAGE_PREFIX + data.project_id, JSON.stringify(restored));
      setProjectId(data.project_id);
      setPrompt(data.prompt);
      setPlan(data.plan);
      setStepIndex(data.current_step_index);
      setCompletedSteps(data.completed_steps);
      setTaskId(data.id);
      setAutoBuild(true);
      setTask(data);
      router.replace(`/build/ai?project=${data.project_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reopen this build task.");
    } finally {
      setOpeningTaskId(null);
    }
  };

  useEffect(() => {
    if (!requestedProjectId) {
      setHydrated(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + requestedProjectId);
      if (raw) {
        const saved = JSON.parse(raw) as SavedBuilderState;
        setProjectId(saved.projectId);
        setPrompt(saved.prompt);
        setPlan(saved.plan);
        setStepIndex(saved.stepIndex);
        setCompletedSteps(saved.completedSteps ?? []);
        setExtraContext(saved.extraContext ?? "");
        setNextQuestion(saved.nextQuestion ?? "");
        setTaskId(saved.taskId ?? null);
        setAutoBuild(saved.autoBuild ?? Boolean(saved.taskId));
      } else {
        setProjectId(requestedProjectId);
        setError("This project has no saved AI plan in this browser session. Its files are still in your account; open the Playground or start another AI build.");
      }
    } catch {
      setProjectId(requestedProjectId);
      setError("The saved AI build session could not be restored. Your project files remain in your account.");
    }
    setHydrated(true);
  }, [requestedProjectId]);

  useEffect(() => {
    if (!requestedTaskId || !token) return;
    let alive = true;
    const loadTaskFromLink = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks/${requestedTaskId}`);
        const data = await readJson(response) as BuildTask;
        if (!alive) return;
        const restored: SavedBuilderState = {
          projectId: data.project_id,
          prompt: data.prompt,
          plan: data.plan,
          stepIndex: data.current_step_index,
          completedSteps: data.completed_steps,
          extraContext: "",
          nextQuestion: "",
          taskId: data.id,
          autoBuild: true,
        };
        sessionStorage.setItem(STORAGE_PREFIX + data.project_id, JSON.stringify(restored));
        setProjectId(data.project_id);
        setPrompt(data.prompt);
        setPlan(data.plan);
        setStepIndex(data.current_step_index);
        setCompletedSteps(data.completed_steps);
        setTaskId(data.id);
        setAutoBuild(true);
        setTask(data);
        setHydrated(true);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not open this saved AI task.");
      }
    };
    void loadTaskFromLink();
    return () => { alive = false; };
  }, [requestedTaskId, token]);

  useEffect(() => {
    if (!hydrated || !projectId || !plan) return;
    const saved: SavedBuilderState = { projectId, prompt, plan, stepIndex, completedSteps, extraContext, nextQuestion, taskId, autoBuild };
    try { sessionStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(saved)); } catch { /* The server remains the source of truth for project files. */ }
  }, [hydrated, projectId, prompt, plan, stepIndex, completedSteps, extraContext, nextQuestion, taskId, autoBuild]);

  useEffect(() => {
    if (!token || !taskId) return;
    let alive = true;
    const refreshTask = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks/${taskId}`);
        const data = await readJson(response) as BuildTask;
        if (!alive) return;
        setTask((previous) => {
          if (previous?.updated_at !== data.updated_at) {
            setStepIndex(data.current_step_index);
            setCompletedSteps(data.completed_steps);
            setPreviewRevision((revision) => revision + 1);
          }
          return data;
        });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not refresh task progress.");
      }
    };
    void refreshTask();
    const timer = setInterval(() => { void refreshTask(); }, 2500);
    return () => { alive = false; clearInterval(timer); };
  }, [token, taskId]);

  const controlTask = async (action: "pause" | "resume" | "cancel" | "retry") => {
    if (!taskId || !token) return;
    if (action === "cancel" && !window.confirm("Stop this automatic build? Already saved files will remain in your project.")) return;
    setTaskActionBusy(true);
    setError("");
    try {
      const query = action === "resume" && taskAnswer.trim() ? `?answer=${encodeURIComponent(taskAnswer.trim())}` : "";
      const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks/${taskId}/${action}${query}`, { method: "POST" });
      const data = await readJson(response) as BuildTask;
      setTask(data);
      setTaskAnswer("");
      setNotice(action === "pause" ? "Autopilot paused. Your saved files are safe." : action === "resume" ? "Autopilot resumed." : action === "retry" ? "The failed step is being retried." : "Autopilot stopped. Your saved files are safe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this build task.");
    } finally {
      setTaskActionBusy(false);
    }
  };

  const planFeatureExtension = async () => {
    if (!token || !projectId || !plan || featurePrompt.trim().length < 8) return;
    setFeaturePlanning(true);
    setError("");
    setNotice("");
    setFeaturePlan(null);
    try {
      const projectResponse = await fetchWithAuth(`${API_BASE}/projects/${projectId}`);
      const project = await readJson(projectResponse) as ProjectRead;
      const priorityFiles = [...(project.files ?? [])].sort((left, right) => {
        const score = (path: string) => path.toLowerCase() === "lib/main.dart" ? 0
          : path.toLowerCase() === "pubspec.yaml" ? 1
          : path.toLowerCase() === "readme.md" ? 2 : 3;
        return score(left.path) - score(right.path);
      });
      let remainingContext = 6200;
      const fileContext = priorityFiles.map((file) => {
        if (remainingContext <= 0) return `FILE: ${file.path} (content omitted to fit context)`;
        const excerpt = file.content.slice(0, Math.min(file.content.length, remainingContext));
        remainingContext -= excerpt.length;
        const clipped = excerpt.length < file.content.length ? "\n[File excerpt truncated]" : "";
        return `FILE: ${file.path}\n${excerpt}${clipped}`;
      }).join("\n\n");
      const extensionPrompt = [
        "EXTEND THE EXISTING SAVED PROJECT. Do not create a new app or replace the project with a starter template.",
        `Project name: ${project.name}`,
        `Original project goal: ${prompt}`,
        `Existing technology stack: ${JSON.stringify(plan.stack)}`,
        "Keep the existing languages, frameworks, architecture, naming conventions, and working features. Modify existing files where appropriate and add only the files needed for this request.",
        `Existing saved project files and source excerpts:\n${fileContext}`,
        `New feature requested by the project owner: ${featurePrompt.trim()}`,
        "Create an incremental implementation plan only for this new feature. Make each step compatible with the existing saved source files. Do not claim the application was run or tested."
      ].join("\n\n").slice(0, 11900);
      const allowedTypes: AppType[] = ["auto", "web", "mobile", "full_stack", "api", "data_science"];
      const selectedType = allowedTypes.includes(plan.app_type as AppType) ? plan.app_type as AppType : "auto";
      const response = await fetchWithAuth(`${API_BASE}/ai/build/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: extensionPrompt,
          app_type: selectedType,
          preferences: { frontend: "auto", backend: "auto", database: "auto" },
          answers: {},
          previous_plan: plan,
        }),
      });
      const nextPlan = await readJson(response) as BuildPlan;
      setFeatureBuildPrompt(extensionPrompt);
      setFeaturePlan(nextPlan);
      setNotice("The feature plan is ready. Review it before adding the changes to this same project.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not plan this project extension.");
    } finally {
      setFeaturePlanning(false);
    }
  };

  const startFeatureBuild = async () => {
    if (!token || !projectId || !featurePlan || !featureBuildPrompt) return;
    setFeatureStarting(true);
    setError("");
    try {
      const response = await fetchWithAuth(`${API_BASE}/ai/build/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          prompt: featureBuildPrompt,
          plan: featurePlan,
          auto_run: true,
        }),
      });
      const createdTask = await readJson(response) as BuildTask;
      const saved: SavedBuilderState = {
        projectId,
        prompt: featureBuildPrompt,
        plan: featurePlan,
        stepIndex: 0,
        completedSteps: [],
        extraContext: "",
        nextQuestion: "",
        taskId: createdTask.id,
        autoBuild: true,
      };
      sessionStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(saved));
      setPrompt(featureBuildPrompt);
      setPlan(featurePlan);
      setStepIndex(0);
      setCompletedSteps([]);
      setTaskId(createdTask.id);
      setTask(createdTask);
      setAutoBuild(true);
      setFeaturePrompt("");
      setFeaturePlan(null);
      setFeatureBuildPrompt("");
      setNotice("The new feature build has started in your existing project. Earlier saved files are preserved.");
      setRecentTasks((items) => [createdTask, ...items.filter((item) => item.id !== createdTask.id)].slice(0, 8));
      router.replace(`/build/ai?project=${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the feature build.");
    } finally {
      setFeatureStarting(false);
    }
  };

  const generatePlan = useCallback(async (refine = false) => {
    if (!token || prompt.trim().length < 8) return;
    setPlanning(true);
    setError("");
    setNotice("");
    try {
      const answersByQuestion = Object.fromEntries((plan?.questions ?? []).map((question, index) => [`Question ${index + 1}: ${question}`, answers[index] ?? ""]));
      const response = await fetchWithAuth(`${API_BASE}/ai/build/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          app_type: appType,
          preferences: { frontend, backend, database },
          answers: answersByQuestion,
          previous_plan: refine ? plan : null,
        }),
      });
      const data = await readJson(response) as BuildPlan;
      setPlan(data);
      setAnswers(data.questions.map(() => ""));
      setStepIndex(0);
      setStepResult(null);
      setNotice("The proposed architecture is ready. Review the technology choices and answer any open questions before creating files.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a project plan.");
    } finally {
      setPlanning(false);
    }
  }, [token, prompt, appType, frontend, backend, database, plan, answers]);

  const createWorkspace = async () => {
    if (!token || !plan || hasUnansweredQuestion) return;
    setCreating(true);
    setError("");
    try {
      const readme = [
        `# ${plan.project_name}`, "", plan.summary, "",
        "## Agreed technology stack",
        `- Frontend: ${plan.stack.frontend}`,
        `- Backend: ${plan.stack.backend}`,
        `- Database: ${plan.stack.database}`,
        `- Languages: ${plan.stack.languages.join(", ")}`, "",
        "## Architecture notes", plan.stack.rationale, "",
        "Generated step by step with ibrant. Configure credentials outside this workspace.",
      ].join("\n");
      const response = await fetchWithAuth(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: plan.project_name, description: plan.summary, template: "blank", files: [{ path: "README.md", content: readme }] }),
      });
      const project = await readJson(response) as ProjectRead;
      setProjectId(project.id);
      setStepIndex(0);
      setCompletedSteps([]);
      setStepResult(null);
      setExtraContext("");
      setNextQuestion("");
      let createdTask: BuildTask | null = null;
      if (autoBuild) {
        try {
          const taskResponse = await fetchWithAuth(`${API_BASE}/ai/build/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: project.id, prompt, plan, auto_run: true }),
          });
          createdTask = await readJson(taskResponse) as BuildTask;
          setTaskId(createdTask.id);
          setTask(createdTask);
        } catch (taskError) {
          setTaskId(null);
          setTask(null);
          setError(`Your project workspace was created, but automatic build could not start: ${taskError instanceof Error ? taskError.message : "Task service unavailable"}`);
        }
      } else {
        setTaskId(null);
        setTask(null);
      }
      const saved: SavedBuilderState = {
        projectId: project.id, prompt, plan, stepIndex: 0, completedSteps: [],
        extraContext: "", nextQuestion: "", taskId: createdTask?.id ?? null, autoBuild,
      };
      sessionStorage.setItem(STORAGE_PREFIX + project.id, JSON.stringify(saved));
      router.replace(`/build/ai?project=${project.id}`);
      if (createdTask) setNotice("Autopilot started. ibrant will build one safe file batch at a time, save progress, and pause if it needs your decision. You can pause or stop it whenever you like.");
      else if (!autoBuild) setNotice("Workspace created. Use manual mode to generate, review and approve each step.");
      else setNotice("Workspace created. Automatic building did not start; you can still use the manual Playground workflow.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project workspace.");
    } finally {
      setCreating(false);
    }
  };

  const generateStep = async () => {
    if (!token || !projectId || !plan || !currentStep) return;
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchWithAuth(`${API_BASE}/ai/build/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, prompt, plan, step_index: stepIndex, additional_context: extraContext }),
      });
      setStepResult(await readJson(response) as StepResult);
      setNotice("The AI prepared a file batch. Inspect the proposed files, then approve or discard them.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate this build step.");
    } finally {
      setGenerating(false);
    }
  };

  const applyStep = async () => {
    if (!token || !projectId || !stepResult) return;
    setApplying(true);
    setError("");
    try {
      const currentResponse = await fetchWithAuth(`${API_BASE}/projects/${projectId}`);
      const current = await readJson(currentResponse) as ProjectRead;
      const merged = new Map(current.files.map((file) => [file.path, file.content]));
      stepResult.files.forEach((file) => merged.set(file.path, file.content));
      const files = Array.from(merged, ([path, content]) => ({ path, content }));
      if (files.length > 50) throw new Error("This would exceed the 50-file account workspace limit. Ask the AI to split the step.");
      const bytes = files.reduce((total, file) => total + new TextEncoder().encode(file.content).length, 0);
      if (bytes > 2 * 1024 * 1024) throw new Error("This would exceed the 2 MB account workspace limit. Download the ZIP and continue locally.");
      const savedResponse = await fetchWithAuth(`${API_BASE}/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      await readJson(savedResponse);
      setCompletedSteps((items) => items.includes(stepIndex) ? items : [...items, stepIndex]);
      setNextQuestion(stepResult.user_question ?? "");
      setStepResult(null);
      setExtraContext("");
      setStepIndex((index) => index + 1);
      setPreviewRevision((revision) => revision + 1);
      setNotice("Your approved files are saved. The embedded Playground has reloaded the project.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply the generated files.");
    } finally {
      setApplying(false);
    }
  };

  const downloadProject = async () => {
    if (!token || !projectId) return;
    try {
      const response = await fetchWithAuth(`${API_BASE}/projects/${projectId}/download`);
      if (!response.ok) throw new Error(responseError(response.status, await response.text()));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(plan?.project_name || "ibrant-project").replace(/[^a-zA-Z0-9._-]+/g, "-")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the project.");
    }
  };

  if (!hydrated) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#929CBD]"><Loader2 className="mr-2 animate-spin" size={18} /> Restoring your build session…</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/build" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#929CBD] hover:text-white"><ArrowLeft size={14} /> Build Studio</Link>
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#B7A6FF]"><WandSparkles size={18} /></span><div><h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Build with AI</h1><p className="mt-1 text-xs text-[#929CBD]">Describe it once. ibrant can build in the background while you stay in control.</p></div></div>
        </div>
        {projectId && <div className="flex flex-wrap gap-2"><Link href={`/playground?project=${projectId}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"><Code2 size={14} /> Open full Playground</Link><button onClick={() => void downloadProject()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"><ArrowDownToLine size={14} /> Download ZIP</button></div>}
      </div>

      {statusError && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertCircle size={17} className="mt-0.5 shrink-0" /><div><strong>AI Build API not available.</strong><p className="mt-1 text-xs leading-5 text-amber-100/80">{statusError}</p></div></div>}
      {status && !status.configured && <div className="mb-5 flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertCircle size={17} className="mt-0.5 shrink-0" /><div><strong>ibrant AI is not available right now.</strong><p className="mt-1 text-xs leading-5 text-amber-100/80">The build service is temporarily unavailable. Please try again later.</p></div></div>}
      {status?.configured && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-100"><CheckCircle2 size={15} /> ibrant AI is ready. Your project is built and checked by ibrant.</div>}
      {error && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-[#F05D70]/25 bg-[#F05D70]/10 p-4 text-sm text-[#FF9AA6]"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mb-5 flex gap-2 rounded-xl border border-[#7559E8]/25 bg-[#7559E8]/10 p-4 text-sm text-[#D9D1FF]"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}</div>}
      {requestedTaskId && !plan && !error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-[#B7BDD0]"><Loader2 size={14} className="animate-spin text-[#A78BFA]" /> Loading your saved build task and progress…</div>}
      {requestedTaskId && error && <button onClick={() => router.replace("/build/ai")} className="mb-5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5">Start a new AI project</button>}

      {!plan && !requestedProjectId && !requestedTaskId && recentTasks.length > 0 && (
        <section className="mb-6 rounded-2xl border border-white/10 bg-[#12172B] p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">Your saved build activity</p><h2 className="mt-1 font-display text-lg font-bold text-white">Continue a previous project</h2></div><span className="text-[10px] text-[#7A8199]">{recentTasksLoading ? "Refreshing…" : "Saved to your account"}</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            {recentTasks.map((recent) => <div key={recent.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-white">{recent.name}</p><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${recent.status === "failed" ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : recent.status === "completed" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : recent.status === "paused" ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : "border-[#7559E8]/25 bg-[#7559E8]/10 text-[#D5CAFF]"}`}>{recent.status === "waiting" ? "Waiting for capacity" : recent.status}</span></div>
              <p className="mt-2 text-[11px] text-[#929CBD]">{recent.completed_steps.length}/{recent.total_steps} steps saved · {recent.current_step_title || "No active step"}</p>
              {recent.last_error && <p className="mt-2 line-clamp-2 text-[11px] text-rose-200">{recent.last_error}</p>}
              <button onClick={() => void openRecentTask(recent.id)} disabled={openingTaskId === recent.id} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/5 disabled:opacity-50">{openingTaskId === recent.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Open task and progress</button>
            </div>)}
          </div>
        </section>
      )}

      {!plan && !requestedTaskId && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-white/10 bg-[#12172B] p-5 sm:p-7">
            <div className="flex items-center gap-2 text-[#B7A6FF]"><Sparkles size={17} /><span className="text-[11px] font-bold uppercase tracking-[0.16em]">Describe your idea</span></div>
            <h2 className="mt-3 font-display text-xl font-bold text-white">What do you want to build?</h2>
            <p className="mt-2 text-sm leading-6 text-[#929CBD]">Describe who will use it, the problem it solves, and the main actions. The AI recommends the stack and asks important questions before creating files.</p>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} maxLength={12000} placeholder="Example: Build a student attendance platform. Teachers create classes, students join with a code, attendance is saved per lesson, and administrators can export reports. I need a responsive web app with user accounts and a PostgreSQL database." className="mt-5 w-full resize-y rounded-xl border border-white/10 bg-[#0B0F1D] p-4 text-sm leading-6 text-white outline-none placeholder:text-[#69738E] focus:border-[#7559E8]" />
            <div className="mt-2 flex justify-between text-[11px] text-[#7A8199]"><span>Never paste passwords, API keys, or private customer data.</span><span>{prompt.length}/12000</span></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#B7BDD0]">Project type<select value={appType} onChange={(event) => setAppType(event.target.value as AppType)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] px-3 py-3 text-sm text-white outline-none focus:border-[#7559E8]"><option value="auto">Let AI recommend</option><option value="web">Web application</option><option value="mobile">Mobile application</option><option value="full_stack">Full-stack web app</option><option value="api">Backend API</option><option value="data_science">Data science project</option></select></label>
              <label className="text-xs font-semibold text-[#B7BDD0]">Frontend / client<select value={frontend} onChange={(event) => setFrontend(event.target.value as FrontendChoice)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] px-3 py-3 text-sm text-white outline-none focus:border-[#7559E8]"><option value="auto">AI recommends</option><option value="react">React</option><option value="nextjs">Next.js</option><option value="flutter">Flutter / Dart</option><option value="html_css_js">HTML + CSS + JavaScript</option><option value="vue">Vue</option></select></label>
              <label className="text-xs font-semibold text-[#B7BDD0]">Backend<select value={backend} onChange={(event) => setBackend(event.target.value as BackendChoice)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] px-3 py-3 text-sm text-white outline-none focus:border-[#7559E8]"><option value="auto">AI recommends</option><option value="none">No backend</option><option value="python_fastapi">Python + FastAPI</option><option value="django">Python + Django</option><option value="node_express">Node.js + Express</option><option value="laravel">PHP + Laravel</option><option value="spring_boot">Java + Spring Boot</option></select></label>
              <label className="text-xs font-semibold text-[#B7BDD0]">Database<select value={database} onChange={(event) => setDatabase(event.target.value as DatabaseChoice)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] px-3 py-3 text-sm text-white outline-none focus:border-[#7559E8]"><option value="auto">AI recommends</option><option value="none">No database</option><option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option value="sqlite">SQLite</option><option value="mongodb">MongoDB</option></select></label>
            </div>
            <button onClick={() => void generatePlan()} disabled={planning || !status?.configured || prompt.trim().length < 8} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7559E8] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#8B70FF] disabled:cursor-not-allowed disabled:opacity-45">{planning ? <Loader2 size={17} className="animate-spin" /> : <WandSparkles size={17} />}{planning ? "Planning your project…" : "Analyse idea and create a plan"}</button>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-[#A78BFA]"><Server size={17} /><h3 className="font-display font-bold text-white">Real project architecture</h3></div><p className="mt-3 text-xs leading-6 text-[#929CBD]">The plan identifies frontend, backend, database, languages, API boundaries, file structure, and implementation order. Generated backend code is not a running service, and generated schemas are not a connected database.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-[#A78BFA]"><Eye size={17} /><h3 className="font-display font-bold text-white">See the work as it happens</h3></div><p className="mt-3 text-xs leading-6 text-[#929CBD]">Every approved file batch is saved to your project and refreshes the existing Monaco Playground. HTML/CSS/JavaScript has browser preview; server and native runtimes need a desktop development environment.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-[#A78BFA]"><MessageSquare size={17} /><h3 className="font-display font-bold text-white">You stay in control</h3></div><p className="mt-3 text-xs leading-6 text-[#929CBD]">The AI cannot apply a generated batch automatically. Review files, approve or discard them, then choose whether to continue.</p></div>
          </aside>
        </section>
      )}

      {plan && !projectId && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#12172B] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">Proposed architecture</span><h2 className="mt-2 font-display text-2xl font-extrabold text-white">{plan.project_name}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7BDD0]">{plan.summary}</p></div><button onClick={() => setPlan(null)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-[#B7BDD0] hover:bg-white/5">Edit idea</button></div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-4"><div className="flex items-center gap-2 text-[#A78BFA]"><Code2 size={15} /><span className="text-[10px] font-bold uppercase tracking-wide">Frontend</span></div><p className="mt-2 text-sm font-semibold text-white">{plan.stack.frontend}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-4"><div className="flex items-center gap-2 text-[#A78BFA]"><Server size={15} /><span className="text-[10px] font-bold uppercase tracking-wide">Backend</span></div><p className="mt-2 text-sm font-semibold text-white">{plan.stack.backend}</p></div>
              <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-4"><div className="flex items-center gap-2 text-[#A78BFA]"><Database size={15} /><span className="text-[10px] font-bold uppercase tracking-wide">Database</span></div><p className="mt-2 text-sm font-semibold text-white">{plan.stack.database}</p></div>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#929CBD]">{plan.stack.rationale} Languages: {plan.stack.languages.join(", ") || "Not specified"}.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div><h3 className="font-display font-bold text-white">Architecture</h3><ol className="mt-3 space-y-2">{plan.architecture.map((item, index) => <li key={index} className="flex gap-3 text-xs leading-5 text-[#B7BDD0]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7559E8]/20 text-[10px] font-bold text-[#C4B5FD]">{index + 1}</span>{item}</li>)}</ol></div>
              <div><h3 className="font-display font-bold text-white">Implementation steps</h3><ol className="mt-3 space-y-3">{plan.steps.map((item, index) => <li key={item.id} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-xs font-bold text-[#A78BFA]">{index + 1}</span><div><p className="text-xs font-semibold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#929CBD]">{item.objective}</p></div></li>)}</ol></div>
            </div>
            {plan.limitations.length > 0 && <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-xs font-bold text-amber-100">Environment and integration notes</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-100/80">{plan.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
          </div>
          {plan.questions.length > 0 && <div className="rounded-2xl border border-[#7559E8]/30 bg-[#7559E8]/[0.07] p-5"><div className="flex items-center gap-2 text-[#C4B5FD]"><MessageSquare size={17} /><h3 className="font-display font-bold text-white">A few decisions before we begin</h3></div><p className="mt-1 text-xs text-[#929CBD]">Answer these architecture questions, then ask the AI to refine the plan.</p><div className="mt-4 space-y-4">{plan.questions.map((question, index) => <label key={index} className="block text-xs font-semibold text-[#D7D9E7]">{question}<textarea value={answers[index] ?? ""} onChange={(event) => setAnswers((items) => items.map((value, i) => i === index ? event.target.value : value))} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0B0F1D] p-3 text-sm font-normal text-white outline-none focus:border-[#7559E8]" placeholder="Your answer…" /></label>)}</div><button onClick={() => void generatePlan(true)} disabled={planning || hasUnansweredQuestion} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{planning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refine plan using my answers</button></div>}
          <div className="rounded-2xl border border-[#7559E8]/25 bg-[#7559E8]/[0.06] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={autoBuild} onChange={(event) => setAutoBuild(event.target.checked)} className="mt-1 h-4 w-4 accent-[#8B70FF]" />
              <span><span className="block text-sm font-semibold text-white">Auto-build this project for me</span><span className="mt-1 block text-xs leading-5 text-[#929CBD]">Recommended. After you approve this architecture once, ibrant will generate and save the planned code steps automatically. It pauses when it needs your answer, and you can pause or stop it at any time. It never runs generated commands, installs packages, configures payments, or deploys.</span></span>
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-3"><button onClick={() => setPlan(null)} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-[#B7BDD0] hover:bg-white/5">Change requirements</button><button onClick={() => void createWorkspace()} disabled={creating || hasUnansweredQuestion} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-5 py-3 text-xs font-bold text-white hover:bg-[#8B70FF] disabled:opacity-40">{creating ? <Loader2 size={15} className="animate-spin" /> : <FolderOpen size={15} />} {autoBuild ? "Approve plan & start Auto-build" : "Approve plan & create workspace"}</button></div>
        </section>
      )}

      {plan && projectId && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#12172B] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">Guided build</p><h2 className="mt-1 font-display text-xl font-bold text-white">{plan.project_name}</h2><p className="mt-1 text-xs text-[#929CBD]">{completedSteps.length} of {plan.steps.length} steps saved</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[11px] font-semibold text-emerald-200">Saved project</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#8B70FF] transition-all" style={{ width: `${Math.round(completedSteps.length / Math.max(1, plan.steps.length) * 100)}%` }} /></div>
            <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{plan.steps.map((item, index) => { const done = completedSteps.includes(index); const active = stepIndex === index; return <div key={item.id} className={`rounded-xl border p-3 ${done ? "border-emerald-400/20 bg-emerald-400/5" : active ? "border-[#7559E8]/45 bg-[#7559E8]/10" : "border-white/10 bg-white/[0.02]"}`}><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[#929CBD]">STEP {index + 1}</span>{done && <Check size={13} className="text-emerald-300" />}{active && !done && <span className="rounded-full bg-[#7559E8]/30 px-2 py-0.5 text-[9px] font-bold text-[#D6CCFF]">CURRENT</span>}</div><p className="mt-2 text-xs font-semibold text-white">{item.title}</p></div>; })}</div>
          </div>

{taskId ? (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
                <div className="rounded-2xl border border-white/10 bg-[#12172B] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">Automatic build task</p>
                      <h3 className="mt-2 font-display text-xl font-bold text-white">{task?.current_step_title || (task?.status === "completed" ? "Source generation completed" : "Preparing build task")}</h3>
                      <p className="mt-1 text-xs text-[#929CBD]">Task {taskId.slice(0, 8)} · {task?.status || "queued"}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${task?.status === "completed" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : task?.status === "failed" ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : task?.status === "paused" ? "border-amber-400/25 bg-amber-400/10 text-amber-200" : "border-[#7559E8]/25 bg-[#7559E8]/10 text-[#D5CAFF]"}`}>{task?.status === "waiting" ? "Waiting for capacity" : task?.status || "queued"}</span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div><p className="text-3xl font-extrabold tabular-nums text-white">{task?.completed_steps.length ?? completedSteps.length}<span className="text-base font-medium text-[#7A8199]"> / {task?.total_steps ?? plan.steps.length}</span></p><p className="mt-1 text-[11px] text-[#929CBD]">implementation steps saved</p></div>
                    <p className="text-xs font-semibold text-[#B7A6FF]">{Math.round(((task?.completed_steps.length ?? completedSteps.length) / Math.max(1, task?.total_steps ?? plan.steps.length)) * 100)}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#8B70FF] transition-all" style={{ width: `${Math.round(((task?.completed_steps.length ?? completedSteps.length) / Math.max(1, task?.total_steps ?? plan.steps.length)) * 100)}%` }} /></div>
                  {task?.status === "completed" && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100"><strong>Source files are saved; runtime testing is still pending.</strong> Open the Playground for web-previewable projects. For Flutter, export the ZIP and run it on an Android emulator or device using the Flutter SDK.</div>}
                  {task?.status === "waiting" && <div role="status" className="mt-4 rounded-xl border border-[#A78BFA]/25 bg-[#7559E8]/10 p-3 text-xs leading-5 text-[#E3DCFF]"><strong>Waiting for AI capacity.</strong> Your saved steps are safe. ibrant will automatically resume this step when capacity is available.</div>}
                  {task?.last_error && task.status !== "waiting" && <div role="alert" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100"><strong>Build stopped:</strong> {task.last_error}</div>}
                  {task?.status === "paused" && task.events[task.events.length - 1]?.type === "needs_user_input" && task.events.slice(-1).map((event) => <div key={event.at} className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3"><p className="text-xs font-semibold text-amber-100">{event.message}</p><textarea value={taskAnswer} onChange={(inputEvent) => setTaskAnswer(inputEvent.target.value)} rows={2} className="mt-3 w-full rounded-lg border border-white/10 bg-[#0B0F1D] p-3 text-xs text-white outline-none focus:border-[#7559E8]" placeholder="Answer the AI so it can continue…" /><button onClick={() => void controlTask("resume")} disabled={taskActionBusy || !taskAnswer.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{taskActionBusy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Answer & continue</button></div>)}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(task?.status === "queued" || task?.status === "dispatching" || task?.status === "running" || task?.status === "waiting") && <button onClick={() => void controlTask("pause")} disabled={taskActionBusy} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5 disabled:opacity-50">{taskActionBusy ? <Loader2 size={13} className="animate-spin" /> : <span>Ⅱ</span>} Pause build</button>}
                    {task?.status === "paused" && task.events[task.events.length - 1]?.type !== "needs_user_input" && <button onClick={() => void controlTask("resume")} disabled={taskActionBusy} className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{taskActionBusy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Resume build</button>}
                    {task?.status === "failed" && <button onClick={() => void controlTask("retry")} disabled={taskActionBusy} className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{taskActionBusy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Retry failed step</button>}
                    {(task?.status === "queued" || task?.status === "dispatching" || task?.status === "running" || task?.status === "waiting" || task?.status === "paused") && <button onClick={() => void controlTask("cancel")} disabled={taskActionBusy} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/25 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-400/10 disabled:opacity-50">Stop build</button>}
                    <Link href={`/playground?project=${projectId}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5"><Code2 size={13} /> Open editor</Link>
                  </div>
                  {task?.status === "completed" && (
                    <div className="mt-6 rounded-xl border border-[#7559E8]/30 bg-[#7559E8]/[0.07] p-4">
                      <div className="flex items-center gap-2 text-[#C4B5FD]">
                        <WandSparkles size={16} />
                        <h4 className="text-sm font-bold text-white">Add another feature to this project</h4>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#AAB3CC]">
                        Describe the next change in plain language. ibrant will inspect your saved files, plan the feature, and add it to this same project. Your existing code stays in place.
                      </p>
                      <textarea
                        value={featurePrompt}
                        onChange={(event) => setFeaturePrompt(event.target.value)}
                        rows={3}
                        maxLength={6000}
                        placeholder="Example: Add login and registration screens to this Flutter app. Keep the greeting screen and current project structure."
                        className="mt-3 w-full rounded-xl border border-white/10 bg-[#0B0F1D] p-3 text-xs leading-5 text-white outline-none placeholder:text-[#65708B] focus:border-[#7559E8]"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-[#7F8AA5]">The new feature will be saved in this project, not a separate one.</span>
                        <button
                          onClick={() => void planFeatureExtension()}
                          disabled={featurePlanning || featureStarting || featurePrompt.trim().length < 8}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#8B70FF] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {featurePlanning ? <Loader2 size={13} className="animate-spin" /> : <WandSparkles size={13} />}
                          {featurePlanning ? "Planning feature…" : "Plan this feature"}
                        </button>
                      </div>
                      {featurePlan && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-[#0B0F1D] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A78BFA]">Feature plan · {featurePlan.steps.length} steps</p>
                          <h5 className="mt-2 text-sm font-bold text-white">{featurePlan.project_name}</h5>
                          <p className="mt-1 text-xs leading-5 text-[#AAB3CC]">{featurePlan.summary}</p>
                          <ol className="mt-3 space-y-2">
                            {featurePlan.steps.map((item, index) => (
                              <li key={item.id} className="flex gap-2 text-xs leading-5 text-[#D7D9E7]">
                                <span className="font-bold text-[#A78BFA]">{index + 1}.</span>
                                <span><strong>{item.title}:</strong> {item.objective}</span>
                              </li>
                            ))}
                          </ol>
                          {featurePlan.questions.length > 0 && (
                            <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">
                              Before starting, add answers to the AI questions to the feature description above, then choose Plan this feature again.
                              <ul className="mt-2 list-disc space-y-1 pl-4">{featurePlan.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => { setFeaturePlan(null); setFeatureBuildPrompt(""); }}
                              disabled={featureStarting}
                              className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#B7BDD0] hover:bg-white/5 disabled:opacity-50"
                            >
                              Discard plan
                            </button>
                            <button
                              onClick={() => void startFeatureBuild()}
                              disabled={featureStarting || featurePlan.questions.length > 0}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {featureStarting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                              Approve & build in this project
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mt-4 text-[11px] leading-5 text-[#7F8AA5]">Autopilot safely writes project files. It does not execute code, run database migrations, install dependencies, configure payment gateways, or deploy. You can close this page while the backend stays online; task progress is saved on the server. AI validation notes are suggestions, not executed tests.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0B0F1D] p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white"><Activity size={15} className="text-[#A78BFA]" /> Live task timeline</div>
                  <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {task?.events.slice().reverse().map((event, index) => <div key={`${event.at}-${index}`} className="flex gap-3 border-l border-white/10 pl-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.level === "error" ? "bg-rose-400" : event.level === "success" ? "bg-emerald-400" : event.level === "warning" ? "bg-amber-300" : "bg-[#8B70FF]"}`} />
                      <div className="min-w-0"><p className="text-xs leading-5 text-[#D7D9E7]">{event.message}</p><p className="mt-1 text-[10px] text-[#7A8199]">{new Date(event.at).toLocaleString()} · Step {event.step_index + 1}</p>{event.details?.files && <p className="mt-1 break-words text-[10px] text-[#A78BFA]">Files: {event.details.files.join(", ")}</p>}{event.details?.validation_notes?.map((note, noteIndex) => <p key={noteIndex} className="mt-1 text-[10px] leading-4 text-[#929CBD]">{note}</p>)}</div>
                    </div>)}
                    {!task?.events.length && <p className="text-xs text-[#929CBD]">Waiting for the first worker event…</p>}
                  </div>
                  <p className="mt-4 border-t border-white/10 pt-3 text-[10px] text-[#7A8199]">{task?.updated_at ? `Last update: ${new Date(task.updated_at).toLocaleTimeString()}` : "Connecting to the task worker…"}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1D]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><Eye size={15} className="text-[#A78BFA]" /> Live Playground · editor and preview</div><Link href={`/playground?project=${projectId}`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#B7A6FF]">Open separately <ExternalLink size={12} /></Link></div>
                <iframe key={previewRevision} title="ibrant project code editor and live preview" src={`/playground?project=${projectId}&embedded=1`} className="h-[760px] w-full bg-[#0B0F1D]" />
                <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-[#7F8AA5]">The preview refreshes as each source batch is saved. Backend APIs, databases, Flutter emulators and package installation still require their real runtimes.</div>
              </div>
            </div>
          ) : currentStep ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#12172B] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A78BFA]">Implementation step · {stepIndex + 1}/{plan.steps.length}</p>
                  <h3 className="mt-2 font-display text-lg font-bold text-white">{currentStep.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#B7BDD0]">{currentStep.objective}</p>
                  {currentStep.acceptance_criteria.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#929CBD]">Expected result</p><ul className="mt-2 space-y-2">{currentStep.acceptance_criteria.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-[#B7BDD0]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#8B70FF]" />{item}</li>)}</ul></div>}
                  {nextQuestion && <div className="mt-5 rounded-xl border border-[#7559E8]/30 bg-[#7559E8]/10 p-3"><p className="text-xs font-semibold text-white">{nextQuestion}</p><textarea value={extraContext} onChange={(event) => setExtraContext(event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0B0F1D] p-3 text-xs text-white outline-none focus:border-[#7559E8]" placeholder="Answer to guide the next step…" /></div>}
                  {stepIndex > 0 && completedSteps.includes(stepIndex - 1) && !stepResult && <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"><p className="text-xs font-semibold text-emerald-100">Step {stepIndex} is saved. Do you want to continue with step {stepIndex + 1}?</p><p className="mt-1 text-[11px] leading-5 text-emerald-100/70">Nothing happens until you choose to continue.</p></div>}
                  {!stepResult && <button onClick={() => void generateStep()} disabled={generating || (Boolean(nextQuestion) && !extraContext.trim())} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7559E8] px-4 py-3 text-sm font-bold text-white hover:bg-[#8B70FF] disabled:opacity-50">{generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}{generating ? "Generating this step…" : stepIndex > 0 && completedSteps.includes(stepIndex - 1) ? "Yes — continue to next step" : "Generate first step"}</button>}
                  <p className="mt-3 text-[11px] leading-5 text-[#7F8AA5]">You decide when each step begins. The AI proposes files only; nothing is saved until you approve the batch.</p>
                </div>
                {stepResult && <div className="rounded-2xl border border-[#7559E8]/35 bg-[#7559E8]/[0.07] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C4B5FD]">AI implementation proposal</p><p className="mt-2 text-sm leading-6 text-white">{stepResult.summary}</p><p className="mt-4 text-xs font-bold text-[#D6CCFF]">{stepResult.files.length} file(s) created or changed</p><div className="mt-2 space-y-2">{stepResult.files.map((file) => <details key={file.path} className="overflow-hidden rounded-lg border border-white/10 bg-[#0B0F1D]"><summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#D7D9E7]"><FileCode2 size={14} className="text-[#A78BFA]" />{file.path}</summary><pre className="max-h-64 overflow-auto border-t border-white/10 p-3 text-[10px] leading-5 text-[#C9D0E3]"><code>{file.content}</code></pre></details>)}</div>{stepResult.validation_notes.length > 0 && <ul className="mt-4 space-y-1 text-[11px] leading-5 text-[#AAB3CC]">{stepResult.validation_notes.map((item, index) => <li key={index}>• {item}</li>)}</ul>}{stepResult.user_question && <p className="mt-3 rounded-lg border border-white/10 p-3 text-xs text-[#D7D9E7]">{stepResult.user_question}</p>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setStepResult(null)} disabled={applying} className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#B7BDD0] hover:bg-white/5">Discard proposal</button><button onClick={() => void applyStep()} disabled={applying} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve & apply files</button></div></div>}
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F1D]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><Eye size={15} className="text-[#A78BFA]" /> Live Playground · editor and preview</div><Link href={`/playground?project=${projectId}`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#B7A6FF]">Open separately <ExternalLink size={12} /></Link></div>
                <iframe key={previewRevision} title="ibrant project code editor and live preview" src={`/playground?project=${projectId}&embedded=1`} className="h-[760px] w-full bg-[#0B0F1D]" />
                <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-[#7F8AA5]">The preview refreshes after each approved batch. Browser/Python Playground support is available here; backend servers, databases, Flutter builds and package installs are not run by this iframe.</div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#12172B] p-6">
              <div className="flex items-center gap-3"><CheckCircle2 size={23} className="text-emerald-300" /><div><h3 className="font-display text-lg font-bold text-white">All planned steps are approved</h3><p className="mt-1 text-xs text-[#929CBD]">The code is saved. Review it in the Playground or download a ZIP for your local environment.</p></div></div>
              <div className="mt-5 flex flex-wrap gap-3"><Link href={`/playground?project=${projectId}`} className="inline-flex items-center gap-2 rounded-xl bg-[#7559E8] px-4 py-3 text-xs font-bold text-white"><Code2 size={15} /> Open code Playground</Link><button onClick={() => void downloadProject()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-white hover:bg-white/5"><ArrowDownToLine size={15} /> Download project ZIP</button><button onClick={() => router.push("/build")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-white hover:bg-white/5">My Projects <ArrowRight size={14} /></button></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
