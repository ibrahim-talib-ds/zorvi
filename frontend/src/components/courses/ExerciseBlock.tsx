"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lightbulb, Code2, FileText, ListChecks, CircleHelp, Save } from "lucide-react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism-tomorrow.css";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";
import { LegacyExerciseBlock } from "./LegacyExerciseBlock";
import { PracticeInPlaygroundButton } from "./PracticeInPlaygroundButton";

type ExerciseConfig = {
  version: 1;
  type: "written" | "code" | "multiple_choice" | "true_false" | "short_answer";
  title: string;
  instructions: string;
  language?: string;
  hint?: string;
  starter_code?: string;
  options?: string[];
  expected_answer?: string;
  min_words?: number;
  max_words?: number;
};
const PREFIX = "IBRANT_EXERCISE_V1:";
const defaultConfig: ExerciseConfig = { version: 1, type: "written", title: "Practice exercise", instructions: "", min_words: 150, max_words: 200 };

function starterForLanguage(language: string): string {
  if (language === "html") return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Profile</title>
</head>
<body>
  <h1>Your Name</h1>
  <p>Write a short introduction about yourself.</p>
  <h2>My interests</h2>
  <ul>
    <li>Interest one</li>
    <li>Interest two</li>
    <li>Interest three</li>
  </ul>
  <a href="https://example.com">A website I like</a>
  <button>Contact Me</button>
</body>
</html>`;
  if (language === "javascript") return 'console.log("Hello from ibrant!");';
  if (language === "python") return 'print("Hello from ibrant!")';
  return "";
}


function ExerciseInstructions({ text, title }: { text: string; title: string }) {
  const lines = text.replace(/\\([*`])/g, "$1").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  const inline = (value: string) => value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-black/25 px-1 py-0.5 font-mono text-xs text-[#F5C56D]">{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
  const normalizedTitle = title.trim().toLowerCase();
  for (let i = 0; i < lines.length;) {
    const value = lines[i].trim();
    if (!value) { i++; continue; }
    const heading = value.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      i++;
      if (heading[1].trim().toLowerCase() === normalizedTitle) continue;
      nodes.push(<h3 key={nodes.length} className="text-sm font-bold text-white">{inline(heading[1])}</h3>);
      continue;
    }
    const bullet = value.match(/^[-*]\s+(.+)$/);
    const ordered = value.match(/^\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const match = lines[i].trim().match(isOrdered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(<li key={items.length}>{inline(match[1])}</li>);
        i++;
      }
      nodes.push(isOrdered
        ? <ol key={nodes.length} className="list-decimal space-y-1.5 pl-5 marker:text-[#A78BFA]">{items}</ol>
        : <ul key={nodes.length} className="list-disc space-y-1.5 pl-5 marker:text-[#F5C56D]">{items}</ul>);
      continue;
    }
    nodes.push(<p key={nodes.length}>{inline(value)}</p>);
    i++;
  }
  return <div className="space-y-3 text-sm leading-6 text-[#D2D8E5]">{nodes}</div>;
}

export function encodeExercise(config: ExerciseConfig) {
  return PREFIX + JSON.stringify(config);
}
export function parseExercise(value: string | null): ExerciseConfig | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return { ...defaultConfig, instructions: value };
  const payload = value.slice(PREFIX.length).trim();
  const attempts = [
    payload,
    payload.replace(/\\+([*<>`~])/g, "$1"),
    payload.replace(/\\(?!["\\/bfnrtu])/g, "").replace(/\\+([*<>`~])/g, "$1"),
  ];
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && typeof parsed.instructions === "string") {
        return { ...defaultConfig, ...parsed };
      }
    } catch { /* try the next safe normalization */ }
  }
  // Malformed legacy serialization must never leak into the lesson as raw JSON.
  return {
    ...defaultConfig,
    title: "Practice exercise",
    instructions: "This saved exercise uses an older format and needs to be reopened and saved by the instructor.",
  };
}

