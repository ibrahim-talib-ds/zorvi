"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, Code2, Lightbulb, Play, RotateCcw } from "lucide-react";
import { CodeBlock } from "@/components/courses/CodeBlock";
import { PracticeInPlaygroundButton } from "@/components/courses/PracticeInPlaygroundButton";

type Example = { title?: string; explanation?: string; code?: string; language?: string; expected_output?: string };
type Question = {
  type?: string; prompt?: string; options?: string[]; answer?: string; correct_answer?: string;
  correctAnswer?: string; expected_answer?: string; correct_option?: string; correct_index?: number;
  accepted_answers?: string[]; explanation?: string; hint?: string; points?: number;
};

function normalizeAnswer(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase()
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ")
    .replace(/[.!?;,]+$/g, "").trim();
}

function resolveExpectedOption(question: Question): string | null {
  const options = question.options?.length ? question.options :
    (question.type || "").toLowerCase().replace(/[ -]/g, "_") === "true_false" ? ["True", "False"] : [];
  const raw = question.answer ?? question.correct_answer ?? question.correctAnswer ??
    question.expected_answer ?? question.correct_option ??
    (typeof question.correct_index === "number" ? String(question.correct_index) : "");
  if (raw === "" || raw == null) return null;
  const expected = normalizeAnswer(raw);
  const stripOptionLabel = (value: string) => normalizeAnswer(value).replace(/^(?:option\s*)?[a-z][).:]\s*/, "");
  const direct = options.find(option => normalizeAnswer(option) === expected || stripOptionLabel(option) === expected);
  if (direct) return direct;
  const indexMatch = expected.match(/^(?:option\s*)?([a-z])(?:[).:]|$)$/) || expected.match(/^\d+$/);
  if (indexMatch) {
    const index = /^\d+$/.test(expected) ? Number(expected) : indexMatch[1].toLowerCase().charCodeAt(0) - 97;
    if (Number.isInteger(index) && index >= 0 && index < options.length) return options[index];
  }
  const labelMatch = expected.match(/^(?:option\s*)?([a-z])[).:]\s*(.+)$/);
  if (labelMatch) {
    const index = labelMatch[1].charCodeAt(0) - 97;
    if (options[index] && normalizeAnswer(options[index]) === normalizeAnswer(labelMatch[2])) return options[index];
  }
  return null;
}

