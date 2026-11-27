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

type ExerciseConfig = {
  version: 1;
  type: "written" | "code" | "multiple_choice" | "true_false" | "short_answer";
  title: string;
  instructions: string;
  language?: string;
  hint?: string;
  options?: string[];
  expected_answer?: string;
  min_words?: number;
  max_words?: number;
};
const PREFIX = "IBRANT_EXERCISE_V1:";
const defaultConfig: ExerciseConfig = { version: 1, type: "written", title: "Practice exercise", instructions: "", min_words: 150, max_words: 200 };

export function encodeExercise(config: ExerciseConfig) {
  return PREFIX + JSON.stringify(config);
}
export function parseExercise(value: string | null): ExerciseConfig | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return { ...defaultConfig, instructions: value };
  try { return { ...defaultConfig, ...JSON.parse(value.slice(PREFIX.length)) }; } catch { return { ...defaultConfig, instructions: value }; }
}

const languages: Record<string, string> = {
  html: "markup", css: "css", javascript: "javascript", typescript: "typescript",
  python: "python", sql: "sql", json: "javascript", text: "plain",
};

export function ExerciseBlock({ exerciseText, language = "python", lessonId }: { exerciseText: string; language?: string; lessonId?: string }) {
  const config = useMemo(() => parseExercise(exerciseText) || defaultConfig, [exerciseText]);
  const storageKey = `ibrant-exercise:${lessonId || "lesson"}`;
  const [answer, setAnswer] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isChoice = config.type === "multiple_choice" || config.type === "true_false";

  useEffect(() => {
    try { setAnswer(localStorage.getItem(storageKey) || ""); } catch { /* storage may be unavailable */ }
  }, [storageKey]);

  const updateAnswer = (value: string) => {
    setAnswer(value);
    setSubmitted(false);
    try { localStorage.setItem(storageKey, value); } catch { /* keep in memory */ }
  };

  const submit = () => {
    if (!answer.trim()) return;
    setSubmitted(true);
    try { localStorage.setItem(`${storageKey}:submitted`, JSON.stringify({ answer, submittedAt: new Date().toISOString() })); } catch { /* keep in memory */ }
  };

  const prismLanguage = languages[config.language || language] || "plain";
  const canRunHtml = config.type === "code" && (config.language || language) === "html";

  return (
    <section className="not-prose my-12 overflow-hidden rounded-2xl border border-[#7559E8]/35 bg-[#111827] shadow-xl shadow-[#7559E8]/5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#7559E8]/20 via-[#7559E8]/5 to-[#F5A623]/10 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7559E8]/20 text-[#C4B5FD]">
            {config.type === "code" ? <Code2 size={20}/> : config.type === "written" ? <FileText size={20}/> : config.type === "multiple_choice" || config.type === "true_false" ? <ListChecks size={20}/> : <CircleHelp size={20}/>}
          </span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#B9A8FF]">Your practice workspace</p><h2 className="text-lg font-bold text-white">{config.title || "Practice exercise"}</h2></div>
        </div>
        <span className="rounded-full border border-[#F5A623]/25 bg-[#F5A623]/10 px-3 py-1 text-xs font-semibold capitalize text-[#F5C56D]">{config.type.replace("_", " ")}</span>
      </header>
      <div className="space-y-5 p-5 sm:p-7">
        <div className="whitespace-pre-wrap text-sm leading-7 text-[#D2D8E5]">{config.instructions || "Complete the task below and submit your response."}</div>

        {config.type === "written" && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-semibold text-white">Your response</label><span className={`text-xs tabular-nums ${config.max_words && words > config.max_words ? "text-[#F3A0AA]" : "text-[#9299AE]"}`}>{words} words{config.min_words || config.max_words ? ` · target ${config.min_words || 0}–${config.max_words || "∞"}` : ""}</span></div>
          <textarea value={answer} onChange={e => updateAnswer(e.target.value)} rows={10} placeholder="Start writing your response here..." className="w-full resize-y rounded-xl border border-white/10 bg-[#0B1020] p-4 text-sm leading-7 text-white outline-none transition focus:border-[#8B70FF] focus:ring-2 focus:ring-[#7559E8]/20"/>
          {config.min_words && words < config.min_words && <p className="text-xs text-[#9299AE]">Add {config.min_words - words} more words to reach the suggested minimum.</p>}
        </>}

        {config.type === "code" && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-semibold text-white">Write your code</label><select aria-label="Code language" value={config.language || language} disabled className="rounded-lg border border-white/10 bg-[#0B1020] px-3 py-2 text-xs text-[#B7BDD0]"><option>{(config.language || language).toUpperCase()}</option></select></div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1E1E1E] focus-within:border-[#8B70FF]"><Editor value={answer} onValueChange={updateAnswer} highlight={code => Prism.highlight(code, Prism.languages[prismLanguage] || Prism.languages.plain, prismLanguage)} padding={16} textareaClassName="focus:outline-none" style={{fontFamily:'"Fira Code",monospace',fontSize:14,minHeight:220,color:"#E8ECF4",background:"transparent"}}/></div>
          {canRunHtml && <button type="button" onClick={() => setPreviewOpen(v => !v)} className="rounded-lg border border-[#7559E8]/40 px-4 py-2 text-sm font-semibold text-[#C4B5FD]">{previewOpen ? "Hide preview" : "Preview HTML"}</button>}
          {canRunHtml && previewOpen && <iframe title="HTML exercise preview" sandbox="" srcDoc={answer} className="h-64 w-full rounded-xl border border-white/10 bg-white"/>}
          <p className="text-xs text-[#9299AE]">Your code is saved as a local draft on this device. HTML can be previewed here; other languages are provided as an editor unless a supported runner is available.</p>
        </>}

        {isChoice && <div className="grid gap-3">{(config.type === "true_false" ? ["True", "False"] : config.options || []).map((option, index) => <button type="button" key={option} onClick={() => updateAnswer(option)} className={`rounded-xl border p-4 text-left text-sm transition ${answer === option ? "border-[#8B70FF] bg-[#7559E8]/15 text-white" : "border-white/10 bg-[#0B1020] text-[#C4CBD8] hover:border-white/25"}`}><span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-[#A78BFA]">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}

        {config.type === "short_answer" && <textarea value={answer} onChange={e => updateAnswer(e.target.value)} rows={4} placeholder="Type your answer..." className="w-full rounded-xl border border-white/10 bg-[#0B1020] p-4 text-sm text-white outline-none focus:border-[#8B70FF]"/>}

        {config.hint && <div><button type="button" onClick={() => setHintOpen(v => !v)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5C56D]"><Lightbulb size={16}/>{hintOpen ? "Hide hint" : "Need a hint?"}</button>{hintOpen && <p className="mt-3 rounded-xl border border-[#F5A623]/20 bg-[#F5A623]/10 p-4 text-sm leading-6 text-[#F5D58E]">{config.hint}</p>}</div>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-xs text-[#9299AE]">Your draft is saved on this device as you work.</p>
          <button type="button" onClick={submit} disabled={!answer.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7559E8]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Save size={16}/> Save response</button>
        </div>
        {submitted && <div className="flex items-center gap-2 rounded-xl border border-[#22C58B]/25 bg-[#22C58B]/10 p-4 text-sm text-[#75E0B8]"><CheckCircle2 size={18}/> Response saved on this device. Your instructor cannot see this response yet.</div>}
        {submitted && config.expected_answer && <details className="rounded-xl border border-white/10 bg-white/[.03] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#C4B5FD]">View suggested answer</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B7BDD0]">{config.expected_answer}</p></details>}
      </div>
    </section>
  );
}
