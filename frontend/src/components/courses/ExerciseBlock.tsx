"use client";

import { useState } from "react";
import { Circle, CheckCircle2, Eye, EyeOff, Code2, XCircle, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { PythonRunner } from "./PythonRunner";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";

interface Props {
  exerciseText: string;
  language?: string;
}

interface Question {
  prompt: string;
  solution: string | null;
  type: "code" | "mcq";
  options?: string[];
}

export function ExerciseBlock({ exerciseText, language = "python" }: Props) {
  // Parse questions separated by "--- QUESTION ---"
  const rawQuestions = exerciseText.split("--- QUESTION ---").filter(q => q.trim());
  
  const questions: Question[] = rawQuestions.map(q => {
    const parts = q.split("--- SOLUTION ---");
    const prompt = parts[0].trim();
    const solutionRaw = parts.length > 1 ? parts[1].trim() : null;

    // Detect if this is a Multiple Choice question
    // Rule: If the prompt has lines starting with "A)", "B)", "C)", "D)", it's MCQ
    const hasOptions = /^[A-D]\)/m.test(prompt);

    if (hasOptions && solutionRaw) {
      // Extract options from the prompt
      const lines = prompt.split("\n");
      const options: string[] = [];
      for (const line of lines) {
        if (/^[A-D]\)/.test(line.trim())) {
          options.push(line.trim());
        }
      }
      // The solution is just the correct letter (e.g., "A" or "A) Paris")
      return { prompt, solution: solutionRaw.trim(), type: "mcq", options };
    }

    return { prompt, solution: solutionRaw, type: "code" };
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, "none" | "correct" | "incorrect">>({});
  const [showSolution, setShowSolution] = useState(false);
  const [showRunner, setShowRunner] = useState(false);

  const currentQ = questions[currentIndex];
  const userAnswer = answers[currentIndex] || "";
  const result = results[currentIndex] || "none";

  const handleCheck = () => {
    if (!userAnswer.trim()) return;
    if (!currentQ.solution) {
      setResults({ ...results, [currentIndex]: "correct" });
      return;
    }

    // For MCQ: Compare just the first letter (e.g., "A" from "A) Paris")
    if (currentQ.type === "mcq") {
      const userLetter = userAnswer.trim().charAt(0).toUpperCase();
      const solutionLetter = currentQ.solution.trim().charAt(0).toUpperCase();
      if (userLetter === solutionLetter) {
        setResults({ ...results, [currentIndex]: "correct" });
      } else {
        setResults({ ...results, [currentIndex]: "incorrect" });
      }
      return;
    }

    // For Code: Compare logic (70% match rule)
    const cleanUser = userAnswer.replace(/\s+/g, "");
    const cleanSolution = currentQ.solution.replace(/\s+/g, "");

    if (cleanUser === cleanSolution) {
      setResults({ ...results, [currentIndex]: "correct" });
      return;
    }

    const solutionLines = currentQ.solution.split("\n").filter(l => l.trim().length > 5);
    let matches = 0;
    for (const line of solutionLines) {
      const cleanLine = line.replace(/\s+/g, "");
      if (cleanUser.includes(cleanLine)) matches++;
    }

    if (matches / solutionLines.length >= 0.7) {
      setResults({ ...results, [currentIndex]: "correct" });
    } else {
      setResults({ ...results, [currentIndex]: "incorrect" });
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = userAnswer.substring(0, start) + "  " + userAnswer.substring(end);
      setAnswers({ ...answers, [currentIndex]: newValue });
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
      return;
    }

    const pairs: Record<string, string> = { '"': '"', "'": "'", "(": ")", "{": "}", "[": "]" };
    if (pairs[e.key]) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const selectedText = userAnswer.substring(start, end);
      const newValue = userAnswer.substring(0, start) + e.key + selectedText + pairs[e.key] + userAnswer.substring(end);
      setAnswers({ ...answers, [currentIndex]: newValue });
      setTimeout(() => {
        if (selectedText) target.selectionStart = target.selectionEnd = start + selectedText.length + 2;
        else target.selectionStart = target.selectionEnd = start + 1;
      }, 0);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowSolution(false);
      setShowRunner(false);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowSolution(false);
      setShowRunner(false);
    }
  };

  return (
    <div className="mb-12 rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/5 overflow-hidden not-prose shadow-lg shadow-[#F5A623]/5">
      <div className="bg-[#F5A623]/10 px-6 py-4 border-b border-[#F5A623]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 flex items-center justify-center">
            <Circle size={18} className="text-[#F5A623]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-[#F5A623]">
              Practice Exercise ({currentQ.type === "mcq" ? "Multiple Choice" : "Code"})
            </h2>
            <p className="text-xs text-[#F5A623]/80">Question {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>
        
        {questions.length > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={prevQuestion} disabled={currentIndex === 0} className="p-1 rounded bg-white/5 disabled:opacity-30 hover:bg-white/10 text-white">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextQuestion} disabled={currentIndex === questions.length - 1} className="p-1 rounded bg-white/5 disabled:opacity-30 hover:bg-white/10 text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        <div className="text-[#B7BDD0] whitespace-pre-line leading-relaxed text-base font-medium">
          {currentQ.prompt}
        </div>

        {/* MCQ: Show option buttons */}
        {currentQ.type === "mcq" && currentQ.options && (
          <div className="space-y-2">
            {currentQ.options.map((opt) => {
              const letter = opt.charAt(0);
              const isSelected = userAnswer === letter;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setAnswers({ ...answers, [currentIndex]: letter });
                    setResults({ ...results, [currentIndex]: "none" });
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    isSelected
                      ? "border-[#F5A623] bg-[#F5A623]/10 text-white"
                      : "border-white/10 bg-[#0B0F1D] text-[#B7BDD0] hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Code: Show editor */}
        {currentQ.type === "code" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Code2 size={16} className="text-[#7A8199]" /> Your Code
              </label>
              <span className="text-[10px] font-mono text-[#7A8199]">(Press Tab to indent)</span>
            </div>
            
            <div className="relative rounded-xl border border-white/10 overflow-hidden focus-within:border-[#F5A623]/50 transition-colors bg-[#1E1E1E]">
              <Editor
                value={userAnswer}
                onValueChange={(code) => {
                  setAnswers({ ...answers, [currentIndex]: code });
                  setResults({ ...results, [currentIndex]: "none" });
                }}
                highlight={(code) => Prism.highlight(code, Prism.languages.python, "python")}
                padding={16}
                onKeyDown={handleKeyDown}
                textareaClassName="focus:outline-none"
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  minHeight: '150px',
                  color: '#E8ECF4',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons & Results */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 gap-4">
          <div>
            {result === "correct" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#22C58B] animate-in fade-in">
                <CheckCircle2 size={16} /> Correct! Great job.
              </span>
            )}
            {result === "incorrect" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F05D70] animate-in fade-in">
                <XCircle size={16} /> Not quite. Try again.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentQ.type === "code" && (
              <button
                onClick={() => setShowRunner(!showRunner)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#22C58B]/30 bg-[#22C58B]/10 px-4 py-2.5 text-sm font-semibold text-[#22C58B] hover:bg-[#22C58B]/20 transition flex-1 sm:flex-initial justify-center"
              >
                {showRunner ? "Hide Terminal" : "Run Code"}
              </button>
            )}
            <button
              onClick={handleCheck}
              disabled={!userAnswer.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F5A623] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e09520] transition disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial justify-center"
            >
              Check Answer
            </button>
          </div>
        </div>

        {showRunner && currentQ.type === "code" && (
          <PythonRunner initialCode={userAnswer} />
        )}

        {/* Reveal Solution */}
        {currentQ.solution && (
          <div className="pt-6 border-t border-[#F5A623]/20">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="flex items-center gap-2 text-sm font-semibold text-white hover:text-[#F5A623] transition mb-4"
            >
              {showSolution ? <EyeOff size={16} /> : <Eye size={16} />}
              {showSolution ? "Hide Solution" : "Reveal Solution"}
            </button>

            {showSolution && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-[#F5A623]" />
                  <p className="text-xs font-mono uppercase tracking-wider text-[#7A8199]">Official Solution</p>
                </div>
                {currentQ.type === "code" ? (
                  <CodeBlock code={currentQ.solution} language={language} />
                ) : (
                  <div className="rounded-xl bg-[#22C58B]/10 border border-[#22C58B]/30 p-4">
                    <p className="text-[#22C58B] font-semibold">{currentQ.solution}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
