"use client";

import React from "react";
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateQuestionItem } from "@/features/assessments/actions/attempt-actions";

interface QuestionSummary {
  question: CandidateQuestionItem;
  hasCode: boolean;
  lineCount: number;
  language: string;
}

interface SubmissionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  questions: CandidateQuestionItem[];
  codeByQuestion: Record<string, string>;
  languageByQuestion: Record<string, string>;
}

export function SubmissionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  questions,
  codeByQuestion,
  languageByQuestion,
}: SubmissionConfirmationModalProps) {
  if (!isOpen) return null;

  const summaries: QuestionSummary[] = questions.map((q) => {
    const code = codeByQuestion[q.id]?.trim() || "";
    const starterCode = q.starterCode?.python || q.starterCode?.typescript || "";
    const isUnmodifiedStarter = code === starterCode.trim();
    const hasCode = code.length > 0 && !isUnmodifiedStarter;
    const lineCount = code ? code.split("\n").length : 0;
    const language = languageByQuestion[q.id] || "python";

    return {
      question: q,
      hasCode,
      lineCount,
      language,
    };
  });

  const answeredCount = summaries.filter((s) => s.hasCode).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B101D] text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-[#0E1526]/90 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Submit Technical Assessment
              </h2>
              <p className="text-xs text-slate-400">
                Review your solutions before final confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Warning Banner if Unanswered Problems Exist */}
          {unansweredCount > 0 ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">
                  {unansweredCount} {unansweredCount === 1 ? "question has" : "questions have"} no solution entered
                </strong>
                <span className="text-[11px] text-amber-300/80 leading-relaxed">
                  You can still submit, but unanswered questions will receive 0 points.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>All {questions.length} problems have draft solutions recorded.</span>
            </div>
          )}

          {/* Solution Breakdown List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Solution Summary ({answeredCount}/{questions.length} Completed)
            </span>

            <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/60 divide-y divide-slate-800/60 overflow-hidden">
              {summaries.map((s, idx) => (
                <div key={s.question.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {s.hasCode ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      </div>
                    )}
                    <span className="font-medium text-slate-200 truncate">
                      {idx + 1}. {s.question.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.hasCode ? (
                      <span className="text-[11px] text-slate-400">
                        {s.lineCount} lines • <strong className="text-slate-300 uppercase">{s.language}</strong>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400 font-medium">Unanswered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ground Rule Notice */}
          <div className="rounded-xl border border-slate-800 bg-[#080C14] p-3.5 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              Once confirmed, your assessment attempt will be locked into final submitted state. You will not be able to resume or edit code further.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#0E1526]/90 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs"
          >
            Return to Coding
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finalizing Submission...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Confirm & Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