const languages: Record<string, string> = {
  html: "markup", css: "css", javascript: "javascript", typescript: "typescript",
  python: "python", sql: "sql", json: "javascript", text: "plain",
};

function StructuredExerciseBlock({ exerciseText, language = "python", lessonId, courseSlug }: { exerciseText: string; language?: string; lessonId?: string; courseSlug?: string }) {
  const { token } = useAuth();
  const config = useMemo(() => parseExercise(exerciseText) || defaultConfig, [exerciseText]);
  // Older lessons sometimes saved an HTML-building prompt as a written activity.
  // Recognize an explicit request to write HTML and present the proper code workspace.
  const inferredHtmlCode = config.type === "written" && /write\s+(?:your\s+)?html\s+code|html\s+code\s+(?:in|below)|create\s+(?:a|your)\s+(?:simple\s+)?html\s+(?:page|profile)|build\s+(?:a|your)\s+(?:simple\s+)?html\s+(?:page|profile)/i.test(config.instructions);
  const isCodeTask = config.type === "code" || inferredHtmlCode;
  const exerciseLanguage = (config.language || (inferredHtmlCode ? "html" : language)).trim().toLowerCase();
  const starterCode = config.starter_code?.trim() || starterForLanguage(exerciseLanguage);
  const storageKey = `ibrant-exercise:${token ? token.slice(-16) : "guest"}:${lessonId || "lesson"}`;
  const [answer, setAnswer] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState("Loading your saved work…");
  const [saving, setSaving] = useState(false);
  const [reviewInfo, setReviewInfo] = useState<{grade:number|null;feedback:string|null}|null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isChoice = config.type === "multiple_choice" || config.type === "true_false";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const savedAnswer = localStorage.getItem(storageKey) || "";
        const usableSavedAnswer = inferredHtmlCode && savedAnswer.trim() && !/<[a-z][\s\S]*>/i.test(savedAnswer) ? "" : savedAnswer;
        setAnswer(usableSavedAnswer || (isCodeTask ? starterCode : ""));
      } catch { if (isCodeTask) setAnswer(starterCode); }
      if (!token || !courseSlug || !lessonId) { setSubmissionStatus("Sign in and enrol in this course to submit work to your instructor."); return; }
      try {
        const response = await fetch(`${API_BASE}/courses/${courseSlug}/lessons/${lessonId}/exercise-submission`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (response.status === 403) { setSubmissionStatus("Enrol in this course to submit your work for instructor review."); return; }
        if (!response.ok) throw new Error("Could not load your saved submission.");
        const data = await response.json();
        if (!cancelled && data) {
          const serverAnswer = data.answer || "";
          const usableServerAnswer = inferredHtmlCode && serverAnswer.trim() && !/<[a-z][\s\S]*>/i.test(serverAnswer) ? "" : serverAnswer;
          setAnswer(usableServerAnswer || (isCodeTask ? starterCode : ""));
          setSubmitted(data.status === "submitted" || data.status === "reviewed");
      setReviewInfo(data.feedback || data.grade != null ? { grade: data.grade, feedback: data.feedback } : null);
          setSubmissionStatus(data.status === "reviewed" ? `Reviewed${data.grade != null ? ` · ${data.grade}/100` : ""}` : data.status === "submitted" ? "Submitted · awaiting instructor review" : data.feedback ? "Returned for revision · update your work and submit again" : "Draft saved to your account");
          try { localStorage.setItem(storageKey, data.answer || ""); } catch { /* optional local backup */ }
        } else if (!cancelled) setSubmissionStatus("Your work will be saved to your account.");
      } catch { if (!cancelled) setSubmissionStatus("Online submission is temporarily unavailable. Your local draft is still available."); }
    };
    void load();
    return () => { cancelled = true; };
  }, [storageKey, token, courseSlug, lessonId, isCodeTask, starterCode, inferredHtmlCode]);

  const updateAnswer = (value: string) => {
    setAnswer(value);
    setSubmitted(false);
    setSubmissionStatus("You have unsaved changes. Save a draft or submit your updated response.");
    try { localStorage.setItem(storageKey, value); } catch { /* keep in memory */ }
  };

  const saveToServer = async (action: "save" | "submit") => {
    if (!answer.trim() || !token || !courseSlug || !lessonId) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseSlug}/lessons/${lessonId}/exercise-submission`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ answer, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Your response could not be saved.");
      setSubmitted(data.status === "submitted" || data.status === "reviewed");
      setReviewInfo(data.feedback || data.grade != null ? { grade: data.grade, feedback: data.feedback } : null);
      setSubmissionStatus(action === "submit" ? "Submitted successfully · your instructor can now review your work." : "Draft saved securely to your account.");
    } catch (error) { setSubmissionStatus(error instanceof Error ? error.message : "Could not save your work."); }
    finally { setSaving(false); }
  };

  const prismLanguage = languages[exerciseLanguage] || "plain";
  const canRunHtml = isCodeTask && exerciseLanguage === "html";

  return (
    <section className="not-prose my-12 overflow-hidden rounded-2xl border border-[#7559E8]/35 bg-[#111827] shadow-xl shadow-[#7559E8]/5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#7559E8]/20 via-[#7559E8]/5 to-[#F5A623]/10 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/20 text-[#C4B5FD]">
            {isCodeTask ? <Code2 size={20}/> : config.type === "written" ? <FileText size={20}/> : config.type === "multiple_choice" || config.type === "true_false" ? <ListChecks size={20}/> : <CircleHelp size={20}/>}
          </span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#B9A8FF]">Your practice workspace</p><h2 className="text-lg font-bold text-white">{config.title || "Practice exercise"}</h2></div>
        </div>
        <span className="rounded-full border border-[#F5A623]/25 bg-[#F5A623]/10 px-3 py-1 text-xs font-semibold capitalize text-[#F5C56D]">{isCodeTask ? `${exerciseLanguage} code task` : config.type.replace("_", " ")}</span>
      </header>
      <div className="space-y-5 p-5 sm:p-7">
        <ExerciseInstructions text={config.instructions || "Complete the task below and submit your response."} title={config.title || "Practice exercise"} />

        {config.type === "written" && !isCodeTask && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-semibold text-white">Your response</label><span className={`text-xs tabular-nums ${config.max_words && words > config.max_words ? "text-[#F3A0AA]" : "text-[#9299AE]"}`}>{words} words{config.min_words || config.max_words ? ` · target ${config.min_words || 0}–${config.max_words || "∞"}` : ""}</span></div>
          <textarea value={answer} onChange={e => updateAnswer(e.target.value)} rows={10} placeholder="Start writing your response here..." className="w-full resize-y rounded-xl border border-white/10 bg-[#0B1020] p-4 text-sm leading-7 text-white outline-none transition focus:border-[#8B70FF] focus:ring-2 focus:ring-[#7559E8]/20"/>
          {config.min_words && words < config.min_words && <p className="text-xs text-[#9299AE]">Add {config.min_words - words} more words to reach the suggested minimum.</p>}
        </>}

        {isCodeTask && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-semibold text-white">Write your code</label><select aria-label="Code language" value={exerciseLanguage} disabled className="rounded-lg border border-white/10 bg-[#0B1020] px-3 py-2 text-xs text-[#B7BDD0]"><option>{exerciseLanguage.toUpperCase()}</option></select></div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E1E1E] focus-within:border-[#8B70FF]"><Editor value={answer} onValueChange={updateAnswer} highlight={code => Prism.highlight(code, Prism.languages[prismLanguage] || Prism.languages.plaintext || {}, prismLanguage)} padding={16} textareaClassName="focus:outline-none" style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',fontSize:15.5,fontWeight:500,lineHeight:1.7,letterSpacing:"0.01em",minHeight:220,color:"#E8ECF4",background:"transparent",WebkitFontSmoothing:"auto",fontVariantLigatures:"none"}}/></div>
          <div className="flex flex-wrap items-center gap-2">
            <PracticeInPlaygroundButton code={answer.trim() || starterCode} language={exerciseLanguage} lessonTitle={config.title || "Lesson exercise"} />
            {canRunHtml && <button type="button" onClick={() => setPreviewOpen(v => !v)} className="rounded-lg border border-[#7559E8]/40 px-4 py-2 text-sm font-semibold text-[#C4B5FD]">{previewOpen ? "Hide preview" : "Show live preview"}</button>}
          </div>
          {canRunHtml && previewOpen && <div className="overflow-hidden rounded-xl border border-white/10 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400"/><span className="h-2.5 w-2.5 rounded-full bg-amber-400"/><span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/><span className="ml-2 text-xs font-medium text-slate-500">Live webpage preview</span></div><iframe title="HTML exercise preview" sandbox="" srcDoc={answer || starterCode} className="h-72 w-full bg-white"/></div>}
          <p className="text-xs text-[#9299AE]">Your code is kept as a local draft while editing. Open it in Playground to continue building and run supported code. HTML can also be previewed here.</p>
        </>}

        {isChoice && <div className="grid gap-3">{(config.type === "true_false" ? ["True", "False"] : config.options || []).map((option, index) => <button type="button" key={option} onClick={() => updateAnswer(option)} className={`rounded-xl border p-4 text-left text-sm transition ${answer === option ? "border-[#8B70FF] bg-[#7559E8]/15 text-white" : "border-white/10 bg-[#0B1020] text-[#C4CBD8] hover:border-white/25"}`}><span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-[#A78BFA]">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}

        {config.type === "short_answer" && <textarea value={answer} onChange={e => updateAnswer(e.target.value)} rows={4} placeholder="Type your answer..." className="w-full rounded-xl border border-white/10 bg-[#0B1020] p-4 text-sm text-white outline-none focus:border-[#8B70FF]"/>}

        {config.hint && <div><button type="button" onClick={() => setHintOpen(v => !v)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5C56D]"><Lightbulb size={16}/>{hintOpen ? "Hide hint" : "Need a hint?"}</button>{hintOpen && <p className="mt-3 rounded-xl border border-[#F5A623]/20 bg-[#F5A623]/10 p-4 text-sm leading-6 text-[#F5D58E]">{config.hint}</p>}</div>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="max-w-md text-xs text-[#9299AE]">{submissionStatus}</p>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void saveToServer("save")} disabled={!answer.trim() || saving || !token} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-[#D7DDF3] hover:bg-white/5 disabled:opacity-40"><Save size={15}/> {saving ? "Saving…" : "Save draft"}</button><button type="button" onClick={() => void saveToServer("submit")} disabled={!answer.trim() || saving || !token || !courseSlug || submitted} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7559E8]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={16}/> Submit for review</button></div>
        </div>
        {submitted && <div className="flex items-center gap-2 rounded-xl border border-[#22C58B]/25 bg-[#22C58B]/10 p-4 text-sm text-[#75E0B8]"><CheckCircle2 size={18}/> Your work has been submitted to ibrant Academy. You can see instructor feedback here after it is reviewed.</div>}
        {reviewInfo && <div className="space-y-2 rounded-xl border border-[#22C58B]/25 bg-[#22C58B]/[.07] p-4"><p className="text-sm font-bold text-[#75E0B8]">Instructor feedback{reviewInfo.grade != null ? ` · ${reviewInfo.grade}/100` : ""}</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#D4E8DF]">{reviewInfo.feedback || "Your instructor has reviewed this submission."}</p></div>}
      </div>
    </section>
  );
}


type ExerciseBlockProps = { exerciseText: string; language?: string; lessonId?: string; courseSlug?: string };

export function ExerciseBlock(props: ExerciseBlockProps) {
  const text = props.exerciseText || "";
  if (!text.startsWith(PREFIX) && (text.includes("--- QUESTION ---") || text.includes("--- SOLUTION ---"))) {
    return <LegacyExerciseBlock exerciseText={text} language={props.language || "python"} />;
  }
  return <StructuredExerciseBlock {...props} />;
}
