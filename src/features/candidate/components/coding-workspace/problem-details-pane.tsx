"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Clock,
  Cpu,
  Trophy,
  Eye,
  ShieldCheck,
  Code2,
} from "lucide-react";
import type { CandidateQuestionItem } from "@/features/assessments/actions/attempt-actions";

interface ProblemDetailsPaneProps {
  question: CandidateQuestionItem;
  questionNumber: number;
  totalQuestions: number;
}

export function ProblemDetailsPane({
  question,
  questionNumber,
  totalQuestions,
}: ProblemDetailsPaneProps) {
  const [activeTab, setActiveTab] = useState<"description" | "samples">("description");

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
            Easy
          </span>
        );
      case "HARD":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/50">
            Hard
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50">
            Medium
          </span>
        );
    }
  };

  const memoryMb = Math.round(question.memoryLimitKb / 1024);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B101D] rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Pane Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0E1526] border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("description")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "description"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Problem Description</span>
          </button>

          <button
            onClick={() => setActiveTab("samples")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "samples"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Sample Cases ({question.visibleTestCases.length})</span>
          </button>
        </div>

        <span className="text-[11px] font-medium text-slate-500">
          Problem {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Pane Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title and Metadata Strip */}
        <div className="space-y-3 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {questionNumber}. {question.title}
            </h1>
            <div className="flex items-center gap-2">
              {getDifficultyBadge(question.difficulty)}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950/40 text-purple-300 border border-purple-800/40 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-purple-400" />
                {question.points} pts
              </span>
            </div>
          </div>

          {/* Limits Pill */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              Time Limit: <strong className="text-slate-300">{question.timeLimitMs}ms</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-500" />
              Memory Limit: <strong className="text-slate-300">{memoryMb} MB</strong>
            </span>
          </div>
        </div>

        {activeTab === "description" ? (
          /* Problem Statement */
          <div className="space-y-6">
            <div className="text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
              {question.description}
            </div>

            {/* Embedded Sample Cases Summary */}
            {question.visibleTestCases.length > 0 && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-blue-400" />
                  <span>Examples</span>
                </h3>

                <div className="space-y-3">
                  {question.visibleTestCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="rounded-xl border border-slate-800/80 bg-[#0E1526]/80 p-4 space-y-2.5 text-xs font-mono"
                    >
                      <div className="text-[11px] font-bold text-blue-300 font-sans">
                        Example {idx + 1}:
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans block text-[11px]">Input:</span>
                        <pre className="p-2.5 rounded-lg bg-[#080C14] text-slate-200 border border-slate-800 overflow-x-auto">
                          {tc.input}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-sans block text-[11px]">Expected Output:</span>
                        <pre className="p-2.5 rounded-lg bg-[#080C14] text-emerald-300 border border-slate-800 overflow-x-auto">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                      {tc.explanation && (
                        <div className="text-xs text-slate-400 font-sans pt-1 border-t border-slate-800/60 mt-2">
                          <strong className="text-slate-300">Explanation:</strong> {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sample Cases Detailed View */
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Sample test cases verify that your code adheres to input/output formatting specifications.
            </p>

            <div className="space-y-4">
              {question.visibleTestCases.map((tc, idx) => (
                <div
                  key={tc.id || idx}
                  className="rounded-xl border border-slate-800/80 bg-[#0E1526] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Sample Case #{idx + 1}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Public Example
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 block">Input</label>
                    <pre className="p-3 rounded-lg bg-[#080C14] text-xs font-mono text-slate-200 border border-slate-800/90 overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 block">Expected Output</label>
                    <pre className="p-3 rounded-lg bg-[#080C14] text-xs font-mono text-emerald-300 border border-slate-800/90 overflow-x-auto">
                      {tc.expectedOutput}
                    </pre>
                  </div>

                  {tc.explanation && (
                    <div className="text-xs text-slate-400 bg-[#080C14]/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="font-medium text-slate-300">Explanation: </span>
                      {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security & Anti-Cheating Invariant Notice */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/40 p-4 text-xs text-slate-400 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-200 block text-[11px]">Evaluation Integrity Guard</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your final submission will be evaluated against comprehensive test suites, edge cases, and performance benchmarks. Hidden test cases are not revealed during the active attempt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
