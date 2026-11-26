"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, Code2, Lightbulb, Play, RotateCcw } from "lucide-react";
import { CodeBlock } from "@/components/courses/CodeBlock";
import { PracticeInPlaygroundButton } from "@/components/courses/PracticeInPlaygroundButton";

type Example = { title?: string; explanation?: string; code?: string; language?: string; expected_output?: string };
type Question = { type?: string; prompt?: string; options?: string[]; answer?: string; explanation?: string; hint?: string; points?: number };

export function PracticalExamples({ examples }: { examples: Example[] }) {
  if (!examples?.length) return null;
  return <section className="my-12 space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#A78BFA]">Learn by doing</p><h2 className="mt-2 text-2xl font-bold text-white">Practical examples</h2><p className="mt-2 text-sm text-[#9299AE]">Work through each example and compare the expected result.</p></div>
    {examples.map((example, index) => <article key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7559E8]/15 text-sm font-bold text-[#B9A8FF]">{index + 1}</span><h3 className="font-semibold text-white">{example.title || `Example ${index + 1}`}</h3></div>
      {example.explanation && <p className="px-5 pt-4 text-sm leading-7 text-[#B7BDD0]">{example.explanation}</p>}
      {example.code && <div className="px-5 py-4 space-y-3"><div className="flex justify-end"><PracticeInPlaygroundButton code={example.code} language={example.language || "sql"} lessonTitle={example.title || `Example ${index + 1}`} /></div><CodeBlock code={example.code} language={example.language || "sql"} /></div>}
      {example.expected_output && <div className="border-t border-white/10 bg-[#0B1020] px-5 py-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#22C58B]">Expected output</p><pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-[#D6DEEA]">{example.expected_output}</pre></div>}
    </article>)}
  </section>;
}

export function PracticeQuestions({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [checked, setChecked] = useState<Record<number,boolean>>({});
  const [hints, setHints] = useState<Record<number,boolean>>({});
  const [solutions, setSolutions] = useState<Record<number,boolean>>({});
  if (!questions?.length) return null;
  const check = (q: Question, index: number) => {
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
    const expected = normalize(q.answer || "");
    const actual = normalize(answers[index] || "");
    const correct = q.type === "code"
      ? actual === expected
      : actual.toLowerCase() === expected.toLowerCase();
    setChecked(old => ({...old,[index]: !!expected && correct}));
  };
  const updateAnswer = (index: number, value: string) => {
    setAnswers(old => ({...old,[index]:value}));
    setChecked(old => {
      const next = {...old};
      delete next[index];
      return next;
    });
  };
  return <section className="my-12 space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F5A623]">Knowledge check</p><h2 className="mt-2 text-2xl font-bold text-white">Practice questions</h2><p className="mt-2 text-sm text-[#9299AE]">Answer each question independently. You can check your work and review the explanation.</p></div>
    {questions.map((q,index) => <article key={index} className="rounded-2xl border border-white/10 bg-[#111827] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">Question {index+1} · {(q.type || "short_answer").replace("_"," ")}</span><span className="text-xs text-[#7A8199]">{q.points || 1} point{(q.points || 1) === 1 ? "" : "s"}</span></div>
      <h3 className="font-semibold leading-7 text-white">{q.prompt || "Practice question"}</h3>
      {(q.type === "multiple_choice" || q.type === "mcq" || q.type === "true_false") ? <div className="mt-4 grid gap-2">{(q.type === "true_false" ? ["True","False"] : q.options || []).map(option => <button key={option} onClick={() => updateAnswer(index, option)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${answers[index]===option ? "border-[#8B70FF] bg-[#7559E8]/15 text-white" : "border-white/10 bg-[#0B1020] text-[#B7BDD0] hover:border-white/20"}`}>{option}</button>)}</div> : <textarea value={answers[index] || ""} onChange={e=>updateAnswer(index, e.target.value)} rows={q.type==="code" ? 5 : 3} placeholder={q.type==="code" ? "Write your solution here..." : "Write your answer..."} className="mt-4 w-full rounded-xl border border-white/10 bg-[#0B1020] p-4 font-mono text-sm text-white outline-none focus:border-[#8B70FF]" />}
      {q.type === "code" && <p className="mt-3 text-xs text-[#7A8199]">Code is compared with the suggested answer after whitespace normalization; it is not executed.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>check(q,index)} disabled={!answers[index]?.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircle2 size={15}/> Check answer</button>{q.hint && <button onClick={()=>setHints(old=>({...old,[index]:!old[index]}))} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#B7BDD0]"><Lightbulb size={15}/> {hints[index]?"Hide hint":"Hint"}</button>}{q.answer && <button onClick={()=>setSolutions(old=>({...old,[index]:!old[index]}))} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#B7BDD0]">{solutions[index]?"Hide answer":"Show answer"}</button>}</div>
      {hints[index] && q.hint && <p className="mt-3 rounded-lg bg-[#F5A623]/10 p-3 text-sm text-[#F5C56D]">{q.hint}</p>}
      {checked[index] !== undefined && Object.prototype.hasOwnProperty.call(checked,index) && <p className={`mt-3 rounded-lg p-3 text-sm ${checked[index]?"bg-[#22C58B]/10 text-[#65DDB0]":"bg-[#F05D70]/10 text-[#F3A0AA]"}`}>{checked[index]?"Correct. Well done.":"Not quite. Review your answer and try again."}</p>}
      {solutions[index] && q.answer && <div className="mt-3 rounded-lg border border-[#22C58B]/20 bg-[#22C58B]/5 p-3"><p className="text-xs font-bold uppercase tracking-wider text-[#65DDB0]">Suggested answer</p><p className="mt-2 whitespace-pre-wrap text-sm text-[#D6DEEA]">{q.answer}</p>{q.explanation && <p className="mt-2 text-sm leading-6 text-[#AEB9CA]">{q.explanation}</p>}</div>}
    </article>)}
  </section>;
}