function isAnswerCorrect(question: Question, response: string): boolean | null {
  const type = (question.type || "short_answer").toLowerCase().replace(/[ -]/g, "_");
  if (["multiple_choice", "mcq", "true_false"].includes(type)) {
    const expected = resolveExpectedOption(question);
    if (!expected) return null;
    return normalizeAnswer(response) === normalizeAnswer(expected);
  }
  const expectedValues = [question.answer, question.correct_answer, question.correctAnswer,
    question.expected_answer, ...(question.accepted_answers || [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!expectedValues.length) return null;
  const normalize = (value: string) => type === "code"
    ? value.replace(/\r\n/g, "\n").trim().replace(/[ \t]+$/gm, "").replace(/\n+$/g, "")
    : normalizeAnswer(value);
  return expectedValues.some(expected => normalize(response) === normalize(expected));
}

export function PracticalExamples({ examples }: { examples: Example[] }) {
  if (!examples?.length) return null;
  return <section className="my-12 space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#A78BFA]">Learn by doing</p><h2 className="mt-2 text-2xl font-bold text-white">Practical examples</h2><p className="mt-2 text-sm text-[#9299AE]">Work through each example and compare the expected result.</p></div>
    {examples.map((example, index) => <article key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7559E8]/15 text-sm font-bold text-[#B9A8FF]">{index + 1}</span><h3 className="font-semibold text-white">{example.title || `Example ${index + 1}`}</h3></div>
      {example.explanation && <p className="px-5 pt-4 text-sm leading-7 text-[#B7BDD0]">{example.explanation}</p>}
      {example.code && <div className="px-5 py-4 space-y-3"><div className="flex justify-end"><PracticeInPlaygroundButton code={example.code} language={example.language || undefined} lessonTitle={example.title || `Example ${index + 1}`} /></div><CodeBlock code={example.code} language={example.language || undefined} /></div>}
      {example.expected_output && <div className="border-t border-white/10 bg-[#0B1020] px-5 py-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#22C58B]">Expected output</p><pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-[#D6DEEA]">{example.expected_output}</pre></div>}
    </article>)}
  </section>;
}

export function PracticeQuestions({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [checked, setChecked] = useState<Record<number,boolean | null>>({});
  const [checkMessage, setCheckMessage] = useState<Record<number,string>>({});
  const [hints, setHints] = useState<Record<number,boolean>>({});
  const [solutions, setSolutions] = useState<Record<number,boolean>>({});
  if (!questions?.length) return null;
  const check = (q: Question, index: number) => {
    const result = isAnswerCorrect(q, answers[index] || "");
    setChecked(old => ({...old,[index]: result}));
    setCheckMessage(old => ({...old,[index]: result === null
      ? "This question does not have an answer key configured. Please review the suggested answer or ask your instructor."
      : result ? "Correct. Well done." : "Not quite. Check the wording and try again."}));
  };
  const updateAnswer = (index: number, value: string) => {
    setAnswers(old => ({...old,[index]:value}));
    setChecked(old => {
      const next = {...old};
      delete next[index];
      return next;
    });
    setCheckMessage(old => { const next = {...old}; delete next[index]; return next; });
  };
  return <section className="my-12 space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F5A623]">Knowledge check</p><h2 className="mt-2 text-2xl font-bold text-white">Practice questions</h2><p className="mt-2 text-sm text-[#9299AE]">Answer each question independently. You can check your work and review the explanation.</p></div>
    {questions.map((q,index) => {
      const questionType = (q.type || "short_answer").toLowerCase().replace(/[ -]/g, "_");
      const isChoice = ["multiple_choice", "mcq", "true_false"].includes(questionType);
      const choiceOptions = questionType === "true_false" ? ["True", "False"] : q.options || [];
      return <article key={index} className="rounded-2xl border border-white/10 bg-[#111827] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">Question {index+1} · {questionType.replace(/_/g," ")}</span><span className="text-xs text-[#7A8199]">{q.points || 1} point{(q.points || 1) === 1 ? "" : "s"}</span></div>
      <h3 className="font-semibold leading-7 text-white">{q.prompt || "Practice question"}</h3>
      {isChoice ? <div className="mt-4 grid gap-2">{choiceOptions.map(option => <button key={option} onClick={() => updateAnswer(index, option)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${answers[index]===option ? "border-[#8B70FF] bg-[#7559E8]/15 text-white" : "border-white/10 bg-[#0B1020] text-[#B7BDD0] hover:border-white/20"}`}>{option}</button>)}</div> : <textarea value={answers[index] || ""} onChange={e=>updateAnswer(index, e.target.value)} rows={q.type==="code" ? 5 : 3} placeholder={q.type==="code" ? "Write your solution here..." : "Write your answer..."} className="mt-4 w-full rounded-xl border border-white/10 bg-[#0B1020] p-4 font-mono text-sm text-white outline-none focus:border-[#8B70FF]" />}
      {questionType === "code" && <p className="mt-3 text-xs text-[#7A8199]">Code is compared with the suggested answer after whitespace normalization; it is not executed.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>check(q,index)} disabled={!answers[index]?.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15}/> Check answer</button>{q.hint && <button onClick={()=>setHints(old=>({...old,[index]:!old[index]}))} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#B7BDD0]"><Lightbulb size={15}/> {hints[index]?"Hide hint":"Hint"}</button>}{(q.answer || q.correct_answer || q.correctAnswer || q.expected_answer) && <button onClick={()=>setSolutions(old=>({...old,[index]:!old[index]}))} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#B7BDD0]">{solutions[index]?"Hide answer":"Show answer"}</button>}</div>
      {hints[index] && q.hint && <p className="mt-3 rounded-lg bg-[#F5A623]/10 p-3 text-sm text-[#F5C56D]">{q.hint}</p>}
      {Object.prototype.hasOwnProperty.call(checked,index) && <p className={`mt-3 rounded-lg p-3 text-sm ${checked[index] === true ? "bg-[#22C58B]/10 text-[#65DDB0]" : checked[index] === null ? "bg-white/5 text-[#B7BDD0]" : "bg-[#F05D70]/10 text-[#F3A0AA]"}`}>{checkMessage[index] || (checked[index] === true ? "Correct. Well done." : "Not quite. Check your answer and try again.")}</p>}
      {solutions[index] && (q.answer || q.correct_answer || q.correctAnswer || q.expected_answer) && <div className="mt-3 rounded-lg border border-[#22C58B]/20 bg-[#22C58B]/5 p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#65DDB0]">Suggested answer</p><p className="mt-2 whitespace-pre-wrap text-sm text-[#D6DEEA]">{q.answer || q.correct_answer || q.correctAnswer || q.expected_answer}</p>{q.explanation && <p className="mt-2 text-sm leading-6 text-[#AEB9CA]">{q.explanation}</p>}</div>}
    </article>})}
  </section>;
}
